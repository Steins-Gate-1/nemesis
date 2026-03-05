import { retryFetch } from "./utils";

export interface CVEResult {
  cveId: string;
  description: string;
  cvssScore: number;
  severity: string;
  publishedDate: string;
  lastModified: string;
  references: string[];
  weaknesses: string[];
  attackVector: string;
  attackComplexity: string;
}

const cveCache = new Map<string, { data: CVEResult; timestamp: number }>();
const CACHE_TTL = 3600000;

export async function lookupCVE(cveId: string): Promise<CVEResult | null> {
  const normalized = cveId.toUpperCase().trim();
  if (!/^CVE-\d{4}-\d{4,}$/.test(normalized)) {
    return null;
  }

  const cached = cveCache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await retryFetch(
      `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${normalized}`,
      {
        headers: { "User-Agent": "NEMESIS-CyberDefense/1.0" },
        timeout: 10000,
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const vuln = data.vulnerabilities?.[0]?.cve;
    if (!vuln) return null;

    const metrics = vuln.metrics?.cvssMetricV31?.[0]?.cvssData
      || vuln.metrics?.cvssMetricV30?.[0]?.cvssData
      || vuln.metrics?.cvssMetricV2?.[0]?.cvssData;

    const cvssScore = metrics?.baseScore ?? 0;
    let severity = "LOW";
    if (cvssScore >= 9.0) severity = "CRITICAL";
    else if (cvssScore >= 7.0) severity = "HIGH";
    else if (cvssScore >= 4.0) severity = "MEDIUM";

    const description = vuln.descriptions?.find((d: any) => d.lang === "en")?.value || "No description available";

    const references = (vuln.references || []).slice(0, 5).map((r: any) => r.url);
    const weaknesses = (vuln.weaknesses || [])
      .flatMap((w: any) => w.description || [])
      .filter((d: any) => d.lang === "en")
      .map((d: any) => d.value);

    const result: CVEResult = {
      cveId: normalized,
      description,
      cvssScore,
      severity,
      publishedDate: vuln.published || "",
      lastModified: vuln.lastModified || "",
      references,
      weaknesses,
      attackVector: metrics?.attackVector || "UNKNOWN",
      attackComplexity: metrics?.attackComplexity || "UNKNOWN",
    };

    cveCache.set(normalized, { data: result, timestamp: Date.now() });
    return result;
  } catch (err: any) {
    console.error(`[CVE] Failed to lookup ${normalized}:`, err.message);
    return null;
  }
}

export async function enrichVulnerabilities(
  hosts: Array<{ ip: string; vulnerabilities: Array<{ cve: string; summary?: string }> }>
): Promise<Array<{ ip: string; cve: CVEResult }>> {
  const results: Array<{ ip: string; cve: CVEResult }> = [];
  const seen = new Set<string>();

  for (const host of hosts) {
    for (const vuln of (host.vulnerabilities || [])) {
      const cveId = vuln.cve;
      if (seen.has(cveId)) continue;
      seen.add(cveId);

      const enriched = await lookupCVE(cveId);
      if (enriched) {
        results.push({ ip: host.ip, cve: enriched });
      }

      await new Promise(r => setTimeout(r, 600));
    }
  }

  return results;
}
