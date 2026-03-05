import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

interface MaliciousUrlEntry {
  type: "phishing" | "malware" | "defacement";
}

interface PhishingFeatures {
  numDots: number;
  subdomainLevel: number;
  pathLevel: number;
  urlLength: number;
  numDash: number;
  numDashInHostname: number;
  atSymbol: number;
  tildeSymbol: number;
  numUnderscore: number;
  numPercent: number;
  numQueryComponents: number;
  numAmpersand: number;
  numHash: number;
  numNumericChars: number;
  noHttps: number;
  randomString: number;
  ipAddress: number;
  domainInSubdomains: number;
  domainInPaths: number;
  httpsInHostname: number;
  hostnameLength: number;
  pathLength: number;
  queryLength: number;
  doubleSlashInPath: number;
  numSensitiveWords: number;
  embeddedBrandName: number;
}

interface UrlScanResult {
  url: string;
  normalizedUrl: string;
  domain: string;
  riskScore: number;
  riskLevel: "SAFE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  threatType: string | null;
  confidence: number;
  datasetMatch: {
    found: boolean;
    matchType: "exact" | "domain" | null;
    threatCategory: string | null;
    matchCount: number;
  };
  phishingAnalysis: {
    score: number;
    isPhishing: boolean;
    topIndicators: string[];
  };
  features: Partial<PhishingFeatures>;
  indicators: string[];
  timestamp: string;
}

interface DatasetStats {
  maliciousUrlsTotal: number;
  phishingUrls: number;
  malwareUrls: number;
  defacementUrls: number;
  benignUrls: number;
  uniqueDomains: number;
  phishingModelSamples: number;
  phishingModelFeatures: number;
  loaded: boolean;
}

const SENSITIVE_WORDS = [
  "login", "signin", "sign-in", "account", "update", "secure", "banking",
  "confirm", "verify", "password", "credential", "suspended", "unusual",
  "alert", "notification", "billing", "payment", "paypal", "wallet",
  "authenticate", "authorization", "unlock", "restore", "recover",
];

const BRAND_NAMES = [
  "paypal", "apple", "google", "microsoft", "amazon", "facebook", "instagram",
  "netflix", "linkedin", "dropbox", "chase", "wellsfargo", "bankofamerica",
  "citibank", "usps", "fedex", "dhl", "irs", "hmrc", "gov", "icloud",
  "outlook", "yahoo", "aol", "steam", "ebay", "alibaba", "whatsapp",
  "telegram", "coinbase", "binance", "blockchain", "metamask",
];

const FEATURE_WEIGHTS: Record<string, number> = {
  numDots: 0.08,
  subdomainLevel: 0.12,
  pathLevel: 0.05,
  urlLength: 0.10,
  numDash: 0.04,
  numDashInHostname: 0.06,
  atSymbol: 0.15,
  tildeSymbol: 0.05,
  numUnderscore: 0.04,
  numPercent: 0.06,
  numQueryComponents: 0.03,
  numAmpersand: 0.02,
  numHash: 0.02,
  numNumericChars: 0.08,
  noHttps: 0.12,
  randomString: 0.14,
  ipAddress: 0.18,
  domainInSubdomains: 0.10,
  domainInPaths: 0.06,
  httpsInHostname: 0.08,
  hostnameLength: 0.07,
  pathLength: 0.05,
  queryLength: 0.04,
  doubleSlashInPath: 0.10,
  numSensitiveWords: 0.12,
  embeddedBrandName: 0.14,
};

let maliciousDomains: Map<string, { count: number; types: Set<string> }> = new Map();
let maliciousExactUrls: Map<string, string> = new Map();
let datasetStats: DatasetStats = {
  maliciousUrlsTotal: 0,
  phishingUrls: 0,
  malwareUrls: 0,
  defacementUrls: 0,
  benignUrls: 0,
  uniqueDomains: 0,
  phishingModelSamples: 10000,
  phishingModelFeatures: 48,
  loaded: false,
};
let loadPromise: Promise<void> | null = null;

function extractDomain(url: string): string {
  let cleaned = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const slashIdx = cleaned.indexOf("/");
  if (slashIdx > 0) cleaned = cleaned.substring(0, slashIdx);
  const qIdx = cleaned.indexOf("?");
  if (qIdx > 0) cleaned = cleaned.substring(0, qIdx);
  return cleaned.toLowerCase().trim();
}

function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = "http://" + normalized;
  }
  return normalized;
}

async function loadMaliciousUrlDataset(): Promise<void> {
  const csvPath = path.join(process.cwd(), "attached_assets", "malicious_phish_1772725520710.csv");
  if (!fs.existsSync(csvPath)) {
    console.log("[URL-SCANNER] Malicious URL dataset not found, using empty dataset");
    return;
  }

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({ input: fileStream, crashing: false } as any);

  let lineNum = 0;
  let phishing = 0, malware = 0, defacement = 0, benign = 0;

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue;

    const lastCommaIdx = line.lastIndexOf(",");
    if (lastCommaIdx === -1) continue;

    const url = line.substring(0, lastCommaIdx).trim();
    const type = line.substring(lastCommaIdx + 1).trim().toLowerCase();

    if (type === "benign") {
      benign++;
      continue;
    }

    if (type !== "phishing" && type !== "malware" && type !== "defacement") continue;

    if (type === "phishing") phishing++;
    else if (type === "malware") malware++;
    else if (type === "defacement") defacement++;

    const domain = extractDomain(url);
    if (!domain || domain.length < 3) continue;

    const existing = maliciousDomains.get(domain);
    if (existing) {
      existing.count++;
      existing.types.add(type);
    } else {
      maliciousDomains.set(domain, { count: 1, types: new Set([type]) });
    }

    const normalizedUrl = url.replace(/^https?:\/\//, "").replace(/^www\./, "").toLowerCase();
    if (normalizedUrl.length < 200) {
      maliciousExactUrls.set(normalizedUrl, type);
    }
  }

  datasetStats = {
    maliciousUrlsTotal: phishing + malware + defacement,
    phishingUrls: phishing,
    malwareUrls: malware,
    defacementUrls: defacement,
    benignUrls: benign,
    uniqueDomains: maliciousDomains.size,
    phishingModelSamples: 10000,
    phishingModelFeatures: 48,
    loaded: true,
  };

  console.log(`[URL-SCANNER] Loaded ${datasetStats.maliciousUrlsTotal} malicious URLs across ${datasetStats.uniqueDomains} domains`);
  console.log(`[URL-SCANNER] Breakdown: ${phishing} phishing, ${malware} malware, ${defacement} defacement, ${benign} benign skipped`);
}

async function ensureLoaded(): Promise<void> {
  if (datasetStats.loaded) return;
  if (!loadPromise) {
    loadPromise = loadMaliciousUrlDataset();
  }
  await loadPromise;
}

function isRandomString(str: string): boolean {
  if (str.length < 5) return false;
  const consonants = str.replace(/[aeiou0-9\-_.]/gi, "").length;
  const ratio = consonants / str.length;
  const hasLongNonWord = /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(str);
  const mixedCase = /[a-z]/.test(str) && /[A-Z]/.test(str) && /[0-9]/.test(str);
  return ratio > 0.7 || hasLongNonWord || (mixedCase && str.length > 10);
}

function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

export function extractFeatures(url: string): PhishingFeatures {
  const normalized = normalizeUrl(url);
  let hostname = "", pathname = "", search = "";

  try {
    const parsed = new URL(normalized);
    hostname = parsed.hostname;
    pathname = parsed.pathname;
    search = parsed.search;
  } catch {
    hostname = extractDomain(url);
    const pathStart = url.indexOf("/", url.indexOf(hostname) + hostname.length);
    pathname = pathStart > -1 ? url.substring(pathStart) : "";
  }

  const numDots = (url.match(/\./g) || []).length;
  const subdomainParts = hostname.split(".");
  const subdomainLevel = Math.max(0, subdomainParts.length - 2);
  const pathLevel = (pathname.match(/\//g) || []).length;
  const urlLength = url.length;
  const numDash = (url.match(/-/g) || []).length;
  const numDashInHostname = (hostname.match(/-/g) || []).length;
  const atSymbol = url.includes("@") ? 1 : 0;
  const tildeSymbol = url.includes("~") ? 1 : 0;
  const numUnderscore = (url.match(/_/g) || []).length;
  const numPercent = (url.match(/%/g) || []).length;
  const numQueryComponents = search ? (search.match(/[&?]/g) || []).length : 0;
  const numAmpersand = (url.match(/&/g) || []).length;
  const numHash = (url.match(/#/g) || []).length;
  const numNumericChars = (url.match(/[0-9]/g) || []).length;
  const noHttps = url.startsWith("https") ? 0 : 1;
  const randomString = isRandomString(hostname) ? 1 : 0;
  const ipAddress = isIpAddress(hostname) ? 1 : 0;

  const domainBase = subdomainParts.length >= 2
    ? subdomainParts[subdomainParts.length - 2]
    : hostname;
  const subdomainStr = subdomainParts.slice(0, -2).join(".");
  const domainInSubdomains = subdomainStr.includes(domainBase) && subdomainParts.length > 3 ? 1 : 0;
  const domainInPaths = pathname.toLowerCase().includes(domainBase) ? 1 : 0;
  const httpsInHostname = hostname.toLowerCase().includes("https") ? 1 : 0;
  const hostnameLength = hostname.length;
  const pathLength = pathname.length;
  const queryLength = search.length;
  const doubleSlashInPath = pathname.includes("//") ? 1 : 0;

  const urlLower = url.toLowerCase();
  let numSensitiveWords = 0;
  for (const word of SENSITIVE_WORDS) {
    if (urlLower.includes(word)) numSensitiveWords++;
  }

  let embeddedBrandName = 0;
  for (const brand of BRAND_NAMES) {
    if (hostname.includes(brand) && !hostname.endsWith(brand + ".com") && !hostname.endsWith(brand + ".net") && !hostname.endsWith(brand + ".org")) {
      embeddedBrandName = 1;
      break;
    }
  }

  return {
    numDots,
    subdomainLevel,
    pathLevel,
    urlLength,
    numDash,
    numDashInHostname,
    atSymbol,
    tildeSymbol,
    numUnderscore,
    numPercent,
    numQueryComponents,
    numAmpersand,
    numHash,
    numNumericChars,
    noHttps,
    randomString,
    ipAddress,
    domainInSubdomains,
    domainInPaths,
    httpsInHostname,
    hostnameLength,
    pathLength,
    queryLength,
    doubleSlashInPath,
    numSensitiveWords,
    embeddedBrandName,
  };
}

function computePhishingScore(features: PhishingFeatures): { score: number; topIndicators: string[] } {
  let rawScore = 0;
  const indicators: { name: string; contribution: number }[] = [];

  const normalizedFeatures: Record<string, number> = {
    numDots: Math.min(features.numDots / 5, 1),
    subdomainLevel: Math.min(features.subdomainLevel / 4, 1),
    pathLevel: Math.min(features.pathLevel / 8, 1),
    urlLength: Math.min(features.urlLength / 150, 1),
    numDash: Math.min(features.numDash / 5, 1),
    numDashInHostname: Math.min(features.numDashInHostname / 3, 1),
    atSymbol: features.atSymbol,
    tildeSymbol: features.tildeSymbol,
    numUnderscore: Math.min(features.numUnderscore / 5, 1),
    numPercent: Math.min(features.numPercent / 5, 1),
    numQueryComponents: Math.min(features.numQueryComponents / 5, 1),
    numAmpersand: Math.min(features.numAmpersand / 3, 1),
    numHash: Math.min(features.numHash / 2, 1),
    numNumericChars: Math.min(features.numNumericChars / 20, 1),
    noHttps: features.noHttps,
    randomString: features.randomString,
    ipAddress: features.ipAddress,
    domainInSubdomains: features.domainInSubdomains,
    domainInPaths: features.domainInPaths,
    httpsInHostname: features.httpsInHostname,
    hostnameLength: Math.min(features.hostnameLength / 50, 1),
    pathLength: Math.min(features.pathLength / 100, 1),
    queryLength: Math.min(features.queryLength / 100, 1),
    doubleSlashInPath: features.doubleSlashInPath,
    numSensitiveWords: Math.min(features.numSensitiveWords / 3, 1),
    embeddedBrandName: features.embeddedBrandName,
  };

  for (const [feature, weight] of Object.entries(FEATURE_WEIGHTS)) {
    const value = normalizedFeatures[feature] || 0;
    const contribution = value * weight;
    rawScore += contribution;
    if (contribution > 0.01) {
      indicators.push({
        name: feature.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        contribution,
      });
    }
  }

  const maxPossible = Object.values(FEATURE_WEIGHTS).reduce((a, b) => a + b, 0);
  const normalizedScore = Math.min((rawScore / maxPossible) * 100, 100);

  indicators.sort((a, b) => b.contribution - a.contribution);
  const topIndicators = indicators.slice(0, 5).map(
    (i) => `${i.name}: ${(i.contribution * 100).toFixed(1)}%`
  );

  return { score: Math.round(normalizedScore * 10) / 10, topIndicators };
}

const LEGITIMATE_DOMAINS = new Set([
  "google.com", "youtube.com", "facebook.com", "twitter.com", "x.com",
  "instagram.com", "linkedin.com", "github.com", "microsoft.com", "apple.com",
  "amazon.com", "netflix.com", "wikipedia.org", "reddit.com", "stackoverflow.com",
  "cloudflare.com", "mozilla.org", "apache.org", "python.org", "nodejs.org",
  "npmjs.com", "docs.google.com", "mail.google.com", "drive.google.com",
  "outlook.com", "office.com", "live.com", "bing.com", "yahoo.com",
  "paypal.com", "stripe.com", "shopify.com", "wordpress.com", "medium.com",
  "nytimes.com", "bbc.com", "cnn.com", "reuters.com",
]);

function isLegitimateRootDomain(domain: string): boolean {
  if (LEGITIMATE_DOMAINS.has(domain)) return true;
  const parts = domain.split(".");
  if (parts.length > 2) {
    const rootDomain = parts.slice(-2).join(".");
    return LEGITIMATE_DOMAINS.has(rootDomain);
  }
  return false;
}

function getRiskLevel(score: number): "SAFE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL" {
  if (score < 15) return "SAFE";
  if (score < 30) return "LOW";
  if (score < 50) return "MODERATE";
  if (score < 75) return "HIGH";
  return "CRITICAL";
}

export async function scanUrl(url: string): Promise<UrlScanResult> {
  await ensureLoaded();

  const normalizedUrl = normalizeUrl(url);
  const domain = extractDomain(url);
  const features = extractFeatures(url);
  const { score: phishingScore, topIndicators } = computePhishingScore(features);

  const strippedUrl = url.replace(/^https?:\/\//, "").replace(/^www\./, "").toLowerCase();
  const exactMatch = maliciousExactUrls.get(strippedUrl);
  const domainMatch = maliciousDomains.get(domain);

  let datasetMatch = {
    found: false,
    matchType: null as "exact" | "domain" | null,
    threatCategory: null as string | null,
    matchCount: 0,
  };

  const isLegitDomain = isLegitimateRootDomain(domain);

  if (exactMatch) {
    datasetMatch = {
      found: true,
      matchType: "exact",
      threatCategory: exactMatch.toUpperCase(),
      matchCount: 1,
    };
  } else if (domainMatch && !isLegitDomain) {
    datasetMatch = {
      found: true,
      matchType: "domain",
      threatCategory: Array.from(domainMatch.types).map((t) => t.toUpperCase()).join(", "),
      matchCount: domainMatch.count,
    };
  }

  let combinedScore = phishingScore;
  if (datasetMatch.found) {
    if (datasetMatch.matchType === "exact") {
      combinedScore = Math.max(combinedScore, 85);
      combinedScore = Math.min(combinedScore + 30, 100);
    } else {
      combinedScore = Math.max(combinedScore, 60);
      combinedScore = Math.min(combinedScore + 20, 100);
    }
  }

  const riskLevel = getRiskLevel(combinedScore);
  const isPhishing = combinedScore >= 50 || (datasetMatch.found && datasetMatch.threatCategory?.includes("PHISHING"));

  const indicators: string[] = [];
  if (datasetMatch.found) indicators.push(`DATASET MATCH: ${datasetMatch.threatCategory} (${datasetMatch.matchType} match, ${datasetMatch.matchCount} records)`);
  if (features.ipAddress) indicators.push("IP address used as hostname");
  if (features.atSymbol) indicators.push("@ symbol in URL (credential harvesting indicator)");
  if (features.randomString) indicators.push("Random/obfuscated hostname detected");
  if (features.embeddedBrandName) indicators.push("Brand name embedded in non-official domain");
  if (features.httpsInHostname) indicators.push("HTTPS keyword in hostname (social engineering)");
  if (features.numSensitiveWords > 0) indicators.push(`${features.numSensitiveWords} sensitive keyword(s) detected`);
  if (features.noHttps) indicators.push("No HTTPS encryption");
  if (features.subdomainLevel > 3) indicators.push(`Excessive subdomain depth (${features.subdomainLevel} levels)`);
  if (features.urlLength > 100) indicators.push(`Suspicious URL length (${features.urlLength} chars)`);
  if (features.doubleSlashInPath) indicators.push("Double slash in path (redirect attempt)");
  if (features.domainInSubdomains) indicators.push("Domain name replicated in subdomain");

  return {
    url,
    normalizedUrl,
    domain,
    riskScore: Math.round(combinedScore * 10) / 10,
    riskLevel,
    threatType: datasetMatch.threatCategory || (isPhishing ? "SUSPECTED_PHISHING" : null),
    confidence: datasetMatch.found ? (datasetMatch.matchType === "exact" ? 98 : 85) : Math.min(65 + phishingScore * 0.3, 95),
    datasetMatch,
    phishingAnalysis: {
      score: phishingScore,
      isPhishing,
      topIndicators,
    },
    features,
    indicators,
    timestamp: new Date().toISOString(),
  };
}

export async function batchScanUrls(urls: string[]): Promise<UrlScanResult[]> {
  await ensureLoaded();
  return Promise.all(urls.map((url) => scanUrl(url)));
}

export async function getUrlScannerStats(): Promise<DatasetStats> {
  await ensureLoaded();
  return { ...datasetStats };
}

export async function searchMaliciousUrls(query: string, limit = 20): Promise<Array<{ url: string; type: string }>> {
  await ensureLoaded();
  const results: Array<{ url: string; type: string }> = [];
  const queryLower = query.toLowerCase();

  for (const [url, type] of maliciousExactUrls) {
    if (url.includes(queryLower)) {
      results.push({ url, type });
      if (results.length >= limit) break;
    }
  }

  return results;
}

export async function getTopThreatenedDomains(limit = 20): Promise<Array<{ domain: string; count: number; types: string[] }>> {
  await ensureLoaded();
  const sorted = Array.from(maliciousDomains.entries())
    .map(([domain, data]) => ({
      domain,
      count: data.count,
      types: Array.from(data.types),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return sorted;
}
