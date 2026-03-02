export const SEVERITY_VALUES = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 6,
  CRITICAL: 10,
} as const;

export type SeverityLevel = keyof typeof SEVERITY_VALUES;

export function classifyScore(totalScore: number): SeverityLevel {
  if (totalScore >= 30) return "CRITICAL";
  if (totalScore >= 15) return "HIGH";
  if (totalScore >= 5) return "MEDIUM";
  return "LOW";
}

export function classifyExposureLevel(score: number): string {
  if (score >= 30) return "CRITICAL";
  if (score >= 15) return "HIGH";
  if (score >= 5) return "MODERATE";
  return "LOW";
}

export function portSeverity(port: number): SeverityLevel {
  const criticalPorts = [27017, 3306, 5432, 1433, 6379, 9200, 11211];
  const highPorts = [21, 23, 445, 135, 139, 3389, 5900];
  const mediumPorts = [22, 25, 110, 143, 8080, 8443];

  if (criticalPorts.includes(port)) return "CRITICAL";
  if (highPorts.includes(port)) return "HIGH";
  if (mediumPorts.includes(port)) return "MEDIUM";
  return "LOW";
}

export function breachSeverity(dataClasses: string[]): SeverityLevel {
  const criticalClasses = ["passwords", "credit cards", "bank accounts", "social security numbers"];
  const highClasses = ["email addresses", "phone numbers", "ip addresses", "usernames"];

  const lower = dataClasses.map(d => d.toLowerCase());
  if (lower.some(d => criticalClasses.some(c => d.includes(c)))) return "CRITICAL";
  if (lower.some(d => highClasses.some(c => d.includes(c)))) return "HIGH";
  return "MEDIUM";
}

export function githubSecretSeverity(secretType: string): SeverityLevel {
  const critical = ["private key", "aws_secret", "aws_access", "database_url", "password"];
  const high = ["api_key", "api_token", "secret_key", "auth_token"];
  const medium = ["config", "env", "credentials"];

  const lower = secretType.toLowerCase();
  if (critical.some(c => lower.includes(c))) return "CRITICAL";
  if (high.some(c => lower.includes(c))) return "HIGH";
  if (medium.some(c => lower.includes(c))) return "MEDIUM";
  return "LOW";
}
