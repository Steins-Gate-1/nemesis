import { retryFetch } from "./utils";

export interface WhoisResult {
  registrar: string;
  creationDate: string | null;
  expirationDate: string | null;
  nameServers: string[];
  domainAgeDays: number;
  riskFlags: string[];
}

export interface WhoisModuleResult {
  success: boolean;
  whois: WhoisResult | null;
  error?: string;
}

export async function queryWhois(domain: string): Promise<WhoisModuleResult> {
  try {
    const response = await retryFetch(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      {
        headers: { Accept: "application/rdap+json" },
        timeout: 10000,
      }
    );

    if (!response.ok) {
      return {
        success: false,
        whois: null,
        error: `RDAP lookup returned ${response.status}`,
      };
    }

    const data: any = await response.json();

    const events = data.events || [];
    const registrationEvent = events.find((e: any) => e.eventAction === "registration");
    const expirationEvent = events.find((e: any) => e.eventAction === "expiration");

    const creationDate = registrationEvent?.eventDate || null;
    const expirationDate = expirationEvent?.eventDate || null;

    const nameServers: string[] = (data.nameservers || [])
      .map((ns: any) => ns.ldhName || ns.unicodeName || "")
      .filter(Boolean);

    const entities = data.entities || [];
    let registrar = "";
    for (const entity of entities) {
      if ((entity.roles || []).includes("registrar")) {
        const vcards = entity.vcardArray?.[1] || [];
        const fnEntry = vcards.find((v: any) => v[0] === "fn");
        registrar = fnEntry?.[3] || entity.handle || "";
        break;
      }
    }

    let domainAgeDays = 0;
    const riskFlags: string[] = [];

    if (creationDate) {
      const created = new Date(creationDate);
      domainAgeDays = Math.floor(
        (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (domainAgeDays < 180) {
        riskFlags.push("Recently registered domain (< 6 months)");
      }
    }

    if (expirationDate) {
      const expiry = new Date(expirationDate);
      const daysUntilExpiry = Math.floor(
        (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry < 30) {
        riskFlags.push("Domain expiring within 30 days");
      } else if (daysUntilExpiry < 90) {
        riskFlags.push("Domain expiring within 90 days");
      }
    }

    return {
      success: true,
      whois: {
        registrar,
        creationDate,
        expirationDate,
        nameServers,
        domainAgeDays,
        riskFlags,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      whois: null,
      error: `WHOIS lookup failed: ${err.message}`,
    };
  }
}
