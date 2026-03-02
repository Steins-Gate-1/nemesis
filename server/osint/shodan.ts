import { retryFetch } from "./utils";
import { portSeverity, type SeverityLevel, SEVERITY_VALUES } from "./severity";

export interface ShodanHostResult {
  ip: string;
  ports: number[];
  vulnerabilities: { cve: string; summary: string }[];
  services: { port: number; product: string; version: string }[];
  organization: string;
  country: string;
  city: string;
  severity: SeverityLevel;
}

export interface ShodanModuleResult {
  success: boolean;
  hosts: ShodanHostResult[];
  error?: string;
}

export async function queryShodan(domain: string): Promise<ShodanModuleResult> {
  const apiKey = process.env.SHODAN_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      hosts: [],
      error: "SHODAN_API_KEY not configured. Set it in environment variables to enable infrastructure scanning.",
    };
  }

  try {
    const dnsResponse = await retryFetch(
      `https://api.shodan.io/dns/resolve?hostnames=${encodeURIComponent(domain)}&key=${apiKey}`,
      { timeout: 10000 }
    );

    if (!dnsResponse.ok) {
      return {
        success: false,
        hosts: [],
        error: `Shodan DNS resolve returned ${dnsResponse.status}`,
      };
    }

    const dnsData = await dnsResponse.json();
    const ip = (dnsData as any)[domain];

    if (!ip) {
      return { success: true, hosts: [], error: "No IP found for domain" };
    }

    const hostResponse = await retryFetch(
      `https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`,
      { timeout: 10000 }
    );

    if (hostResponse.status === 404) {
      return { success: true, hosts: [] };
    }

    if (!hostResponse.ok) {
      return {
        success: false,
        hosts: [],
        error: `Shodan host query returned ${hostResponse.status}`,
      };
    }

    const hostData: any = await hostResponse.json();
    const ports: number[] = hostData.ports || [];
    const vulns = hostData.vulns
      ? Object.keys(hostData.vulns).map((cve) => ({
          cve,
          summary: hostData.vulns[cve]?.summary || "",
        }))
      : [];

    const services = (hostData.data || []).map((svc: any) => ({
      port: svc.port,
      product: svc.product || "Unknown",
      version: svc.version || "",
    }));

    let maxSeverity: SeverityLevel = "LOW";
    for (const port of ports) {
      const sev = portSeverity(port);
      if (SEVERITY_VALUES[sev] > SEVERITY_VALUES[maxSeverity]) {
        maxSeverity = sev;
      }
    }

    if (vulns.length > 0 && SEVERITY_VALUES["HIGH"] > SEVERITY_VALUES[maxSeverity]) {
      maxSeverity = "HIGH";
    }

    const host: ShodanHostResult = {
      ip,
      ports,
      vulnerabilities: vulns,
      services,
      organization: hostData.org || "",
      country: hostData.country_name || "",
      city: hostData.city || "",
      severity: maxSeverity,
    };

    return { success: true, hosts: [host] };
  } catch (err: any) {
    return {
      success: false,
      hosts: [],
      error: `Shodan query failed: ${err.message}`,
    };
  }
}
