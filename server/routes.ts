import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { analyzeDomain } from "./osint/pipeline";
import { simulateAttacks } from "./osint/attack-simulator";
import { generatePlaybook } from "./osint/playbook-generator";
import { deployHoneytoken, processWebhookTrigger, runCorrelation, generateHoneyPersona, getDeceptionStats } from "./deception/engine";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Dashboard Stats
  app.get(api.dashboard.stats.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // Scans - Analyze Domain/Email (Real OSINT Pipeline)
  app.post(api.scans.analyze.path, async (req, res) => {
    try {
      const input = api.scans.analyze.input.parse(req.body);

      if (input.target.length > 253) {
        return res.status(400).json({ message: "Target exceeds maximum length", field: "target" });
      }

      if (input.type === "domain") {
        const result = await analyzeDomain(input.target);
        return res.json({
          success: true,
          message: `Analysis complete. Exposure level: ${result.exposure_level}. Score: ${result.exposure_score}.`,
          data: result,
        });
      }

      await storage.createAuditLog({
        action: `Analyze ${input.type}`,
        user: "SYSTEM",
        details: `Target: ${input.target}`,
      });

      res.json({ success: true, message: "Analysis initiated for email target." });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message, field: "target" });
      }
      throw err;
    }
  });

  // Alerts
  app.get(api.alerts.list.path, async (req, res) => {
    const alerts = await storage.getAlerts();
    res.json(alerts);
  });

  app.patch(api.alerts.markRead.path, async (req, res) => {
    try {
      const alert = await storage.markAlertRead(Number(req.params.id));
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(alert);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Threats
  app.get(api.threats.breaches.path, async (req, res) => {
    const breaches = await storage.getBreachRecords();
    res.json(breaches);
  });

  app.get(api.threats.infrastructure.path, async (req, res) => {
    const infra = await storage.getInfraExposure();
    res.json(infra);
  });

  app.get(api.threats.github.path, async (req, res) => {
    const github = await storage.getGithubExposure();
    res.json(github);
  });

  app.get(api.threats.attackScenarios.path, async (req, res) => {
    const scenarios = await storage.getAttackScenarios();
    res.json(scenarios);
  });

  app.post(api.threats.simulateAttack.path, async (req, res) => {
    try {
      const input = api.threats.simulateAttack.input.parse(req.body);
      const analysisResult = await analyzeDomain(input.domain);
      const simulation = analysisResult.attack_simulation;
      const playbook = analysisResult.playbook;

      if (!simulation) {
        return res.json({
          attack_scenarios: [],
          highest_risk_scenario: null,
          overall_risk_score: 0,
          overall_risk_level: "LOW",
          risk_explanation: "No attack simulation data available.",
          playbook: null,
        });
      }

      res.json({
        ...simulation,
        playbook,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message, field: "domain" });
      }
      throw err;
    }
  });

  // Deception
  app.get(api.deception.list.path, async (req, res) => {
    const assets = await storage.getDeceptionAssets();
    res.json(assets);
  });

  app.post(api.deception.deploy.path, async (req, res) => {
    try {
      const input = api.deception.deploy.input.parse(req.body);
      const asset = await deployHoneytoken(input.tokenType, input.placementLocation);
      res.status(201).json(asset);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }
  });

  app.delete('/api/deception/:id', async (req, res) => {
    try {
      await storage.deleteDeceptionAsset(Number(req.params.id));
      await storage.createAuditLog({
        action: "Deception Asset Decommissioned",
        user: "OPERATOR",
        details: `Asset ID ${req.params.id} removed from grid`,
      });
      res.json({ success: true });
    } catch (err) {
      res.status(404).json({ message: "Asset not found" });
    }
  });

  app.post(api.deception.simulateTrigger.path, async (req, res) => {
    try {
      const input = api.deception.simulateTrigger.input.parse(req.body);
      const result = await processWebhookTrigger({
        tokenId: input.tokenId,
        sourceIp: input.sourceIp || `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: "Mozilla/5.0 (Recon Scanner)",
        geoLocation: "Unknown — Simulated Trigger",
      });
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }
  });

  app.post('/webhook/canary', async (req, res) => {
    try {
      const tokenId = req.body?.token_id || req.body?.tokenId;
      if (!tokenId) {
        return res.status(400).json({ message: "Missing token_id" });
      }
      const sourceIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers['user-agent'] || "unknown";

      await processWebhookTrigger({
        tokenId,
        sourceIp,
        userAgent,
        geoLocation: req.body?.geo || "Unknown",
      });

      res.json({ status: "received" });
    } catch (err) {
      if (err instanceof Error) {
        console.error("[Webhook] Canary error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.get(api.deception.correlation.path, async (req, res) => {
    const result = await runCorrelation();
    res.json(result);
  });

  app.get(api.deception.stats.path, async (req, res) => {
    const assets = await storage.getDeceptionAssets();
    const personas = await storage.getHoneyPersonas();
    res.json(getDeceptionStats(assets, personas));
  });

  app.get(api.deception.personas.list.path, async (req, res) => {
    const personas = await storage.getHoneyPersonas();
    res.json(personas);
  });

  app.post(api.deception.personas.create.path, async (req, res) => {
    try {
      const input = api.deception.personas.create.input.parse(req.body);
      const persona = await generateHoneyPersona(input.deploymentContext);
      res.status(201).json(persona);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.patch('/api/deception/personas/:id/retire', async (req, res) => {
    try {
      const persona = await storage.retireHoneyPersona(Number(req.params.id));
      if (!persona) return res.status(404).json({ message: "Persona not found" });
      await storage.createAuditLog({
        action: "Honey Persona Retired",
        user: "OPERATOR",
        details: `Persona "${persona.name}" retired`,
      });
      res.json(persona);
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  // Deepfake
  app.get(api.deepfake.list.path, async (req, res) => {
    const scans = await storage.getDeepfakeScans();
    res.json(scans);
  });

  app.post(api.deepfake.scan.path, async (req, res) => {
    try {
      const input = api.deepfake.scan.input.parse(req.body);
      const scan = await storage.createDeepfakeScan({
        mediaUrl: input.mediaUrl,
        status: "pending"
      });

      await storage.createAuditLog({
        action: "Initiate Deepfake Scan",
        details: `Media: ${input.mediaUrl}`
      });

      res.status(201).json(scan);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Risk
  app.get(api.risk.scores.path, async (req, res) => {
    const scores = await storage.getRiskScores();
    res.json(scores);
  });

  // Audit
  app.get(api.audit.list.path, async (req, res) => {
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  // Seed Data function
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingAlerts = await storage.getAlerts();
  if (existingAlerts.length === 0) {
    console.log("Seeding database with military-grade intel...");
    
    // Alerts
    await storage.createAlert({
      title: "Suspicious Login Attempt",
      description: "Multiple failed logins from TOR exit node targeting command interface.",
      severity: "High",
      isRead: false
    });
    await storage.createAlert({
      title: "New CVE Published",
      description: "CVE-2024-XXXX affects edge router firmware. Patch recommended.",
      severity: "Critical",
      isRead: false
    });
    
    // Deception Assets
    await storage.createDeceptionAsset({
      tokenId: "NEM-SEED001",
      assetType: "ms_word",
      placementLocation: "Internal Shared Drive",
      status: "ACTIVE",
      url: "NEMESIS_Intel_Report_Seed.docx",
      triggered: false,
      severityLevel: "HIGH",
      triggerCount: 0,
    });
    await storage.createDeceptionAsset({
      tokenId: "NEM-SEED002",
      assetType: "aws_key",
      placementLocation: "Cloud Config File (S3/GCS)",
      status: "TRIGGERED",
      url: "AKIA1234567890EXAMPLE",
      triggered: true,
      lastTriggeredAt: new Date(),
      sourceIp: "198.51.100.42",
      geoLocation: "Eastern Europe",
      userAgent: "Python-urllib/3.9",
      severityLevel: "CRITICAL",
      triggerCount: 3,
    });

    // Deepfake scans
    await storage.createDeepfakeScan({
      mediaUrl: "https://example.com/suspicious_video.mp4",
      status: "completed",
      isDeepfake: true,
      confidenceScore: 92
    });
    await storage.createDeepfakeScan({
      mediaUrl: "https://example.com/press_release_audio.wav",
      status: "completed",
      isDeepfake: false,
      confidenceScore: 14
    });

    // Audit logs
    await storage.createAuditLog({
      action: "System Initialization",
      user: "SYSTEM_ADMIN",
      details: "NEMESIS Core booted and connected to intelligence feeds."
    });
    await storage.createAuditLog({
      action: "Threat Feed Sync",
      user: "SYSTEM",
      details: "Successfully synced with HaveIBeenPwned and Shodan APIs."
    });
  }
}
