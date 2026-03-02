import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Dashboard Stats
  app.get(api.dashboard.stats.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // Scans - Analyze Domain/Email
  app.post(api.scans.analyze.path, async (req, res) => {
    try {
      const input = api.scans.analyze.input.parse(req.body);
      
      // Log the action
      await storage.createAuditLog({
        action: `Analyze ${input.type}`,
        user: "system",
        details: `Target: ${input.target}`
      });

      // Simulate an analysis taking place
      setTimeout(async () => {
        await storage.createAlert({
          title: `Analysis Complete: ${input.target}`,
          description: `Finished scanning ${input.target} across threat intelligence sources.`,
          severity: "Low",
          isRead: false
        });
      }, 5000);

      res.json({ success: true, message: "Analysis initiated." });
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

  // Deception
  app.get(api.deception.list.path, async (req, res) => {
    const assets = await storage.getDeceptionAssets();
    res.json(assets);
  });

  app.post(api.deception.create.path, async (req, res) => {
    try {
      const input = api.deception.create.input.parse(req.body);
      const asset = await storage.createDeceptionAsset(input);
      
      await storage.createAuditLog({
        action: "Create Deception Asset",
        details: `Type: ${asset.assetType}, URL: ${asset.url}`
      });

      res.status(201).json(asset);
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
      assetType: "Canarytoken - MS Word Document",
      url: "http://canarytokens.com/fake-doc-1",
      triggered: false
    });
    await storage.createDeceptionAsset({
      assetType: "AWS API Key",
      url: "AKIAIOSFODNN7EXAMPLE",
      triggered: true,
      lastTriggeredAt: new Date()
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
