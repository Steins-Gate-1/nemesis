import { retryFetch } from "./utils";
import { githubSecretSeverity, type SeverityLevel } from "./severity";

export interface GithubExposureResult {
  repoUrl: string;
  secretType: string;
  snippet: string;
  severity: SeverityLevel;
}

export interface GithubModuleResult {
  success: boolean;
  exposures: GithubExposureResult[];
  error?: string;
}

const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/i },
  { name: "AWS Secret Key", regex: /aws_secret_access_key\s*[=:]\s*\S+/i },
  { name: "Private Key", regex: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i },
  { name: "API Token", regex: /api[_-]?token\s*[=:]\s*['"]\S+['"]/i },
  { name: "API Key", regex: /api[_-]?key\s*[=:]\s*['"]\S+['"]/i },
  { name: "Database URL", regex: /DATABASE_URL\s*[=:]\s*\S+/i },
  { name: "Password", regex: /password\s*[=:]\s*['"]\S+['"]/i },
  { name: "Secret Key", regex: /secret[_-]?key\s*[=:]\s*['"]\S+['"]/i },
  { name: "Auth Token", regex: /auth[_-]?token\s*[=:]\s*['"]\S+['"]/i },
];

export async function queryGithub(domain: string): Promise<GithubModuleResult> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "NEMESIS-CyberDefense",
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  try {
    const searchQuery = encodeURIComponent(`"${domain}" in:file`);
    const response = await retryFetch(
      `https://api.github.com/search/code?q=${searchQuery}&per_page=30`,
      { headers, timeout: 10000 }
    );

    if (response.status === 403 || response.status === 422) {
      return {
        success: false,
        exposures: [],
        error: `GitHub API returned ${response.status}. ${!token ? "Set GITHUB_TOKEN for authenticated requests." : "Rate limit may be exceeded."}`,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        exposures: [],
        error: `GitHub search returned ${response.status}`,
      };
    }

    const data: any = await response.json();
    const exposures: GithubExposureResult[] = [];

    for (const item of (data.items || []).slice(0, 20)) {
      const repoUrl = item.repository?.html_url || item.html_url || "";
      const fileName = item.name || "";
      const filePath = item.path || "";

      for (const pattern of SECRET_PATTERNS) {
        if (
          pattern.regex.test(fileName) ||
          pattern.regex.test(filePath) ||
          filePath.endsWith(".env") ||
          filePath.endsWith(".env.local") ||
          filePath.endsWith(".pem") ||
          filePath.endsWith(".key")
        ) {
          exposures.push({
            repoUrl: item.html_url || repoUrl,
            secretType: pattern.name,
            snippet: `File: ${filePath}`,
            severity: githubSecretSeverity(pattern.name),
          });
          break;
        }
      }

      const sensitiveFiles = [".env", ".env.local", ".env.production", "id_rsa", ".pem", ".key", "credentials"];
      if (sensitiveFiles.some((sf) => filePath.toLowerCase().includes(sf))) {
        if (!exposures.find((e) => e.repoUrl === (item.html_url || repoUrl))) {
          exposures.push({
            repoUrl: item.html_url || repoUrl,
            secretType: "Sensitive File Exposure",
            snippet: `Sensitive file found: ${filePath}`,
            severity: "HIGH",
          });
        }
      }
    }

    return { success: true, exposures };
  } catch (err: any) {
    return {
      success: false,
      exposures: [],
      error: `GitHub query failed: ${err.message}`,
    };
  }
}
