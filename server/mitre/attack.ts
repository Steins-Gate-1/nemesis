import { storage } from "../storage";

export interface MitreTechnique {
  techniqueId: string;
  techniqueName: string;
  description: string;
  relevance: string;
  evidenceCount: number;
  sources: string[];
  severity: string;
}

export interface MitreTactic {
  tacticId: string;
  tacticName: string;
  shortName: string;
  techniques: MitreTechnique[];
}

export interface MitreMatrixResult {
  tactics: MitreTactic[];
  totalTacticsActive: number;
  totalTechniquesActive: number;
  coveragePercentage: number;
  highestRiskTactic: string;
  overallRiskLevel: string;
}

const MITRE_MATRIX: Array<{ id: string; name: string; shortName: string; techniques: Array<{ id: string; name: string; desc: string }> }> = [
  {
    id: "TA0043", name: "Reconnaissance", shortName: "recon",
    techniques: [
      { id: "T1595", name: "Active Scanning", desc: "Adversary probes target infrastructure to identify vulnerabilities" },
      { id: "T1592", name: "Gather Victim Host Information", desc: "Collecting details about target hosts and configurations" },
      { id: "T1589", name: "Gather Victim Identity Information", desc: "Harvesting credentials, email addresses, employee names" },
      { id: "T1591", name: "Gather Victim Org Information", desc: "Collecting organizational details, business relationships" },
    ]
  },
  {
    id: "TA0042", name: "Resource Development", shortName: "resource_dev",
    techniques: [
      { id: "T1583", name: "Acquire Infrastructure", desc: "Obtaining domains, servers, or cloud resources for operations" },
      { id: "T1586", name: "Compromise Accounts", desc: "Hijacking existing accounts for use in operations" },
      { id: "T1588", name: "Obtain Capabilities", desc: "Acquiring tools, exploits, or malware for attacks" },
    ]
  },
  {
    id: "TA0001", name: "Initial Access", shortName: "initial_access",
    techniques: [
      { id: "T1190", name: "Exploit Public-Facing Application", desc: "Exploiting vulnerabilities in internet-facing applications" },
      { id: "T1133", name: "External Remote Services", desc: "Leveraging remote services like VPN, RDP, SSH for access" },
      { id: "T1566", name: "Phishing", desc: "Sending deceptive messages to gain initial foothold" },
      { id: "T1078", name: "Valid Accounts", desc: "Using legitimate credentials for unauthorized access" },
    ]
  },
  {
    id: "TA0002", name: "Execution", shortName: "execution",
    techniques: [
      { id: "T1059", name: "Command and Scripting Interpreter", desc: "Using scripts or command-line interfaces to execute commands" },
      { id: "T1203", name: "Exploitation for Client Execution", desc: "Exploiting software vulnerabilities to run code" },
      { id: "T1204", name: "User Execution", desc: "Relying on user interaction to execute malicious content" },
    ]
  },
  {
    id: "TA0003", name: "Persistence", shortName: "persistence",
    techniques: [
      { id: "T1098", name: "Account Manipulation", desc: "Modifying accounts to maintain access" },
      { id: "T1136", name: "Create Account", desc: "Creating new accounts for persistent access" },
      { id: "T1053", name: "Scheduled Task/Job", desc: "Using scheduled tasks for persistent execution" },
    ]
  },
  {
    id: "TA0004", name: "Privilege Escalation", shortName: "priv_esc",
    techniques: [
      { id: "T1068", name: "Exploitation for Privilege Escalation", desc: "Exploiting vulnerabilities to gain elevated access" },
      { id: "T1548", name: "Abuse Elevation Control", desc: "Bypassing elevation controls to gain higher privileges" },
    ]
  },
  {
    id: "TA0005", name: "Defense Evasion", shortName: "defense_evasion",
    techniques: [
      { id: "T1070", name: "Indicator Removal", desc: "Deleting or modifying artifacts to hide activity" },
      { id: "T1036", name: "Masquerading", desc: "Disguising malicious artifacts as legitimate" },
      { id: "T1027", name: "Obfuscated Files or Information", desc: "Encoding or encrypting content to evade detection" },
      { id: "T1656", name: "Impersonation", desc: "Using deepfakes or social engineering to impersonate trusted entities" },
    ]
  },
  {
    id: "TA0006", name: "Credential Access", shortName: "cred_access",
    techniques: [
      { id: "T1110", name: "Brute Force", desc: "Systematically guessing passwords to gain access" },
      { id: "T1555", name: "Credentials from Password Stores", desc: "Extracting credentials from browser or OS password stores" },
      { id: "T1528", name: "Steal Application Access Token", desc: "Stealing OAuth tokens or API keys" },
      { id: "T1552", name: "Unsecured Credentials", desc: "Accessing credentials stored in plaintext or weakly protected" },
    ]
  },
  {
    id: "TA0007", name: "Discovery", shortName: "discovery",
    techniques: [
      { id: "T1046", name: "Network Service Discovery", desc: "Scanning for services running on networked systems" },
      { id: "T1018", name: "Remote System Discovery", desc: "Identifying remote systems on the network" },
      { id: "T1082", name: "System Information Discovery", desc: "Gathering information about the operating system and hardware" },
    ]
  },
  {
    id: "TA0008", name: "Lateral Movement", shortName: "lateral_movement",
    techniques: [
      { id: "T1021", name: "Remote Services", desc: "Using remote services to move between systems" },
      { id: "T1080", name: "Taint Shared Content", desc: "Modifying shared resources to spread malware" },
    ]
  },
  {
    id: "TA0009", name: "Collection", shortName: "collection",
    techniques: [
      { id: "T1213", name: "Data from Information Repositories", desc: "Collecting data from shared drives, wikis, code repositories" },
      { id: "T1005", name: "Data from Local System", desc: "Collecting data from the local filesystem" },
      { id: "T1114", name: "Email Collection", desc: "Accessing and collecting email messages" },
    ]
  },
  {
    id: "TA0011", name: "Command and Control", shortName: "c2",
    techniques: [
      { id: "T1071", name: "Application Layer Protocol", desc: "Using standard protocols for C2 communication" },
      { id: "T1573", name: "Encrypted Channel", desc: "Using encryption to hide C2 traffic" },
      { id: "T1105", name: "Ingress Tool Transfer", desc: "Transferring tools from external systems" },
    ]
  },
  {
    id: "TA0010", name: "Exfiltration", shortName: "exfiltration",
    techniques: [
      { id: "T1041", name: "Exfiltration Over C2 Channel", desc: "Sending stolen data over the C2 channel" },
      { id: "T1048", name: "Exfiltration Over Alternative Protocol", desc: "Using non-standard protocols for data theft" },
    ]
  },
  {
    id: "TA0040", name: "Impact", shortName: "impact",
    techniques: [
      { id: "T1486", name: "Data Encrypted for Impact", desc: "Encrypting data to disrupt operations (ransomware)" },
      { id: "T1489", name: "Service Stop", desc: "Stopping critical services to cause disruption" },
      { id: "T1529", name: "System Shutdown/Reboot", desc: "Forcing system shutdown to disrupt operations" },
    ]
  },
];

export async function mapToMitre(): Promise<MitreMatrixResult> {
  const [breaches, infra, github, scenarios, deceptionAssets, deepfakeScans, alerts] = await Promise.all([
    storage.getBreachRecords(),
    storage.getInfraExposure(),
    storage.getGithubExposure(),
    storage.getAttackScenarios(),
    storage.getDeceptionAssets(),
    storage.getDeepfakeScans(),
    storage.getAlerts(),
  ]);

  const evidenceMap = new Map<string, { count: number; sources: string[]; severity: string }>();

  function addEvidence(techniqueId: string, source: string, severity: string = "MEDIUM") {
    const existing = evidenceMap.get(techniqueId);
    if (existing) {
      existing.count++;
      if (!existing.sources.includes(source)) existing.sources.push(source);
      const sevOrder: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      if ((sevOrder[severity] || 0) > (sevOrder[existing.severity] || 0)) existing.severity = severity;
    } else {
      evidenceMap.set(techniqueId, { count: 1, sources: [source], severity });
    }
  }

  for (const breach of breaches) {
    const sev = (breach.severity || "MEDIUM").toUpperCase();
    addEvidence("T1078", `Breach: ${breach.title}`, sev);
    addEvidence("T1589", `Breach: ${breach.title}`, sev);
    addEvidence("T1586", `Breach: ${breach.title}`, sev);
    const classes = (breach.dataClasses as string[] || []);
    if (classes.some(c => c.toLowerCase().includes("password"))) {
      addEvidence("T1110", `Breach: ${breach.title} (passwords exposed)`, "HIGH");
      addEvidence("T1552", `Breach: ${breach.title} (credentials)`, sev);
    }
    if (classes.some(c => c.toLowerCase().includes("email"))) {
      addEvidence("T1566", `Breach: ${breach.title} (emails exposed)`, sev);
      addEvidence("T1114", `Breach: ${breach.title} (email data)`, sev);
    }
  }

  for (const host of infra) {
    const ports = (host.ports as number[] || []);
    addEvidence("T1046", `Infrastructure: ${host.ip}`, "MEDIUM");
    addEvidence("T1082", `Infrastructure: ${host.ip}`, "MEDIUM");
    if (ports.includes(22) || ports.includes(3389)) {
      addEvidence("T1133", `Infrastructure: ${host.ip} (remote service port)`, "HIGH");
      addEvidence("T1021", `Infrastructure: ${host.ip} (remote access)`, "HIGH");
    }
    if (ports.includes(80) || ports.includes(443) || ports.includes(8080)) {
      addEvidence("T1190", `Infrastructure: ${host.ip} (web service)`, "MEDIUM");
    }
    const vulns = (host.vulnerabilities as any[] || []);
    for (const v of vulns) {
      addEvidence("T1190", `CVE: ${v.cve} on ${host.ip}`, "HIGH");
      addEvidence("T1068", `CVE: ${v.cve} on ${host.ip}`, "HIGH");
    }
  }

  for (const exp of github) {
    addEvidence("T1213", `GitHub: ${exp.repoUrl}`, (exp.severity || "HIGH").toUpperCase());
    addEvidence("T1552", `GitHub: ${exp.repoUrl} (${exp.secretType})`, "HIGH");
    addEvidence("T1528", `GitHub: ${exp.repoUrl} (token/key)`, "HIGH");
    addEvidence("T1005", `GitHub: ${exp.repoUrl}`, "MEDIUM");
  }

  for (const scenario of scenarios) {
    const cat = (scenario.attackCategory || "").toLowerCase();
    if (cat.includes("credential") || cat.includes("brute")) {
      addEvidence("T1110", `Attack Scenario: ${scenario.title}`, "HIGH");
    }
    if (cat.includes("exploit") || cat.includes("rce")) {
      addEvidence("T1203", `Attack Scenario: ${scenario.title}`, "CRITICAL");
    }
    if (cat.includes("phish")) {
      addEvidence("T1566", `Attack Scenario: ${scenario.title}`, "HIGH");
    }
    if (cat.includes("lateral")) {
      addEvidence("T1021", `Attack Scenario: ${scenario.title}`, "HIGH");
    }
    if (cat.includes("exfil")) {
      addEvidence("T1041", `Attack Scenario: ${scenario.title}`, "CRITICAL");
    }
    if (cat.includes("ransom") || cat.includes("encrypt")) {
      addEvidence("T1486", `Attack Scenario: ${scenario.title}`, "CRITICAL");
    }
  }

  const triggeredAssets = deceptionAssets.filter(a => a.triggered);
  for (const asset of triggeredAssets) {
    addEvidence("T1595", `Deception Trigger: ${asset.assetType} from ${asset.sourceIp}`, "HIGH");
    addEvidence("T1592", `Deception Trigger: ${asset.assetType}`, "MEDIUM");
  }

  const deepfakeThreats = deepfakeScans.filter(s => s.isDeepfake || (s.syntheticProbability && s.syntheticProbability > 50));
  for (const scan of deepfakeThreats) {
    addEvidence("T1656", `Deepfake Detection: ${scan.mediaType} (${scan.syntheticProbability}%)`, "CRITICAL");
    addEvidence("T1036", `Deepfake: synthetic ${scan.mediaType} detected`, "HIGH");
  }

  const tactics: MitreTactic[] = MITRE_MATRIX.map(tactic => {
    const techniques: MitreTechnique[] = tactic.techniques.map(tech => {
      const evidence = evidenceMap.get(tech.id);
      return {
        techniqueId: tech.id,
        techniqueName: tech.name,
        description: tech.desc,
        relevance: evidence ? (evidence.count >= 3 ? "HIGH" : evidence.count >= 1 ? "MODERATE" : "LOW") : "NONE",
        evidenceCount: evidence?.count || 0,
        sources: evidence?.sources || [],
        severity: evidence?.severity || "NONE",
      };
    });

    return {
      tacticId: tactic.id,
      tacticName: tactic.name,
      shortName: tactic.shortName,
      techniques,
    };
  });

  const activeTactics = tactics.filter(t => t.techniques.some(tech => tech.evidenceCount > 0));
  const activeTechniques = tactics.flatMap(t => t.techniques).filter(tech => tech.evidenceCount > 0);
  const totalTechniques = tactics.flatMap(t => t.techniques).length;

  let highestRiskTactic = "None";
  let maxEvidence = 0;
  for (const tactic of tactics) {
    const totalEvidence = tactic.techniques.reduce((sum, t) => sum + t.evidenceCount, 0);
    if (totalEvidence > maxEvidence) {
      maxEvidence = totalEvidence;
      highestRiskTactic = tactic.tacticName;
    }
  }

  const coveragePercentage = Math.round((activeTechniques.length / totalTechniques) * 100);
  let overallRiskLevel = "LOW";
  if (coveragePercentage >= 60) overallRiskLevel = "CRITICAL";
  else if (coveragePercentage >= 40) overallRiskLevel = "HIGH";
  else if (coveragePercentage >= 20) overallRiskLevel = "MODERATE";

  return {
    tactics,
    totalTacticsActive: activeTactics.length,
    totalTechniquesActive: activeTechniques.length,
    coveragePercentage,
    highestRiskTactic,
    overallRiskLevel,
  };
}
