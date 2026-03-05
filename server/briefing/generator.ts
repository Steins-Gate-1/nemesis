import { storage } from "../storage";
import { mapToMitre } from "../mitre/attack";

let _openai: any = null;
function getOpenAI() {
  if (!_openai) {
    const OpenAI = require("openai").default;
    _openai = new OpenAI();
  }
  return _openai;
}

export interface BriefingSection {
  heading: string;
  content: string;
}

export interface ThreatBriefing {
  title: string;
  classification: string;
  timestamp: string;
  overallThreatLevel: string;
  sections: BriefingSection[];
}

export async function generateThreatBriefing(domain?: string): Promise<ThreatBriefing> {
  const [breaches, infra, github, scenarios, alerts, riskScores, deceptionAssets, deepfakeScans, mitreData] = await Promise.all([
    storage.getBreachRecords(),
    storage.getInfraExposure(),
    storage.getGithubExposure(),
    storage.getAttackScenarios(),
    storage.getActiveAlerts(),
    storage.getRiskScores(),
    storage.getDeceptionAssets(),
    storage.getDeepfakeScans(),
    mapToMitre(),
  ]);

  const activeAlerts = alerts.filter(a => a.status !== "RESOLVED");
  const criticalAlerts = activeAlerts.filter(a => (a.severity || "").toUpperCase().includes("CRITICAL"));
  const triggeredDeceptions = deceptionAssets.filter(a => a.triggered);
  const deepfakeThreats = deepfakeScans.filter(s => s.isDeepfake || (s.syntheticProbability && s.syntheticProbability > 50));
  const latestRisk = riskScores.length > 0 ? riskScores[riskScores.length - 1] : null;

  let overallThreatLevel = "LOW";
  if (criticalAlerts.length > 0 || deepfakeThreats.length > 0) overallThreatLevel = "CRITICAL";
  else if (activeAlerts.length > 3 || triggeredDeceptions.length > 0) overallThreatLevel = "HIGH";
  else if (breaches.length > 0 || infra.length > 0) overallThreatLevel = "MODERATE";

  const context = {
    breachCount: breaches.length,
    infraCount: infra.length,
    githubLeaks: github.length,
    attackScenarios: scenarios.length,
    activeAlertCount: activeAlerts.length,
    criticalAlertCount: criticalAlerts.length,
    triggeredDeceptions: triggeredDeceptions.length,
    deepfakeThreats: deepfakeThreats.length,
    mitreCoverage: mitreData.coveragePercentage,
    highestRiskTactic: mitreData.highestRiskTactic,
    overallRiskScore: latestRisk?.overallScore || 0,
    domain: domain || "all monitored domains",
    topBreaches: breaches.slice(0, 3).map(b => b.title).join(", "),
    topVulnIPs: infra.slice(0, 3).map(i => i.ip).join(", "),
  };

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a senior cybersecurity intelligence analyst at a national SOC. Generate a CLASSIFIED-style daily threat intelligence briefing. Use formal military/intelligence language. Be specific and analytical. Structure output as JSON with sections array.`
        },
        {
          role: "user",
          content: `Generate a DAILY THREAT INTELLIGENCE BRIEFING based on this data:

Target: ${context.domain}
Active Breach Records: ${context.breachCount} (top: ${context.topBreaches || "none"})
Exposed Infrastructure: ${context.infraCount} hosts (IPs: ${context.topVulnIPs || "none"})
GitHub Credential Leaks: ${context.githubLeaks}
Attack Scenarios Modeled: ${context.attackScenarios}
Active Alerts: ${context.activeAlertCount} (${context.criticalAlertCount} CRITICAL)
Deception Triggers: ${context.triggeredDeceptions}
Deepfake Threats Detected: ${context.deepfakeThreats}
MITRE ATT&CK Coverage: ${context.mitreCoverage}% (highest risk: ${context.highestRiskTactic})
Overall Risk Score: ${context.overallRiskScore}/100
Threat Level: ${overallThreatLevel}

Return JSON: { "sections": [{"heading": "...", "content": "..."}] }
Include sections: EXECUTIVE SUMMARY, THREAT LANDSCAPE ASSESSMENT, ACTIVE INDICATORS OF COMPROMISE, RISK ASSESSMENT MATRIX, MITRE ATT&CK COVERAGE ANALYSIS, RECOMMENDED IMMEDIATE ACTIONS, 72-HOUR OUTLOOK`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    const sections: BriefingSection[] = (parsed.sections || []).map((s: any) => ({
      heading: s.heading || "Section",
      content: s.content || "",
    }));

    return {
      title: `DAILY THREAT INTELLIGENCE BRIEFING — ${new Date().toISOString().split("T")[0]}`,
      classification: "CLASSIFIED // NEMESIS SIGINT",
      timestamp: new Date().toISOString(),
      overallThreatLevel,
      sections,
    };
  } catch (err: any) {
    console.error("[Briefing] OpenAI failed, using deterministic briefing:", err.message);
    return generateDeterministicBriefing(context, overallThreatLevel);
  }
}

function generateDeterministicBriefing(
  ctx: Record<string, any>,
  threatLevel: string
): ThreatBriefing {
  const sections: BriefingSection[] = [
    {
      heading: "EXECUTIVE SUMMARY",
      content: `Current threat posture assessed as ${threatLevel}. ${ctx.activeAlertCount} active alerts detected across monitored infrastructure, with ${ctx.criticalAlertCount} classified as CRITICAL priority. ${ctx.breachCount} breach records identified affecting ${ctx.domain}. ${ctx.triggeredDeceptions} deception assets triggered indicating active adversary reconnaissance. Overall organizational risk score: ${ctx.overallRiskScore}/100.`
    },
    {
      heading: "THREAT LANDSCAPE ASSESSMENT",
      content: `Infrastructure reconnaissance has identified ${ctx.infraCount} exposed host(s) with potentially exploitable services. ${ctx.githubLeaks} credential leak(s) detected in public code repositories, presenting immediate credential compromise risk. ${ctx.attackScenarios} attack scenario(s) have been modeled based on current exposure data. ${ctx.deepfakeThreats > 0 ? `ALERT: ${ctx.deepfakeThreats} synthetic media threat(s) detected — potential deepfake weaponization in progress.` : "No synthetic media threats currently detected."}`
    },
    {
      heading: "ACTIVE INDICATORS OF COMPROMISE",
      content: `Breach intelligence sources report ${ctx.breachCount} historical compromise event(s)${ctx.topBreaches ? ` including: ${ctx.topBreaches}` : ""}. ${ctx.triggeredDeceptions > 0 ? `Deception grid has registered ${ctx.triggeredDeceptions} trigger event(s), confirming active adversary interaction with honeytoken infrastructure.` : "Deception grid remains untriggered — no confirmed adversary interaction."} ${ctx.topVulnIPs ? `Priority hosts for remediation: ${ctx.topVulnIPs}` : ""}`
    },
    {
      heading: "RISK ASSESSMENT MATRIX",
      content: `Overall Risk Score: ${ctx.overallRiskScore}/100 | Classification: ${threatLevel}\nBreaches: ${ctx.breachCount} | Infrastructure Exposure: ${ctx.infraCount} | GitHub Leaks: ${ctx.githubLeaks}\nActive Alerts: ${ctx.activeAlertCount} (Critical: ${ctx.criticalAlertCount}) | Attack Paths: ${ctx.attackScenarios}\nDeception Triggers: ${ctx.triggeredDeceptions} | Deepfake Threats: ${ctx.deepfakeThreats}`
    },
    {
      heading: "MITRE ATT&CK COVERAGE ANALYSIS",
      content: `Current intelligence maps to ${ctx.mitreCoverage}% of the MITRE ATT&CK Enterprise framework. Highest risk concentration observed in ${ctx.highestRiskTactic} tactic category. ${ctx.mitreCoverage > 40 ? "Coverage exceeds 40% threshold — adversary demonstrates broad capability spectrum." : "Coverage remains below critical threshold — adversary capabilities appear targeted."}`
    },
    {
      heading: "RECOMMENDED IMMEDIATE ACTIONS",
      content: `1. ${ctx.criticalAlertCount > 0 ? "PRIORITY: Triage and respond to all CRITICAL alerts within 1 hour" : "Monitor alert queue for escalations"}\n2. ${ctx.githubLeaks > 0 ? "Rotate all potentially compromised credentials identified in GitHub exposure scan" : "Continue monitoring public repositories"}\n3. ${ctx.triggeredDeceptions > 0 ? "Analyze deception trigger data to identify adversary TTPs and update detection rules" : "Verify deception asset placement and operational status"}\n4. ${ctx.deepfakeThreats > 0 ? "Initiate deepfake response protocol — verify identity of all flagged communications" : "Maintain synthetic media monitoring"}\n5. Update firewall rules and IDS signatures based on current IOC data`
    },
    {
      heading: "72-HOUR OUTLOOK",
      content: `Threat trajectory: ${threatLevel === "CRITICAL" ? "ESCALATING — immediate action required to prevent operational impact" : threatLevel === "HIGH" ? "ELEVATED — sustained adversary interest likely to continue" : "STABLE — maintain current monitoring posture and detection capabilities"}. Next scheduled assessment: ${new Date(Date.now() + 86400000).toISOString().split("T")[0]} 0600Z.`
    }
  ];

  return {
    title: `DAILY THREAT INTELLIGENCE BRIEFING — ${new Date().toISOString().split("T")[0]}`,
    classification: "CLASSIFIED // NEMESIS SIGINT",
    timestamp: new Date().toISOString(),
    overallThreatLevel: threatLevel,
    sections,
  };
}
