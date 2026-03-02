import { storage } from "../storage";

export async function checkAndEscalateAlerts(): Promise<{
  escalated: number;
  totalRecent: number;
}> {
  const recentAlerts = await storage.getRecentAlerts(10);
  let escalated = 0;

  if (recentAlerts.length >= 3) {
    const openAlerts = recentAlerts.filter(a => a.status === "OPEN" && a.severity !== "CRITICAL");
    for (const alert of openAlerts) {
      await storage.createAlert({
        title: `ESCALATED: ${alert.title}`,
        description: `Auto-escalated due to ${recentAlerts.length} alerts in 10 minutes. Original: ${alert.description}`,
        severity: "CRITICAL",
        alertType: "ESCALATION",
        sourceModule: "ALERT_ENGINE",
        relatedObjectId: alert.id,
        recommendedAction: "Immediate investigation required - multiple correlated events detected",
        isRead: false,
      });
      escalated++;
    }
  }

  return { escalated, totalRecent: recentAlerts.length };
}

export function classifyAlertSeverity(context: {
  breachCount?: number;
  criticalCveDetected?: boolean;
  honeytokenTriggered?: boolean;
  deepfakeProbability?: number;
  riskScoreCrossed?: boolean;
  activeTargeting?: boolean;
}): string {
  if (context.honeytokenTriggered) return "CRITICAL";
  if (context.deepfakeProbability && context.deepfakeProbability > 85) return "CRITICAL";
  if (context.activeTargeting) return "CRITICAL";
  if (context.criticalCveDetected) return "HIGH";
  if (context.breachCount && context.breachCount > 3) return "HIGH";
  if (context.riskScoreCrossed) return "HIGH";
  if (context.breachCount && context.breachCount > 1) return "MODERATE";
  return "LOW";
}

export const ALERT_LIFECYCLE = ["OPEN", "ACKNOWLEDGED", "UNDER_REVIEW", "RESOLVED"] as const;

export function isValidTransition(current: string, next: string): boolean {
  const idx = ALERT_LIFECYCLE.indexOf(current as any);
  const nextIdx = ALERT_LIFECYCLE.indexOf(next as any);
  if (idx === -1 || nextIdx === -1) return false;
  return nextIdx >= idx;
}
