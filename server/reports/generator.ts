import { storage } from "../storage";

let _openai: any = null;

function getOpenAI() {
  if (!_openai) {
    try {
      const OpenAI = require("openai").default || require("openai");
      _openai = new OpenAI();
    } catch {
      return null;
    }
  }
  return _openai;
}

export async function generateIncidentReport(
  reportType: string,
  domain?: string
) {
  const breaches = await storage.getBreachRecords();
  const infra = await storage.getInfraExposure();
  const scenarios = await storage.getAttackScenarios();
  const scans = await storage.getDeepfakeScans();
  const riskScores = await storage.getRiskScores();
  const triggeredAssets = (await storage.getDeceptionAssets()).filter(a => a.triggered);
  const recentAlerts = await storage.getRecentAlerts(1440);

  const context = {
    breachCount: breaches.length,
    infraCount: infra.length,
    scenarioCount: scenarios.length,
    deepfakeThreats: scans.filter(s => s.isDeepfake).length,
    triggeredTokens: triggeredAssets.length,
    alertCount: recentAlerts.length,
    avgRiskScore: riskScores.length > 0
      ? Math.round(riskScores.reduce((a, r) => a + r.overallScore, 0) / riskScores.length) : 0,
  };

  let title: string;
  let executiveSummary: string;
  let riskLevel: string;
  const technicalDetails: any = {};

  switch (reportType) {
    case "EXPOSURE":
      title = `Exposure Intelligence Report${domain ? `: ${domain}` : ""}`;
      riskLevel = context.breachCount > 5 ? "CRITICAL" : context.breachCount > 2 ? "HIGH" : context.infraCount > 3 ? "MODERATE" : "LOW";
      executiveSummary = `Analysis identified ${context.breachCount} breach record(s), ${context.infraCount} infrastructure exposure(s), and ${context.scenarioCount} potential attack path(s). Overall risk assessment: ${riskLevel}.`;
      technicalDetails.breaches = breaches.slice(0, 10);
      technicalDetails.infrastructure = infra.slice(0, 10);
      technicalDetails.topScenarios = scenarios.slice(0, 5);
      break;

    case "ACTIVE_TARGETING":
      title = `Active Targeting Report${domain ? `: ${domain}` : ""}`;
      riskLevel = context.triggeredTokens > 2 ? "CRITICAL" : context.triggeredTokens > 0 ? "HIGH" : "MODERATE";
      executiveSummary = `${context.triggeredTokens} deception asset(s) triggered indicating ${context.triggeredTokens > 2 ? "coordinated" : "preliminary"} reconnaissance activity. ${context.alertCount} alert(s) generated in the last 24 hours. Immediate review recommended.`;
      technicalDetails.triggeredAssets = triggeredAssets;
      technicalDetails.recentAlerts = recentAlerts.slice(0, 10);
      break;

    case "DEEPFAKE_INCIDENT":
      title = `Deepfake Incident Report${domain ? `: ${domain}` : ""}`;
      riskLevel = context.deepfakeThreats > 2 ? "CRITICAL" : context.deepfakeThreats > 0 ? "HIGH" : "LOW";
      executiveSummary = `${context.deepfakeThreats} synthetic media threat(s) detected across ${scans.length} total scan(s). ${context.deepfakeThreats > 0 ? "Active impersonation attempts identified — immediate countermeasures required." : "No active threats — continued monitoring recommended."}`;
      technicalDetails.scans = scans.slice(0, 10);
      technicalDetails.threats = scans.filter(s => s.isDeepfake).slice(0, 5);
      break;

    case "EXECUTIVE_SUMMARY":
    default:
      title = `Executive Threat Summary${domain ? `: ${domain}` : ""}`;
      riskLevel = context.avgRiskScore > 60 ? "CRITICAL" : context.avgRiskScore > 35 ? "HIGH" : context.avgRiskScore > 15 ? "MODERATE" : "LOW";
      executiveSummary = `Comprehensive assessment: ${context.breachCount} breaches, ${context.infraCount} infrastructure exposures, ${context.triggeredTokens} active targeting indicators, ${context.deepfakeThreats} deepfake threats. Average risk score: ${context.avgRiskScore}/100. ${context.alertCount} alerts in the last 24 hours.`;
      technicalDetails.riskScores = riskScores.slice(0, 5);
      technicalDetails.criticalAlerts = recentAlerts.filter(a => a.severity === "CRITICAL").slice(0, 5);
      technicalDetails.summary = context;
      break;
  }

  let aiEnhanced = false;
  const openai = getOpenAI();
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "You are a cybersecurity intelligence analyst producing tactical incident reports. Be concise, factual, and actionable."
        }, {
          role: "user",
          content: `Generate a detailed executive summary for this ${reportType} report:\n\nContext: ${JSON.stringify(context)}\n\nCurrent summary: ${executiveSummary}\n\nEnhance the summary with actionable intelligence insights. Keep it under 200 words.`
        }],
        max_tokens: 300,
      });
      if (response.choices?.[0]?.message?.content) {
        executiveSummary = response.choices[0].message.content;
        aiEnhanced = true;
      }
    } catch {}
  }

  const report = await storage.createIncidentReport({
    reportType,
    domain: domain || null,
    title,
    executiveSummary,
    technicalDetails,
    riskLevel,
    reportData: { context, aiEnhanced, generatedAt: new Date().toISOString() },
  });

  await storage.createAuditLog({
    action: "Incident Report Generated",
    actionType: "REPORT",
    actorType: "SYSTEM",
    user: "REPORT_ENGINE",
    targetEntity: domain || "GLOBAL",
    referenceId: String(report.id),
    details: `${reportType} report generated. Risk Level: ${riskLevel}. AI Enhanced: ${aiEnhanced}`,
  });

  return report;
}
