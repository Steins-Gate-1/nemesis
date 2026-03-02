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
}

export interface HIBPModuleResult {
  success: boolean;
  breaches: HIBPBreachResult[];
  error?: string;
  totalBreaches: number;
}

export async function queryHIBP(email: string): Promise<HIBPModuleResult> {
  const apiKey = process.env.HIBP_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      breaches: [],
      error: "HIBP_API_KEY not configured. Set it in environment variables to enable breach detection.",
      totalBreaches: 0,
    };
  }

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
      return { success: true, breaches: [], totalBreaches: 0 };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        breaches: [],
        error: `HIBP API returned ${response.status}: ${errorText}`,
        totalBreaches: 0,
      };
    }

    const data = await response.json();
    const breaches: HIBPBreachResult[] = (data as any[]).map((breach) => ({
      title: breach.Name || breach.Title || "Unknown",
      domain: breach.Domain || "",
      breachDate: breach.BreachDate || "",
      description: (breach.Description || "").replace(/<[^>]*>/g, ""),
      dataClasses: breach.DataClasses || [],
      severity: breachSeverity(breach.DataClasses || []),
      verified: breach.IsVerified ?? false,
    }));

    return {
      success: true,
      breaches,
      totalBreaches: breaches.length,
    };
  } catch (err: any) {
    return {
      success: false,
      breaches: [],
      error: `HIBP query failed: ${err.message}`,
      totalBreaches: 0,
    };
  }
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
