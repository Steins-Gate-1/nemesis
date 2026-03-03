import { retryFetch } from "./utils";
import { breachSeverity, type SeverityLevel } from "./severity";
import { storage } from "../storage";

export interface HIBPBreachResult {
  title: string;
  domain: string;
  breachDate: string;
  description: string;
  dataClasses: string[];
  severity: SeverityLevel;
  verified: boolean;
  pwnCount: number;
}

export interface HIBPModuleResult {
  success: boolean;
  breaches: HIBPBreachResult[];
  error?: string;
  totalBreaches: number;
  totalPwnedAccounts: number;
}

export async function queryHIBP(email: string): Promise<HIBPModuleResult> {
  const apiKey = process.env.HIBP_API_KEY;

  if (apiKey) {
    return queryHIBPWithKey(email, apiKey);
  }

  const domain = email.includes("@") ? email.split("@")[1] : email;
  return queryHIBPFree(domain);
}

async function queryHIBPWithKey(email: string, apiKey: string): Promise<HIBPModuleResult> {
  try {
    const response = await retryFetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      {
        headers: {
          "hibp-api-key": apiKey,
          "user-agent": "NEMESIS-CyberDefense",
        },
        timeout: 10000,
      }
    );

    if (response.status === 404) {
      return { success: true, breaches: [], totalBreaches: 0, totalPwnedAccounts: 0 };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        breaches: [],
        error: `HIBP API returned ${response.status}: ${errorText}`,
        totalBreaches: 0,
        totalPwnedAccounts: 0,
      };
    }

    const data = await response.json();
    return parseBreachData(data as any[]);
  } catch (err: any) {
    return {
      success: false,
      breaches: [],
      error: `HIBP query failed: ${err.message}`,
      totalBreaches: 0,
      totalPwnedAccounts: 0,
    };
  }
}

async function queryHIBPFree(domain: string): Promise<HIBPModuleResult> {
  try {
    const response = await retryFetch(
      `https://haveibeenpwned.com/api/v3/breaches?domain=${encodeURIComponent(domain)}`,
      {
        headers: { "user-agent": "NEMESIS-CyberDefense" },
        timeout: 10000,
      }
    );

    if (response.status === 404) {
      return { success: true, breaches: [], totalBreaches: 0, totalPwnedAccounts: 0 };
    }

    if (!response.ok) {
      const allBreachesRes = await retryFetch(
        `https://haveibeenpwned.com/api/v3/breaches`,
        {
          headers: { "user-agent": "NEMESIS-CyberDefense" },
          timeout: 10000,
        }
      );

      if (!allBreachesRes.ok) {
        return {
          success: false,
          breaches: [],
          error: `HIBP free API returned ${response.status}. No API key configured for email-level lookups.`,
          totalBreaches: 0,
          totalPwnedAccounts: 0,
        };
      }

      const allBreaches: any[] = await allBreachesRes.json();
      const domainBreaches = allBreaches.filter(
        (b: any) => b.Domain && b.Domain.toLowerCase().includes(domain.toLowerCase())
      );

      if (domainBreaches.length === 0) {
        return { success: true, breaches: [], totalBreaches: 0, totalPwnedAccounts: 0 };
      }

      return parseBreachData(domainBreaches);
    }

    const data = await response.json();
    return parseBreachData(data as any[]);
  } catch (err: any) {
    return {
      success: false,
      breaches: [],
      error: `HIBP free query failed: ${err.message}`,
      totalBreaches: 0,
      totalPwnedAccounts: 0,
    };
  }
}

function parseBreachData(data: any[]): HIBPModuleResult {
  let totalPwnedAccounts = 0;
  const breaches: HIBPBreachResult[] = data.map((breach) => {
    const pwnCount = breach.PwnCount || 0;
    totalPwnedAccounts += pwnCount;
    return {
      title: breach.Name || breach.Title || "Unknown",
      domain: breach.Domain || "",
      breachDate: breach.BreachDate || "",
      description: (breach.Description || "").replace(/<[^>]*>/g, ""),
      dataClasses: breach.DataClasses || [],
      severity: breachSeverity(breach.DataClasses || []),
      verified: breach.IsVerified ?? false,
      pwnCount,
    };
  });

  return {
    success: true,
    breaches,
    totalBreaches: breaches.length,
    totalPwnedAccounts,
  };
}

export async function storeBreachResults(
  emailId: number | null,
  targetDomain: string,
  results: HIBPBreachResult[]
): Promise<void> {
  for (const breach of results) {
    await storage.createBreachRecord({
      emailId,
      title: breach.title,
      domain: targetDomain,
      breachDate: breach.breachDate ? new Date(breach.breachDate) : null,
      description: breach.description,
      dataClasses: breach.dataClasses,
      severity: breach.severity,
    });
  }
}
