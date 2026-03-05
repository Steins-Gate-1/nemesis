import { storage } from "../storage";

export interface GeoThreatPoint {
  lat: number;
  lng: number;
  type: "breach" | "infrastructure" | "deception" | "attack";
  severity: string;
  label: string;
  details: string;
  timestamp: string;
}

const COUNTRY_COORDS: Record<string, [number, number]> = {
  "US": [39.8, -98.5], "CN": [35.8, 104.1], "RU": [61.5, 105.3],
  "DE": [51.1, 10.4], "GB": [55.3, -3.4], "FR": [46.2, 2.2],
  "JP": [36.2, 138.2], "IN": [20.5, 78.9], "BR": [-14.2, -51.9],
  "AU": [-25.2, 133.7], "CA": [56.1, -106.3], "KR": [35.9, 127.7],
  "NL": [52.1, 5.2], "SE": [60.1, 18.6], "SG": [1.3, 103.8],
  "UA": [48.3, 31.1], "IL": [31.0, 34.8], "TR": [38.9, 35.2],
  "IR": [32.4, 53.6], "KP": [40.3, 127.5], "PL": [51.9, 19.1],
  "IT": [41.8, 12.5], "ES": [40.4, -3.7], "ZA": [-30.5, 22.9],
  "MX": [23.6, -102.5], "AR": [-38.4, -63.6], "EG": [26.8, 30.8],
  "SA": [23.8, 45.0], "AE": [23.4, 53.8], "PK": [30.3, 69.3],
  "NG": [9.0, 8.6], "ID": [-0.7, 113.9], "TH": [15.8, 100.9],
  "VN": [14.0, 108.2], "PH": [12.8, 121.7], "MY": [4.2, 101.9],
  "TW": [23.6, 120.9], "HK": [22.3, 114.1], "FI": [61.9, 25.7],
  "NO": [60.4, 8.4], "DK": [56.2, 9.5], "CH": [46.8, 8.2],
  "AT": [47.5, 14.5], "BE": [50.5, 4.4], "CZ": [49.8, 15.4],
  "RO": [45.9, 24.9], "HU": [47.1, 19.5], "GR": [39.0, 21.8],
  "PT": [39.3, -8.2], "IE": [53.1, -7.6], "NZ": [-40.9, 174.8],
  "CL": [-35.6, -71.5], "CO": [4.5, -74.2], "PE": [-9.1, -75.0],
};

function ipToFakeCoords(ip: string): [number, number] {
  const parts = ip.split(".").map(Number);
  const lat = ((parts[0] * 7 + parts[1] * 3) % 160) - 80;
  const lng = ((parts[2] * 11 + parts[3] * 5) % 360) - 180;
  return [lat, lng];
}

function parseGeoLocation(geo: string | null): [number, number] | null {
  if (!geo) return null;
  const match = geo.match(/([-\d.]+),\s*([-\d.]+)/);
  if (match) return [parseFloat(match[1]), parseFloat(match[2])];
  const upper = geo.toUpperCase().trim();
  for (const [code, coords] of Object.entries(COUNTRY_COORDS)) {
    if (upper.includes(code) || upper.includes(code.toLowerCase())) return coords;
  }
  return null;
}

export async function getGeoThreatData(): Promise<GeoThreatPoint[]> {
  const [infra, breaches, deceptionAssets, scenarios] = await Promise.all([
    storage.getInfraExposure(),
    storage.getBreachRecords(),
    storage.getDeceptionAssets(),
    storage.getAttackScenarios(),
  ]);

  const points: GeoThreatPoint[] = [];

  for (const host of infra) {
    const vulnCount = (host.vulnerabilities as any[] || []).length;
    const portCount = (host.ports as number[] || []).length;
    const coords = ipToFakeCoords(host.ip);
    points.push({
      lat: coords[0],
      lng: coords[1],
      type: "infrastructure",
      severity: (host.severity || "MEDIUM").toUpperCase(),
      label: `Exposed Host: ${host.ip}`,
      details: `${portCount} open ports, ${vulnCount} CVEs | Severity: ${host.severity}`,
      timestamp: host.createdAt?.toISOString() || new Date().toISOString(),
    });
  }

  const breachDomains = new Map<string, { count: number; severity: string; latest: string }>();
  for (const breach of breaches) {
    const d = breach.domain || "unknown";
    const existing = breachDomains.get(d);
    if (existing) {
      existing.count++;
      if (breach.breachDate && breach.breachDate.toISOString() > existing.latest) {
        existing.latest = breach.breachDate.toISOString();
      }
    } else {
      breachDomains.set(d, {
        count: 1,
        severity: (breach.severity || "MEDIUM").toUpperCase(),
        latest: breach.breachDate?.toISOString() || new Date().toISOString(),
      });
    }
  }
  let breachIndex = 0;
  const countryKeys = Object.keys(COUNTRY_COORDS);
  for (const [domain, data] of breachDomains) {
    const countryCode = countryKeys[breachIndex % countryKeys.length];
    const coords = COUNTRY_COORDS[countryCode];
    points.push({
      lat: coords[0] + (Math.random() * 4 - 2),
      lng: coords[1] + (Math.random() * 4 - 2),
      type: "breach",
      severity: data.severity,
      label: `Breach: ${domain}`,
      details: `${data.count} breach record(s) | Latest: ${data.latest.split("T")[0]}`,
      timestamp: data.latest,
    });
    breachIndex++;
  }

  for (const asset of deceptionAssets) {
    if (!asset.triggered) continue;
    const coords = parseGeoLocation(asset.geoLocation) || ipToFakeCoords(asset.sourceIp || "0.0.0.0");
    points.push({
      lat: coords[0],
      lng: coords[1],
      type: "deception",
      severity: "HIGH",
      label: `Deception Trigger: ${asset.assetType}`,
      details: `Source IP: ${asset.sourceIp || "unknown"} | Token: ${asset.tokenId} | Triggers: ${asset.triggerCount}`,
      timestamp: asset.lastTriggeredAt?.toISOString() || new Date().toISOString(),
    });
  }

  for (const scenario of scenarios) {
    if ((scenario.riskScore || 0) >= 30) {
      const idx = (scenario.id || 0) % countryKeys.length;
      const coords = COUNTRY_COORDS[countryKeys[idx]];
      points.push({
        lat: coords[0] + (Math.random() * 6 - 3),
        lng: coords[1] + (Math.random() * 6 - 3),
        type: "attack",
        severity: (scenario.severity || "HIGH").toUpperCase(),
        label: `Attack Path: ${scenario.title}`,
        details: `Risk Score: ${scenario.riskScore} | Category: ${scenario.attackCategory} | Entry: ${scenario.entryPoint}`,
        timestamp: scenario.createdAt?.toISOString() || new Date().toISOString(),
      });
    }
  }

  return points;
}
