export interface DarkWebSignal {
  risk_level: string;
  risk_score?: number;
  domain_mentions?: number;
  keywords_found?: Record<string, any>;
}

export interface CredentialSignal {
  exposure_count?: number;
  risk_level: string;
}

export interface SignalModule {
  id: string;
  name: string;
  weight: number;
  computeScore: (data: any) => number;
  getRiskLevel: (data: any) => string;
}

export interface CorrelationTrigger {
  rule_id: string;
  rule_name: string;
  description: string;
  escalation_points: number;
  conditions_met: string[];
}

export interface CorrelationResult {
  individual_signals: Record<string, { raw_risk_level: string; base_score: number }>;
  weighted_scores: Record<string, number>;
  correlation_triggers: CorrelationTrigger[];
  combined_score: number;
  combined_risk_level: string;
  attack_probability_percentage: number;
  explainability_report: string;
}

const DARK_WEB_WEIGHTS: Record<string, number> = {
  LOW: 5,
  MODERATE: 15,
  HIGH: 30,
  CRITICAL: 50,
};

const CREDENTIAL_WEIGHTS: Record<string, number> = {
  SAFE: 0,
  LOW: 0,
  MODERATE: 10,
  HIGH: 25,
  CRITICAL: 40,
};

function normalizeRiskLevel(level: string | undefined | null): string {
  if (!level) return "LOW";
  const upper = level.toUpperCase().trim();
  if (upper === "SAFE") return "SAFE";
  if (["LOW", "MODERATE", "HIGH", "CRITICAL"].includes(upper)) return upper;
  if (upper === "MEDIUM") return "MODERATE";
  if (upper === "UNKNOWN") return "LOW";
  return "LOW";
}

function classifyScore(score: number): string {
  if (score >= 76) return "CRITICAL";
  if (score >= 46) return "HIGH";
  if (score >= 21) return "MODERATE";
  return "LOW";
}

function riskSeverityOrd(level: string): number {
  const map: Record<string, number> = { LOW: 0, SAFE: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 };
  return map[level] ?? 0;
}

function computeDarkWebBaseScore(signal: DarkWebSignal | null | undefined): number {
  if (!signal) return 0;
  const level = normalizeRiskLevel(signal.risk_level);
  return DARK_WEB_WEIGHTS[level] ?? 0;
}

function computeCredentialBaseScore(signal: CredentialSignal | null | undefined): number {
  if (!signal) return 0;
  const level = normalizeRiskLevel(signal.risk_level);
  return CREDENTIAL_WEIGHTS[level] ?? 0;
}

function evaluateEscalationRules(
  darkWeb: DarkWebSignal | null | undefined,
  credentials: CredentialSignal | null | undefined
): CorrelationTrigger[] {
  const triggers: CorrelationTrigger[] = [];
  const dwLevel = normalizeRiskLevel(darkWeb?.risk_level);
  const credLevel = normalizeRiskLevel(credentials?.risk_level);

  if (riskSeverityOrd(dwLevel) >= 2 && riskSeverityOrd(credLevel) >= 2) {
    triggers.push({
      rule_id: "ESC-001",
      rule_name: "Credential Stuffing Risk",
      description: "Dark web intelligence and credential exposure both indicate HIGH or CRITICAL risk, signaling elevated credential stuffing probability.",
      escalation_points: 25,
      conditions_met: [
        `Dark web risk: ${dwLevel}`,
        `Credential risk: ${credLevel}`,
        "Both signals >= HIGH threshold",
      ],
    });
  }

  const keywords = darkWeb?.keywords_found || {};
  const keywordKeys = Object.keys(keywords).map(k => k.toLowerCase());
  const hasBreachKeyword = keywordKeys.some(k => k.includes("breach") || k.includes("dump"));
  const exposureCount = credentials?.exposure_count ?? 0;

  if (hasBreachKeyword && exposureCount > 10000) {
    triggers.push({
      rule_id: "ESC-002",
      rule_name: "Active Breach Amplification",
      description: "Breach-related keywords detected in dark web intelligence combined with significant credential exposure volume indicates active data trading.",
      escalation_points: 20,
      conditions_met: [
        `Breach keywords found: ${keywordKeys.filter(k => k.includes("breach") || k.includes("dump")).join(", ")}`,
        `Exposure count: ${exposureCount.toLocaleString()} (> 10,000 threshold)`,
      ],
    });
  }

  const mentions = darkWeb?.domain_mentions ?? 0;
  if (mentions > 2) {
    triggers.push({
      rule_id: "ESC-003",
      rule_name: "Targeted Reconnaissance Pattern",
      description: "Multiple dark web mentions of the target domain suggest active reconnaissance or threat actor interest.",
      escalation_points: 15,
      conditions_met: [
        `Domain mentions: ${mentions} (> 2 threshold)`,
      ],
    });
  }

  return triggers;
}

function generateExplainabilityReport(
  darkWeb: DarkWebSignal | null | undefined,
  credentials: CredentialSignal | null | undefined,
  triggers: CorrelationTrigger[],
  combinedScore: number,
  combinedRiskLevel: string,
  attackProbability: number
): string {
  const dwLevel = normalizeRiskLevel(darkWeb?.risk_level);
  const credLevel = normalizeRiskLevel(credentials?.risk_level);
  const sections: string[] = [];

  sections.push(`NEMESIS CORRELATION ENGINE — THREAT ASSESSMENT REPORT`);
  sections.push(`Overall Risk Classification: ${combinedRiskLevel} | Combined Score: ${combinedScore}/100 | Attack Probability: ${attackProbability.toFixed(1)}%`);
  sections.push("");

  if (riskSeverityOrd(dwLevel) >= 2) {
    sections.push(`Dark web intelligence indicates ${dwLevel} risk exposure. ${darkWeb?.domain_mentions ? `The target domain was referenced ${darkWeb.domain_mentions} time(s) across monitored dark web sources.` : ""}`);
  } else if (dwLevel === "MODERATE") {
    sections.push("Dark web monitoring detected moderate-level activity associated with the target. Continued surveillance recommended.");
  } else {
    sections.push("Dark web intelligence shows minimal threat indicators at this time.");
  }

  if (riskSeverityOrd(credLevel) >= 2) {
    sections.push(`Credential exposure analysis reveals ${credLevel} risk. ${credentials?.exposure_count ? `${credentials.exposure_count.toLocaleString()} exposed credential records detected.` : ""} Immediate credential rotation is advised.`);
  } else if (credLevel === "MODERATE") {
    sections.push("Credential exposure at moderate levels. Proactive password hygiene and monitoring recommended.");
  } else {
    sections.push("No significant credential exposure detected in current intelligence feeds.");
  }

  if (triggers.length > 0) {
    sections.push("");
    sections.push(`ESCALATION ANALYSIS: ${triggers.length} conditional escalation rule(s) triggered:`);
    for (const t of triggers) {
      sections.push(`  [${t.rule_id}] ${t.rule_name} (+${t.escalation_points} pts) — ${t.description}`);
    }
  }

  if (combinedRiskLevel === "CRITICAL") {
    sections.push("");
    sections.push("CRITICAL ADVISORY: Combined signal analysis indicates imminent or active threat conditions. Immediate incident response procedures should be initiated. Recommend activating SOC Level 3 response protocol.");
  } else if (combinedRiskLevel === "HIGH") {
    sections.push("");
    sections.push("HIGH RISK ADVISORY: Elevated threat indicators detected across correlated signals. Recommend increased monitoring cadence and preemptive credential rotation. SOC Level 2 alert recommended.");
  }

  return sections.join("\n");
}

export function correlate(
  darkWeb: DarkWebSignal | null | undefined,
  credentials: CredentialSignal | null | undefined,
  additionalSignals?: Record<string, { score: number; risk_level: string }>
): CorrelationResult {
  const dwBase = computeDarkWebBaseScore(darkWeb);
  const credBase = computeCredentialBaseScore(credentials);
  const dwLevel = normalizeRiskLevel(darkWeb?.risk_level);
  const credLevel = normalizeRiskLevel(credentials?.risk_level);

  const individualSignals: Record<string, { raw_risk_level: string; base_score: number }> = {
    dark_web: { raw_risk_level: dwLevel, base_score: dwBase },
    credentials: { raw_risk_level: credLevel, base_score: credBase },
  };

  const weightedScores: Record<string, number> = {
    dark_web: dwBase,
    credentials: credBase,
  };

  if (additionalSignals) {
    for (const [key, val] of Object.entries(additionalSignals)) {
      individualSignals[key] = { raw_risk_level: val.risk_level, base_score: val.score };
      weightedScores[key] = val.score;
    }
  }

  const triggers = evaluateEscalationRules(darkWeb, credentials);
  const escalationTotal = triggers.reduce((sum, t) => sum + t.escalation_points, 0);

  let rawScore = dwBase + credBase + escalationTotal;
  if (additionalSignals) {
    rawScore += Object.values(additionalSignals).reduce((sum, v) => sum + v.score, 0);
  }

  const combinedScore = Math.min(Math.round(rawScore), 100);
  let combinedRiskLevel = classifyScore(combinedScore);

  if (riskSeverityOrd(dwLevel) >= 3 && riskSeverityOrd(credLevel) >= 3) {
    combinedRiskLevel = "CRITICAL";
  }

  const attackProbability = Math.min(Math.round(combinedScore * 1.2 * 10) / 10, 100);

  const report = generateExplainabilityReport(
    darkWeb, credentials, triggers, combinedScore, combinedRiskLevel, attackProbability
  );

  return {
    individual_signals: individualSignals,
    weighted_scores: weightedScores,
    correlation_triggers: triggers,
    combined_score: combinedScore,
    combined_risk_level: combinedRiskLevel,
    attack_probability_percentage: attackProbability,
    explainability_report: report,
  };
}
