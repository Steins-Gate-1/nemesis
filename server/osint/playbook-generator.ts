import OpenAI from "openai";
import { type AttackScenario, type AttackSimulationResult } from "./attack-simulator";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI();
  }
  return _openai;
}

interface PlaybookBrief {
  executiveSummary: string;
  tacticalBrief: string;
  mitigationChecklist: string[];
  confidenceExplanation: string;
}

export async function generatePlaybook(
  domain: string,
  simulation: AttackSimulationResult
): Promise<PlaybookBrief> {
  if (simulation.attack_scenarios.length === 0) {
    return {
      executiveSummary: `No significant attack vectors were identified for ${domain} based on current intelligence.`,
      tacticalBrief: "Current exposure levels are within acceptable thresholds. Continue routine monitoring.",
      mitigationChecklist: ["Maintain current security posture", "Schedule periodic OSINT review"],
      confidenceExplanation: "Low confidence — no exposure data available to model attack paths.",
    };
  }

  const scenarioSummaries = simulation.attack_scenarios.map(s => ({
    id: s.scenarioId,
    title: s.title,
    entry: s.entryPoint,
    category: s.attackCategory,
    steps: s.attackSteps,
    conditions: s.requiredConditions,
    risk: s.riskScore,
    severity: s.severity,
    mitigations: s.recommendedMitigations,
    riskReasons: s.riskExplanation,
  }));

  const prompt = `You are a senior red-team analyst generating a threat intelligence brief. 
Domain: ${domain}
Overall Risk Level: ${simulation.overall_risk_level} (Score: ${simulation.overall_risk_score})

STRUCTURED ATTACK SCENARIOS (from deterministic analysis — do NOT invent additional vulnerabilities):
${JSON.stringify(scenarioSummaries, null, 2)}

RISK EXPLANATION:
${simulation.risk_explanation}

Based ONLY on the structured data above, generate a JSON response with these exact fields:
{
  "executiveSummary": "A 2-3 sentence executive-level summary of the threat posture. State the risk level, number of attack paths, and highest priority concern.",
  "tacticalBrief": "A detailed tactical brief (3-5 sentences) describing the most likely attack chain an adversary would follow, referencing specific findings from the data. Do not invent findings.",
  "mitigationChecklist": ["Array of 5-8 prioritized, actionable mitigation steps derived from the scenario mitigations. Order by urgency."],
  "confidenceExplanation": "Explain the confidence level of this assessment based on data completeness and exposure severity."
}

RULES:
- Only reference data provided in the scenarios above
- Do not fabricate vulnerabilities, CVEs, or attack techniques not present in the input
- Use precise, professional language suitable for a CISO briefing
- Return ONLY valid JSON, no markdown`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    const parsed = JSON.parse(content) as PlaybookBrief;
    return {
      executiveSummary: parsed.executiveSummary || "Assessment generation failed.",
      tacticalBrief: parsed.tacticalBrief || "",
      mitigationChecklist: Array.isArray(parsed.mitigationChecklist) ? parsed.mitigationChecklist : [],
      confidenceExplanation: parsed.confidenceExplanation || "",
    };
  } catch (error: any) {
    console.error("[PlaybookGenerator] AI generation failed:", error.message);
    return buildFallbackPlaybook(domain, simulation);
  }
}

function buildFallbackPlaybook(domain: string, sim: AttackSimulationResult): PlaybookBrief {
  const highest = sim.highest_risk_scenario;
  return {
    executiveSummary: `${domain} has been assessed at ${sim.overall_risk_level} risk level (score: ${sim.overall_risk_score}). ${sim.attack_scenarios.length} attack scenario(s) identified.${highest ? ` Primary concern: ${highest.title} (${highest.severity}).` : ""}`,
    tacticalBrief: highest
      ? `The most critical attack path is "${highest.title}" targeting ${highest.entryPoint}. ${highest.riskExplanation.join(". ")}. This scenario has a likelihood of ${highest.likelihoodScore}% and impact score of ${highest.impactScore}%.`
      : "No critical attack paths identified.",
    mitigationChecklist: highest?.recommendedMitigations || ["Continue routine security monitoring"],
    confidenceExplanation: "Deterministic assessment based on structured exposure data. AI enhancement unavailable — fallback analysis applied.",
  };
}
