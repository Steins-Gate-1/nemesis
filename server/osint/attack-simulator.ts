import { type AnalysisResult } from "./pipeline";
import { classifyAttackRisk } from "./severity";

export interface AttackScenario {
  scenarioId: string;
  title: string;
  entryPoint: string;
  attackCategory: string;
  attackSteps: string[];
  requiredConditions: string[];
  likelihoodScore: number;
  impactScore: number;
  riskScore: number;
  severity: string;
  recommendedMitigations: string[];
  riskExplanation: string[];
}

export interface AttackSimulationResult {
  attack_scenarios: AttackScenario[];
  highest_risk_scenario: AttackScenario | null;
  overall_risk_score: number;
  overall_risk_level: string;
  risk_explanation: string;
}

const ATTACK_CATEGORIES = {
  INITIAL_ACCESS: "Initial Access",
  PRIVILEGE_ESCALATION: "Privilege Escalation",
  LATERAL_MOVEMENT: "Lateral Movement",
  DATA_EXFILTRATION: "Data Exfiltration",
  PERSISTENCE: "Persistence",
  COMMAND_AND_CONTROL: "Command & Control",
} as const;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function buildCredentialReuseScenario(analysis: AnalysisResult): AttackScenario | null {
  const breachCount = analysis.breach_summary.total_breaches;
  if (breachCount === 0) return null;

  const hasSSH = analysis.infrastructure_summary.hosts.some(h => h.ports.includes(22));
  const hasRDP = analysis.infrastructure_summary.hosts.some(h => h.ports.includes(3389));
  const hasWebLogin = analysis.infrastructure_summary.hosts.some(h =>
    h.ports.includes(443) || h.ports.includes(80) || h.ports.includes(8080)
  );

  const exposedCredTypes = analysis.breach_summary.breaches
    .flatMap(b => b.dataClasses)
    .map(d => d.toLowerCase());
  const hasPasswords = exposedCredTypes.some(d => d.includes("password"));

  const steps: string[] = [
    `Attacker identifies ${breachCount} breach(es) containing credentials associated with ${analysis.domain}`,
    "Attacker harvests exposed email/password combinations from breach databases",
  ];
  const conditions: string[] = [`${breachCount} breach record(s) detected`];
  const mitigations: string[] = [
    "Enforce multi-factor authentication (MFA) on all accounts",
    "Rotate all credentials associated with breached accounts",
    "Implement credential monitoring and alerting",
  ];
  const riskReasons: string[] = [`${breachCount} breached credential set(s) detected`];

  if (hasSSH) {
    steps.push("Attempts credential stuffing against exposed SSH service (port 22)");
    steps.push("On successful authentication, gains remote shell access");
    conditions.push("SSH (port 22) publicly accessible");
    mitigations.push("Disable password-based SSH login, enforce key-based authentication");
    riskReasons.push("SSH exposed on port 22");
  }
  if (hasRDP) {
    steps.push("Attempts credential reuse against Remote Desktop (port 3389)");
    steps.push("On success, gains full GUI-based access to target system");
    conditions.push("RDP (port 3389) publicly accessible");
    mitigations.push("Restrict RDP access via VPN, enforce NLA and MFA");
    riskReasons.push("RDP exposed on port 3389");
  }
  if (hasWebLogin) {
    steps.push("Attempts credential reuse against web application login portals");
    conditions.push("Web services detected on standard ports");
    mitigations.push("Implement account lockout policies and CAPTCHA on login forms");
  }

  steps.push("Escalates privileges using compromised account permissions");
  steps.push("Establishes persistence via scheduled tasks or SSH key injection");

  const likelihood = clamp(
    (breachCount * 15) + (hasPasswords ? 25 : 0) + (hasSSH ? 20 : 0) + (hasRDP ? 20 : 0),
    10, 100
  );
  const impact = clamp(
    (hasSSH ? 30 : 0) + (hasRDP ? 35 : 0) + (hasPasswords ? 25 : 0) + (breachCount * 5),
    10, 100
  );
  const risk = Math.round((likelihood * impact) / 100);

  return {
    scenarioId: "CRED-REUSE-001",
    title: "Credential Reuse Attack",
    entryPoint: "Breached Credentials",
    attackCategory: ATTACK_CATEGORIES.INITIAL_ACCESS,
    attackSteps: steps,
    requiredConditions: conditions,
    likelihoodScore: likelihood,
    impactScore: impact,
    riskScore: risk,
    severity: classifyAttackRisk(risk),
    recommendedMitigations: mitigations,
    riskExplanation: riskReasons,
  };
}

function buildInfraExploitScenario(analysis: AnalysisResult): AttackScenario | null {
  const hosts = analysis.infrastructure_summary.hosts;
  if (hosts.length === 0) return null;

  const allPorts = hosts.flatMap(h => h.ports);
  const allVulns = hosts.flatMap(h => h.vulnerabilities);
  const criticalPorts = allPorts.filter(p => [27017, 3306, 5432, 1433, 6379, 9200, 11211].includes(p));
  const dangerPorts = allPorts.filter(p => [21, 23, 445, 135, 139, 3389, 5900].includes(p));

  if (criticalPorts.length === 0 && dangerPorts.length === 0 && allVulns.length === 0) return null;

  const steps: string[] = [
    `Attacker performs port scan and identifies ${allPorts.length} open service(s) across ${hosts.length} host(s)`,
  ];
  const conditions: string[] = [`${allPorts.length} open port(s) detected`];
  const mitigations: string[] = [];
  const riskReasons: string[] = [];

  if (criticalPorts.length > 0) {
    steps.push(`Discovers exposed database service(s) on port(s): ${criticalPorts.join(", ")}`);
    steps.push("Attempts default credential access or known exploit against database service");
    steps.push("On success, extracts sensitive data directly from database");
    conditions.push(`Database ports exposed: ${criticalPorts.join(", ")}`);
    mitigations.push("Restrict database ports to internal network only (firewall rules)");
    mitigations.push("Change default database credentials immediately");
    riskReasons.push(`Critical database port(s) exposed: ${criticalPorts.join(", ")}`);
  }

  if (dangerPorts.length > 0) {
    steps.push(`Identifies legacy/dangerous service(s) on port(s): ${dangerPorts.join(", ")}`);
    steps.push("Exploits known vulnerabilities in legacy protocols (FTP, Telnet, SMB)");
    conditions.push(`Dangerous ports exposed: ${dangerPorts.join(", ")}`);
    mitigations.push("Disable legacy protocols (FTP, Telnet) and use encrypted alternatives");
    riskReasons.push(`Dangerous port(s) publicly accessible: ${dangerPorts.join(", ")}`);
  }

  if (allVulns.length > 0) {
    steps.push(`Exploits ${allVulns.length} known CVE(s): ${allVulns.slice(0, 3).map(v => v.cve).join(", ")}${allVulns.length > 3 ? "..." : ""}`);
    steps.push("Uses exploit framework (Metasploit/custom) to gain initial foothold");
    conditions.push(`${allVulns.length} known CVE(s) present`);
    mitigations.push("Apply security patches for all identified CVEs immediately");
    riskReasons.push(`${allVulns.length} known vulnerability/vulnerabilities present`);
  }

  steps.push("Performs lateral movement to adjacent systems");
  steps.push("Establishes command & control channel for persistent access");

  const likelihood = clamp(
    (criticalPorts.length * 20) + (dangerPorts.length * 12) + (allVulns.length * 15),
    10, 100
  );
  const impact = clamp(
    (criticalPorts.length * 25) + (dangerPorts.length * 10) + (allVulns.length * 12) + (hosts.length * 5),
    10, 100
  );
  const risk = Math.round((likelihood * impact) / 100);

  return {
    scenarioId: "INFRA-EXPLOIT-001",
    title: "Remote Service Exploitation",
    entryPoint: "Exposed Infrastructure",
    attackCategory: ATTACK_CATEGORIES.INITIAL_ACCESS,
    attackSteps: steps,
    requiredConditions: conditions,
    likelihoodScore: likelihood,
    impactScore: impact,
    riskScore: risk,
    severity: classifyAttackRisk(risk),
    recommendedMitigations: mitigations,
    riskExplanation: riskReasons,
  };
}

function buildGithubLeakScenario(analysis: AnalysisResult): AttackScenario | null {
  const exposures = analysis.github_summary.exposures;
  if (exposures.length === 0) return null;

  const criticalLeaks = exposures.filter(e => e.severity === "CRITICAL");
  const highLeaks = exposures.filter(e => e.severity === "HIGH");
  const leakTypes = [...new Set(exposures.map(e => e.secretType))];

  const steps: string[] = [
    `Attacker discovers ${exposures.length} code exposure(s) referencing ${analysis.domain} on GitHub`,
    `Identifies leaked secret types: ${leakTypes.join(", ")}`,
  ];
  const conditions: string[] = [`${exposures.length} GitHub exposure(s) detected`];
  const mitigations: string[] = [
    "Immediately revoke all exposed keys and tokens",
    "Rotate all secrets found in public repositories",
    "Enable GitHub secret scanning and push protection",
    "Audit repository access permissions",
  ];
  const riskReasons: string[] = [`${exposures.length} secret(s) found in public repositories`];

  if (criticalLeaks.length > 0) {
    steps.push(`Extracts ${criticalLeaks.length} critical secret(s) (private keys, AWS credentials, database URLs)`);
    steps.push("Uses extracted credentials to access cloud infrastructure directly");
    steps.push("Enumerates accessible resources (S3 buckets, EC2 instances, databases)");
    steps.push("Exfiltrates sensitive data from compromised cloud resources");
    conditions.push(`${criticalLeaks.length} CRITICAL severity leak(s)`);
    riskReasons.push(`${criticalLeaks.length} critical secret(s) exposed (private keys, cloud credentials)`);
  } else if (highLeaks.length > 0) {
    steps.push(`Extracts ${highLeaks.length} high-severity secret(s) (API keys, tokens)`);
    steps.push("Attempts to use extracted tokens to access internal services");
    steps.push("Maps out accessible API endpoints and internal services");
    conditions.push(`${highLeaks.length} HIGH severity leak(s)`);
    riskReasons.push(`${highLeaks.length} API key(s) or token(s) exposed`);
  } else {
    steps.push("Analyzes configuration files for internal architecture details");
    steps.push("Uses gathered intelligence to plan targeted phishing attack");
  }

  const likelihood = clamp(
    (criticalLeaks.length * 30) + (highLeaks.length * 18) + (exposures.length * 5),
    15, 100
  );
  const impact = clamp(
    (criticalLeaks.length * 35) + (highLeaks.length * 20) + (exposures.length * 3),
    10, 100
  );
  const risk = Math.round((likelihood * impact) / 100);

  return {
    scenarioId: "GITHUB-LEAK-001",
    title: "Key-Based Infrastructure Compromise",
    entryPoint: "GitHub Secret Exposure",
    attackCategory: ATTACK_CATEGORIES.DATA_EXFILTRATION,
    attackSteps: steps,
    requiredConditions: conditions,
    likelihoodScore: likelihood,
    impactScore: impact,
    riskScore: risk,
    severity: classifyAttackRisk(risk),
    recommendedMitigations: mitigations,
    riskExplanation: riskReasons,
  };
}

function buildPhishingScenario(analysis: AnalysisResult): AttackScenario | null {
  const domainAge = analysis.whois_summary.domainAgeDays;
  const riskFlags = analysis.whois_summary.riskFlags;
  const hasBreaches = analysis.breach_summary.total_breaches > 0;

  if (domainAge > 180 && riskFlags.length === 0 && !hasBreaches) return null;

  const steps: string[] = [];
  const conditions: string[] = [];
  const mitigations: string[] = [
    "Implement DMARC, DKIM, and SPF email authentication",
    "Register common domain typosquats defensively",
    "Deploy email security gateway with phishing detection",
    "Conduct regular phishing awareness training",
  ];
  const riskReasons: string[] = [];

  if (domainAge < 180) {
    steps.push(`Domain ${analysis.domain} is only ${domainAge} days old — high phishing risk`);
    conditions.push(`Domain age: ${domainAge} days (< 6 months)`);
    riskReasons.push(`Recently registered domain (${domainAge} days old)`);
  }

  if (riskFlags.length > 0) {
    for (const flag of riskFlags) {
      conditions.push(flag);
      riskReasons.push(flag);
    }
  }

  if (hasBreaches) {
    steps.push(`Attacker uses ${analysis.breach_summary.total_breaches} breach record(s) to craft targeted phishing emails`);
    steps.push("Constructs convincing spear-phishing campaign using breached personal data");
    conditions.push(`${analysis.breach_summary.total_breaches} breach(es) provide personal data for social engineering`);
    riskReasons.push("Breached data enables personalized phishing attacks");
  }

  steps.push("Registers lookalike domain or compromises email account");
  steps.push("Sends targeted phishing emails to organization personnel");
  steps.push("Victim clicks malicious link or opens weaponized attachment");
  steps.push("Attacker captures credentials or deploys malware payload");
  steps.push("Uses compromised access for lateral movement within organization");

  const likelihood = clamp(
    (domainAge < 180 ? 30 : 0) + (riskFlags.length * 15) + (hasBreaches ? 25 : 0),
    10, 100
  );
  const impact = clamp(45 + (hasBreaches ? 20 : 0) + (riskFlags.length * 5), 20, 100);
  const risk = Math.round((likelihood * impact) / 100);

  return {
    scenarioId: "PHISH-001",
    title: "Phishing & Brand Impersonation",
    entryPoint: "Domain Trust / Social Engineering",
    attackCategory: ATTACK_CATEGORIES.INITIAL_ACCESS,
    attackSteps: steps,
    requiredConditions: conditions,
    likelihoodScore: likelihood,
    impactScore: impact,
    riskScore: risk,
    severity: classifyAttackRisk(risk),
    recommendedMitigations: mitigations,
    riskExplanation: riskReasons,
  };
}

function buildCombinedKillChainScenario(analysis: AnalysisResult): AttackScenario | null {
  const hasBreaches = analysis.breach_summary.total_breaches > 0;
  const hasInfra = analysis.infrastructure_summary.hosts.length > 0;
  const hasLeaks = analysis.github_summary.exposures.length > 0;

  const vectorCount = [hasBreaches, hasInfra, hasLeaks].filter(Boolean).length;
  if (vectorCount < 2) return null;

  const steps: string[] = [
    `Attacker identifies multiple attack surfaces for ${analysis.domain}`,
  ];
  const conditions: string[] = [`${vectorCount} distinct attack vectors identified`];
  const mitigations: string[] = [];
  const riskReasons: string[] = [`Multi-vector exposure: ${vectorCount} distinct surfaces`];

  if (hasBreaches) {
    steps.push(`Phase 1 [Initial Access]: Leverages ${analysis.breach_summary.total_breaches} breached credential(s) for account takeover`);
    conditions.push("Breached credentials available");
    riskReasons.push(`${analysis.breach_summary.total_breaches} credential set(s) compromised`);
    mitigations.push("Rotate all breached credentials and enforce MFA");
  }
  if (hasLeaks) {
    steps.push(`Phase 2 [Privilege Escalation]: Uses ${analysis.github_summary.total_exposures} leaked secret(s) from GitHub to access cloud infrastructure`);
    conditions.push("Secrets exposed in public repositories");
    riskReasons.push(`${analysis.github_summary.total_exposures} leaked secret(s) in public code`);
    mitigations.push("Revoke all exposed tokens and enable secret scanning");
  }
  if (hasInfra) {
    const totalPorts = analysis.infrastructure_summary.hosts.reduce((a, h) => a + h.ports.length, 0);
    steps.push(`Phase 3 [Lateral Movement]: Exploits ${totalPorts} exposed service(s) to pivot across infrastructure`);
    conditions.push(`${totalPorts} open port(s) on ${analysis.infrastructure_summary.hosts.length} host(s)`);
    riskReasons.push(`${totalPorts} exposed service(s) enable lateral movement`);
    mitigations.push("Implement network segmentation and close unnecessary ports");
  }

  steps.push("Phase 4 [Persistence]: Deploys backdoor and establishes C2 channel");
  steps.push("Phase 5 [Data Exfiltration]: Identifies and exfiltrates high-value assets");

  mitigations.push("Deploy endpoint detection and response (EDR) across all systems");
  mitigations.push("Implement zero-trust network architecture");
  mitigations.push("Conduct full penetration test to validate findings");

  const likelihood = clamp(vectorCount * 30 + 10, 30, 100);
  const impact = clamp(vectorCount * 25 + 20, 40, 100);
  const risk = Math.round((likelihood * impact) / 100);

  return {
    scenarioId: "KILLCHAIN-001",
    title: "Full Kill Chain — Multi-Vector Attack",
    entryPoint: "Combined Attack Surfaces",
    attackCategory: ATTACK_CATEGORIES.LATERAL_MOVEMENT,
    attackSteps: steps,
    requiredConditions: conditions,
    likelihoodScore: likelihood,
    impactScore: impact,
    riskScore: risk,
    severity: classifyAttackRisk(risk),
    recommendedMitigations: mitigations,
    riskExplanation: riskReasons,
  };
}

export function simulateAttacks(analysis: AnalysisResult): AttackSimulationResult {
  const generators = [
    buildCredentialReuseScenario,
    buildInfraExploitScenario,
    buildGithubLeakScenario,
    buildPhishingScenario,
    buildCombinedKillChainScenario,
  ];

  const scenarios: AttackScenario[] = [];
  for (const gen of generators) {
    const scenario = gen(analysis);
    if (scenario) scenarios.push(scenario);
  }

  let highestRisk: AttackScenario | null = null;
  let overallScore = 0;

  for (const s of scenarios) {
    overallScore += s.riskScore;
    if (!highestRisk || s.riskScore > highestRisk.riskScore) {
      highestRisk = s;
    }
  }

  const avgScore = scenarios.length > 0 ? Math.round(overallScore / scenarios.length) : 0;
  const overallLevel = classifyAttackRisk(avgScore);

  const explanationParts: string[] = [];
  if (scenarios.length === 0) {
    explanationParts.push("No significant attack vectors identified based on current exposure data.");
  } else {
    explanationParts.push(`${scenarios.length} attack scenario(s) identified.`);
    for (const s of scenarios) {
      explanationParts.push(`[${s.severity}] ${s.title}: ${s.riskExplanation.join("; ")}.`);
    }
  }

  return {
    attack_scenarios: scenarios,
    highest_risk_scenario: highestRisk,
    overall_risk_score: avgScore,
    overall_risk_level: overallLevel,
    risk_explanation: explanationParts.join(" "),
  };
}
