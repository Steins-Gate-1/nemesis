import { createHash } from "crypto";
import { retryFetch } from "./utils";

export interface PwnedPasswordResult {
  compromised: boolean;
  occurrences: number;
  risk_level: string;
}

export async function checkPwnedPassword(password: string): Promise<PwnedPasswordResult> {
  if (!password || password.length === 0) {
    return { compromised: false, occurrences: 0, risk_level: "SAFE" };
  }

  try {
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.substring(0, 5);
    const suffix = sha1.substring(5);

    const response = await retryFetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: { "User-Agent": "NEMESIS-CyberDefense", "Add-Padding": "true" },
        timeout: 10000,
      }
    );

    if (!response.ok) {
      return { compromised: false, occurrences: 0, risk_level: "UNKNOWN" };
    }

    const text = await response.text();
    const lines = text.split("\n");

    for (const line of lines) {
      const [hashSuffix, count] = line.trim().split(":");
      if (hashSuffix === suffix) {
        const occurrences = parseInt(count, 10) || 0;
        let risk_level = "SAFE";
        if (occurrences >= 100000) risk_level = "CRITICAL";
        else if (occurrences >= 10000) risk_level = "HIGH";
        else if (occurrences >= 100) risk_level = "MODERATE";
        else if (occurrences > 0) risk_level = "LOW";

        return { compromised: true, occurrences, risk_level };
      }
    }

    return { compromised: false, occurrences: 0, risk_level: "SAFE" };
  } catch (err: any) {
    return { compromised: false, occurrences: 0, risk_level: "UNKNOWN" };
  }
}
