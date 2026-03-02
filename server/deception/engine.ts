import { storage } from "../storage";
import crypto from "crypto";

export const TOKEN_TYPES = [
  { id: "aws_key", label: "AWS API Key", icon: "key", description: "Fake AWS access key planted in config files" },
  { id: "url_token", label: "Generic URL Token", icon: "link", description: "Trackable URL that triggers on access" },
  { id: "ms_word", label: "MS Word Document", icon: "file-text", description: "Instrumented Word document with beacon" },
  { id: "pdf", label: "PDF Document", icon: "file", description: "PDF with embedded tracking pixel" },
  { id: "dns_token", label: "DNS Token", icon: "globe", description: "Subdomain that resolves and logs access" },
  { id: "smtp_token", label: "SMTP Token", icon: "mail", description: "Email address that logs all received mail" },
] as const;

export const PLACEMENT_LOCATIONS = [
  "Private Git Repository",
  "Cloud Config File (S3/GCS)",
  "Internal Shared Drive",
  "Employee Onboarding Documents",
  "CI/CD Pipeline Config",
  "Internal Wiki / Confluence",
  "Fake Credential Store",
  "Partner API Documentation",
] as const;

function generateTokenId(): string {
  return `NEM-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

function generateTokenValue(tokenType: string): string {
  switch (tokenType) {
    case "aws_key":
      return `AKIA${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    case "url_token":
      return `https://nemesis-canary.internal/t/${crypto.randomBytes(12).toString("hex")}`;
    case "ms_word":
      return `NEMESIS_Intel_Report_${Date.now()}.docx`;
    case "pdf":
      return `NEMESIS_Classified_Brief_${Date.now()}.pdf`;
    case "dns_token":
      return `${crypto.randomBytes(4).toString("hex")}.canary.nemesis.internal`;
    case "smtp_token":
      return `trap-${crypto.randomBytes(4).toString("hex")}@nemesis-canary.internal`;
    default:
      return `token-${crypto.randomBytes(8).toString("hex")}`;
  }
}

export async function deployHoneytoken(
  tokenType: string,
  placementLocation: string
): Promise<any> {
  const tokenId = generateTokenId();
  const tokenValue = generateTokenValue(tokenType);

  const asset = await storage.createDeceptionAsset({
    tokenId,
    assetType: tokenType,
    placementLocation,
    status: "ACTIVE",
    url: tokenValue,
    triggered: false,
    severityLevel: "HIGH",
    triggerCount: 0,
  });

  await storage.createAuditLog({
    action: "Honeytoken Deployed",
    user: "OPERATOR",
    details: `Token ${tokenId} (${tokenType}) deployed to: ${placementLocation}. Value: ${tokenValue}`,
  });

  return asset;
}

export async function processWebhookTrigger(payload: {
  tokenId: string;
  sourceIp: string;
  userAgent: string;
  geoLocation?: string;
}): Promise<{ asset: any; alert: any; correlationResult: any }> {
  const asset = await storage.getDeceptionAssetByTokenId(payload.tokenId);
  if (!asset) {
    throw new Error(`Unknown token: ${payload.tokenId}`);
  }

  const updatedAsset = await storage.triggerDeceptionAsset(asset.id, {
    sourceIp: payload.sourceIp,
    userAgent: payload.userAgent,
    geoLocation: payload.geoLocation || "Unknown",
  });

  await storage.createAuditLog({
    action: "Honeytoken Triggered",
    user: "SYSTEM",
    details: `Token ${payload.tokenId} (${asset.assetType}) triggered from IP: ${payload.sourceIp}, UA: ${payload.userAgent}, Location: ${payload.geoLocation || "Unknown"}`,
  });

  const correlationResult = await runCorrelation();

  const severity = correlationResult.multipleTriggered ? "CRITICAL" : "HIGH";
  const alert = await storage.createAlert({
    title: `ACTIVE TARGETING: Honeytoken ${payload.tokenId} Triggered`,
    description: `Deception asset (${asset.assetType}) at "${asset.placementLocation || "Unknown"}" was accessed from ${payload.sourceIp}. ${correlationResult.multipleTriggered ? "MULTIPLE tokens triggered — coordinated reconnaissance detected." : "Single token trigger — initial reconnaissance detected."}`,
    severity,
    isRead: false,
  });

  await boostRiskScores(15);

  return { asset: updatedAsset, alert, correlationResult };
}

async function boostRiskScores(boost: number): Promise<void> {
  const scores = await storage.getRiskScores();
  for (const score of scores) {
    const newOverall = Math.min(100, score.overallScore + boost);
    let classification = "Low";
    if (newOverall >= 60) classification = "CRITICAL";
    else if (newOverall >= 35) classification = "HIGH";
    else if (newOverall >= 15) classification = "MODERATE";

    await storage.updateRiskScore(score.id, {
      overallScore: newOverall,
      classification,
    });
  }
}

export interface CorrelationResult {
  activeTokens: number;
  triggeredTokens: number;
  multipleTriggered: boolean;
  riskEscalation: string;
  correlations: Array<{
    type: string;
    trigger_source: string;
    risk_level: string;
    recommended_action: string;
  }>;
}

export async function runCorrelation(): Promise<CorrelationResult> {
  const assets = await storage.getDeceptionAssets();
  const activeTokens = assets.filter(a => a.status === "ACTIVE" || a.status === "TRIGGERED");
  const triggeredTokens = assets.filter(a => a.triggered);
  const multipleTriggered = triggeredTokens.length > 1;

  const correlations: CorrelationResult["correlations"] = [];

  for (const t of triggeredTokens) {
    correlations.push({
      type: "ACTIVE_TARGETING",
      trigger_source: `${t.assetType} at ${t.placementLocation || "Unknown"}`,
      risk_level: multipleTriggered ? "CRITICAL" : "HIGH",
      recommended_action: multipleTriggered
        ? "Initiate incident response. Lock down affected systems. Rotate all credentials."
        : "Investigate source IP. Review access logs. Consider credential rotation.",
    });
  }

  return {
    activeTokens: activeTokens.length,
    triggeredTokens: triggeredTokens.length,
    multipleTriggered,
    riskEscalation: multipleTriggered ? "CRITICAL" : triggeredTokens.length > 0 ? "HIGH" : "NOMINAL",
    correlations,
  };
}

const FIRST_NAMES = ["Alex", "Jordan", "Morgan", "Casey", "Taylor", "Riley", "Quinn", "Blake", "Avery", "Cameron"];
const LAST_NAMES = ["Sterling", "Blackwood", "Ashworth", "Thornton", "Mercer", "Prescott", "Dalton", "Hartwell", "Langford", "Whitmore"];
const ROLES = ["Senior Cloud Engineer", "DevOps Lead", "Security Analyst", "Infrastructure Manager", "Platform Engineer", "Site Reliability Engineer", "Network Architect", "Systems Administrator"];
const DEPARTMENTS = ["Engineering", "Security Operations", "Cloud Infrastructure", "IT Operations", "Platform Engineering", "DevSecOps"];
const CONTEXTS = ["Listed on internal engineering wiki", "Added to CI/CD pipeline contacts", "Planted in partner API documentation", "Registered on internal Slack workspace", "Added to cloud IAM group as inactive user"];

export async function generateHoneyPersona(
  contextOverride?: string
): Promise<any> {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const role = ROLES[Math.floor(Math.random() * ROLES.length)];
  const department = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
  const context = contextOverride || CONTEXTS[Math.floor(Math.random() * CONTEXTS.length)];
  const emailHandle = `${firstName.toLowerCase()}.${lastName.toLowerCase()}-${crypto.randomBytes(2).toString("hex")}`;

  const persona = await storage.createHoneyPersona({
    name: `${firstName} ${lastName}`,
    role,
    decoyEmail: `${emailHandle}@nemesis-decoy.internal`,
    department,
    deploymentContext: context,
    status: "ACTIVE",
  });

  await storage.createAuditLog({
    action: "Honey Persona Created",
    user: "OPERATOR",
    details: `Persona "${firstName} ${lastName}" (${role}) deployed. Context: ${context}. Note: All deception assets are inert detection mechanisms.`,
  });

  return persona;
}

export function getDeceptionStats(assets: any[], personas: any[]) {
  const active = assets.filter(a => a.status === "ACTIVE").length;
  const triggered = assets.filter(a => a.triggered).length;
  const total = assets.length;
  const activePersonas = personas.filter(p => p.status === "ACTIVE").length;

  return {
    totalDeployed: total,
    activeTokens: active,
    triggeredTokens: triggered,
    activePersonas,
    threatLevel: triggered > 1 ? "CRITICAL" : triggered > 0 ? "HIGH" : "NOMINAL",
  };
}
