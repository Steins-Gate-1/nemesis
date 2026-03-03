import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { analyzeDomain } from "./osint/pipeline";
import { simulateAttacks } from "./osint/attack-simulator";
import { generatePlaybook } from "./osint/playbook-generator";
import { deployHoneytoken, processWebhookTrigger, runCorrelation, generateHoneyPersona, getDeceptionStats } from "./deception/engine";
import { processDeepfakeScan, calculateExposureScore, generateMitigationGuidanceDeterministic, getDeepfakeStats } from "./deepfake/engine";
import { checkAndEscalateAlerts, isValidTransition } from "./alerts/engine";
import { generateIncidentReport } from "./reports/generator";
import { correlate } from "./correlation/engine";

const startTime = Date.now();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.dashboard.stats.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

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
        actionType: "SCAN",
        actorType: "SYSTEM",
        user: "OSINT_ENGINE",
        targetEntity: input.target,
        details: `Target: ${input.target}`,
      });
      res.json({ success: true, message: "Analysis initiated for email target." });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message, field: "target" });
      }
      throw err;
    }
  });

  app.get(api.alerts.list.path, async (req, res) => {
    const alertsList = await storage.getAlerts();
    res.json(alertsList);
  });

  app.get(api.alerts.active.path, async (req, res) => {
    const active = await storage.getActiveAlerts();
    res.json(active);
  });

  app.patch(api.alerts.markRead.path, async (req, res) => {
    try {
      const alert = await storage.markAlertRead(Number(req.params.id));
      if (!alert) return res.status(404).json({ message: "Alert not found" });
      res.json(alert);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.alerts.updateStatus.path, async (req, res) => {
    try {
      const input = api.alerts.updateStatus.input.parse(req.body);
      const existing = (await storage.getAlerts()).find(a => a.id === Number(req.params.id));
      if (!existing) return res.status(404).json({ message: "Alert not found" });
      if (!isValidTransition(existing.status || "OPEN", input.status)) {
        return res.status(400).json({ message: `Invalid transition from ${existing.status} to ${input.status}` });
      }
      const updated = await storage.updateAlertStatus(Number(req.params.id), input.status);
      await storage.createAuditLog({
        action: `Alert Status Updated: ${input.status}`,
        actionType: "STATUS_CHANGE",
        actorType: "ANALYST",
        user: "OPERATOR",
        targetEntity: "ALERT",
        referenceId: String(req.params.id),
        details: `Alert "${existing.title}" status changed from ${existing.status} to ${input.status}`,
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.get(api.threats.breaches.path, async (req, res) => {
    res.json(await storage.getBreachRecords());
  });

  app.get(api.threats.infrastructure.path, async (req, res) => {
    res.json(await storage.getInfraExposure());
  });

  app.get(api.threats.github.path, async (req, res) => {
    res.json(await storage.getGithubExposure());
  });

  app.get(api.threats.attackScenarios.path, async (req, res) => {
    res.json(await storage.getAttackScenarios());
  });

  app.post(api.threats.simulateAttack.path, async (req, res) => {
    try {
      const input = api.threats.simulateAttack.input.parse(req.body);
      const analysisResult = await analyzeDomain(input.domain);
      const simulation = analysisResult.attack_simulation;
      const playbook = analysisResult.playbook;
      if (!simulation) {
        return res.json({
          attack_scenarios: [], highest_risk_scenario: null,
          overall_risk_score: 0, overall_risk_level: "LOW",
          risk_explanation: "No attack simulation data available.", playbook: null,
        });
      }
      res.json({ ...simulation, playbook });
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

  app.get(api.deception.list.path, async (req, res) => {
    res.json(await storage.getDeceptionAssets());
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
      if (err instanceof Error) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.delete('/api/deception/:id', async (req, res) => {
    try {
      await storage.deleteDeceptionAsset(Number(req.params.id));
      await storage.createAuditLog({
        action: "Deception Asset Decommissioned",
        actionType: "DELETE",
        actorType: "ADMIN",
        user: "OPERATOR",
        targetEntity: "DECEPTION_ASSET",
        referenceId: req.params.id,
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
      await checkAndEscalateAlerts();
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      if (err instanceof Error) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.post('/webhook/canary', async (req, res) => {
    try {
      const tokenId = req.body?.token_id || req.body?.tokenId;
      if (!tokenId) return res.status(400).json({ message: "Missing token_id" });
      const sourceIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers['user-agent'] || "unknown";
      await processWebhookTrigger({
        tokenId, sourceIp, userAgent,
        geoLocation: req.body?.geo || "Unknown",
      });
      await checkAndEscalateAlerts();
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
    res.json(await runCorrelation());
  });

  app.get(api.deception.stats.path, async (req, res) => {
    const assets = await storage.getDeceptionAssets();
    const personas = await storage.getHoneyPersonas();
    res.json(getDeceptionStats(assets, personas));
  });

  app.get(api.deception.personas.list.path, async (req, res) => {
    res.json(await storage.getHoneyPersonas());
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
        actionType: "STATUS_CHANGE",
        actorType: "ADMIN",
        user: "OPERATOR",
        targetEntity: "HONEY_PERSONA",
        referenceId: String(req.params.id),
        details: `Persona "${persona.name}" retired`,
      });
      res.json(persona);
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.get(api.deepfake.list.path, async (req, res) => {
    res.json(await storage.getDeepfakeScans());
  });

  app.post(api.deepfake.scan.path, async (req, res) => {
    try {
      const input = api.deepfake.scan.input.parse(req.body);
      const scan = await processDeepfakeScan(input.mediaUrl, input.mediaType, input.subjectName);
      await checkAndEscalateAlerts();
      res.status(201).json(scan);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.get(api.deepfake.stats.path, async (req, res) => {
    const scans = await storage.getDeepfakeScans();
    const profiles = await storage.getDeepfakeExposureProfiles();
    res.json(getDeepfakeStats(scans, profiles));
  });

  app.get(api.deepfake.exposure.list.path, async (req, res) => {
    res.json(await storage.getDeepfakeExposureProfiles());
  });

  app.post(api.deepfake.exposure.create.path, async (req, res) => {
    try {
      const input = api.deepfake.exposure.create.input.parse(req.body);
      const { score, level } = calculateExposureScore(input);
      const profile = await storage.createDeepfakeExposureProfile({
        subjectName: input.subjectName,
        videoMinutes: input.videoMinutes,
        audioScore: input.audioScore,
        faceVisibilityScore: input.faceVisibilityScore,
        imageAvailabilityScore: input.imageAvailabilityScore,
        exposureScore: score,
        exposureLevel: level,
      });

      if (level === "CRITICAL" || level === "HIGH") {
        await storage.createAlert({
          title: `Deepfake Exposure ${level}: ${input.subjectName}`,
          description: `Subject "${input.subjectName}" has ${level} deepfake exposure risk (score: ${score}/100). Immediate protective measures recommended.`,
          severity: level === "CRITICAL" ? "CRITICAL" : "HIGH",
          alertType: "DEEPFAKE_EXPOSURE",
          sourceModule: "DEEPFAKE_DEFENSE",
          recommendedAction: "Reduce public media presence, implement watermarking, deploy voice authentication",
          isRead: false,
        });
      }

      await storage.createAuditLog({
        action: "Deepfake Exposure Profile Created",
        actionType: "CREATE",
        actorType: "ANALYST",
        user: "OPERATOR",
        targetEntity: input.subjectName,
        details: `Exposure Score: ${score}/100 | Level: ${level}`,
      });

      res.status(201).json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.post(api.deepfake.mitigate.path, async (req, res) => {
    try {
      const input = api.deepfake.mitigate.input.parse(req.body);
      const guidance = generateMitigationGuidanceDeterministic(input.exposureLevel, input.syntheticDetected || false);
      res.json({ guidance });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.get(api.risk.scores.path, async (req, res) => {
    res.json(await storage.getRiskScores());
  });

  app.get(api.audit.list.path, async (req, res) => {
    res.json(await storage.getAuditLogs());
  });

  app.get(api.audit.search.path, async (req, res) => {
    const { entity, action, actor } = req.query as Record<string, string>;
    const results = await storage.searchAuditLogs({ entity, action, actor });
    res.json(results);
  });

  app.get(api.reports.list.path, async (req, res) => {
    res.json(await storage.getIncidentReports());
  });

  app.post(api.reports.generate.path, async (req, res) => {
    try {
      const input = api.reports.generate.input.parse(req.body);
      const report = await generateIncidentReport(input.reportType, input.domain);
      res.status(201).json(report);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.post(api.externalIntel.analyze.path, async (req, res) => {
    try {
      const input = api.externalIntel.analyze.input.parse(req.body);
      const ngrokBase = process.env.NGROK_BASE_URL;
      const ngrokKey = process.env.NGROK_API_KEY;
      if (!ngrokBase || !ngrokKey) {
        return res.status(500).json({ message: "External intelligence backend not configured" });
      }

      const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true" };

      async function safeFetch(url: string): Promise<any> {
        try {
          const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
          if (!response.ok) {
            return { error: `Upstream returned ${response.status}`, risk_level: "UNKNOWN" };
          }
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch {
            return { error: "Invalid response from upstream", risk_level: "UNKNOWN" };
          }
        } catch (err: any) {
          return { error: err.message || "Connection failed", risk_level: "UNKNOWN" };
        }
      }

      const [darkWebData, passwordData] = await Promise.all([
        safeFetch(`${ngrokBase}/scan?key=${encodeURIComponent(ngrokKey)}&target=${encodeURIComponent(input.target)}`),
        input.password
          ? safeFetch(`${ngrokBase}/password-check?key=${encodeURIComponent(ngrokKey)}&password=${encodeURIComponent(input.password)}`)
          : Promise.resolve(null),
      ]);

      const dwSignal = {
        risk_level: darkWebData?.risk_level || darkWebData?.dark_web_risk_level || "LOW",
        risk_score: darkWebData?.risk_score ?? 0,
        domain_mentions: darkWebData?.domain_mentions ?? darkWebData?.mentions ?? 0,
        keywords_found: darkWebData?.keywords_found ?? {},
      };
      const credSignal = passwordData ? {
        exposure_count: passwordData?.exposure_count ?? passwordData?.breach_count ?? 0,
        risk_level: passwordData?.risk_level || passwordData?.password_risk_level || "LOW",
      } : undefined;

      const correlation = correlate(dwSignal, credSignal);

      await storage.createAuditLog({
        action: "External Intel Analysis",
        actionType: "CORRELATION",
        actorType: "ANALYST",
        user: "OPERATOR",
        targetEntity: input.target,
        details: `Target: ${input.target} | Score: ${correlation.combined_score}/100 | Risk: ${correlation.combined_risk_level} | Probability: ${correlation.attack_probability_percentage}% | Triggers: ${correlation.correlation_triggers.length}`,
        rawEventData: correlation,
      });

      if (correlation.combined_risk_level === "CRITICAL" || correlation.combined_risk_level === "HIGH") {
        await storage.createAlert({
          title: `Correlated Threat: ${correlation.combined_risk_level} for ${input.target}`,
          description: `Combined score ${correlation.combined_score}/100. Attack probability ${correlation.attack_probability_percentage}%. ${correlation.correlation_triggers.length} escalation rule(s) triggered.`,
          severity: correlation.combined_risk_level,
          alertType: "CORRELATION_ENGINE",
          sourceModule: "CORRELATION",
          recommendedAction: correlation.correlation_triggers.map(t => t.rule_name).join(", ") || "Review exposure and rotate credentials.",
          isRead: false,
        });
      }

      res.json({
        dark_web_risk: darkWebData,
        password_risk: passwordData,
        ...correlation,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error("External intel analysis error:", err);
      res.status(500).json({ message: "External intelligence analysis failed" });
    }
  });

  app.post(api.externalIntel.correlate.path, async (req, res) => {
    try {
      const input = api.externalIntel.correlate.input.parse(req.body);
      const result = correlate(input.dark_web, input.credentials, input.additional_signals);

      await storage.createAuditLog({
        action: "Correlation Engine Analysis",
        actionType: "CORRELATION",
        actorType: "ANALYST",
        user: "OPERATOR",
        details: `Score: ${result.combined_score}/100 | Risk: ${result.combined_risk_level} | Probability: ${result.attack_probability_percentage}% | Triggers: ${result.correlation_triggers.length}`,
        rawEventData: result,
      });

      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.get(api.system.health.path, async (req, res) => {
    let dbStatus = "unknown";
    try {
      await storage.getAlerts();
      dbStatus = "connected";
    } catch {
      dbStatus = "error";
    }
    const integrations = [];
    if (process.env.HIBP_API_KEY) integrations.push("HIBP");
    if (process.env.SHODAN_API_KEY) integrations.push("SHODAN");
    if (process.env.GITHUB_TOKEN) integrations.push("GITHUB");
    if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY) integrations.push("OPENAI");
    res.json({
      status: "operational",
      uptime: Math.round((Date.now() - startTime) / 1000),
      dbStatus,
      timestamp: new Date().toISOString(),
      activeIntegrations: integrations,
    });
  });

  await seedDatabase();
  return httpServer;
}

async function seedDatabase() {
  const existingAlerts = await storage.getAlerts();
  if (existingAlerts.length === 0) {
    console.log("Seeding database with military-grade intel...");

    await storage.createAlert({
      title: "Suspicious Login Attempt",
      description: "Multiple failed logins from TOR exit node targeting command interface.",
      severity: "HIGH",
      alertType: "AUTH_FAILURE",
      sourceModule: "ACCESS_CONTROL",
      recommendedAction: "Block source IP, review access logs, enable MFA",
      isRead: false,
    });
    await storage.createAlert({
      title: "New CVE Published",
      description: "CVE-2024-XXXX affects edge router firmware. Patch recommended.",
      severity: "CRITICAL",
      alertType: "VULNERABILITY",
      sourceModule: "THREAT_INTEL",
      recommendedAction: "Apply firmware patch immediately, audit affected systems",
      isRead: false,
    });

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

    await storage.createDeepfakeScan({
      mediaUrl: "https://example.com/suspicious_video.mp4",
      mediaType: "video",
      status: "completed",
      isDeepfake: true,
      syntheticProbability: 91,
      confidenceScore: 92,
      riskLevel: "CRITICAL",
      analysisSummary: "Synthetic video detected with high confidence. Facial manipulation indicators found.",
      detectionTags: ["FACE_SWAP_DETECTED", "TEMPORAL_INCONSISTENCY", "GAN_FINGERPRINT_SCAN"],
    });
    await storage.createDeepfakeScan({
      mediaUrl: "https://example.com/press_release_audio.wav",
      mediaType: "audio",
      status: "completed",
      isDeepfake: false,
      syntheticProbability: 14,
      confidenceScore: 87,
      riskLevel: "LOW",
      analysisSummary: "Media appears authentic. No significant manipulation indicators detected.",
      detectionTags: ["WAVEFORM_ANALYSIS"],
    });

    await storage.createAuditLog({
      action: "System Initialization",
      actionType: "SYSTEM",
      actorType: "SYSTEM",
      user: "SYSTEM_ADMIN",
      details: "NEMESIS Core booted and connected to intelligence feeds.",
    });
    await storage.createAuditLog({
      action: "Threat Feed Sync",
      actionType: "SYNC",
      actorType: "SYSTEM",
      user: "SYSTEM",
      details: "Successfully synced with HaveIBeenPwned and Shodan APIs.",
    });
  }
}
