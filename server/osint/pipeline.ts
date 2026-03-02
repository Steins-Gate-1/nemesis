import { normalizeDomain } from "./utils";
import { queryHIBP, storeBreachResults } from "./hibp";
import { queryShodan } from "./shodan";
import { queryGithub } from "./github";
import { queryWhois } from "./whois";
import { SEVERITY_VALUES, classifyExposureLevel, type SeverityLevel } from "./severity";
import { storage } from "../storage";

export interface AnalysisResult {
  domain: string;
  breach_summary: {
    success: boolean;
    total_breaches: number;
    breaches: Array<{
      title: string;
      domain: string;
      breachDate: string;
      severity: SeverityLevel;
      dataClasses: string[];
    }>;
    error?: string;
  };
  infrastructure_summary: {
    success: boolean;
    hosts: Array<{
      ip: string;
      ports: number[];
      vulnerabilities: { cve: string; summary: string }[];
      services: { port: number; product: string; version: string }[];
      organization: string;
      country: string;
      severity: SeverityLevel;
    }>;
    error?: string;
  };
  github_summary: {
    success: boolean;
    total_exposures: number;
    exposures: Array<{
      repoUrl: string;
      secretType: string;
      snippet: string;
      severity: SeverityLevel;
    }>;
    error?: string;
  };
  whois_summary: {
    success: boolean;
    registrar: string;
    creationDate: string | null;
    expirationDate: string | null;
    nameServers: string[];
    domainAgeDays: number;
    riskFlags: string[];
    error?: string;
  };
  exposure_score: number;
  exposure_level: string;
  severity_breakdown: Record<SeverityLevel, number>;
  api_status: Record<string, { success: boolean; error?: string }>;
}

export async function analyzeDomain(rawDomain: string): Promise<AnalysisResult> {
  const domain = normalizeDomain(rawDomain);

  await storage.createAuditLog({
    action: "OSINT Analysis Started",
    user: "SYSTEM",
    details: `Target: ${domain} | Pipeline initiated`,
  });

  let domainRecord;
  try {
    domainRecord = await storage.createDomain({ domain });
  } catch (err: any) {
    if (err.message?.includes("duplicate") || err.code === "23505") {
      domainRecord = await storage.getDomainByName(domain);
    } else {
      throw err;
    }
  }

  const domainId = domainRecord?.id;

  const [hibpResult, shodanResult, githubResult, whoisResult] = await Promise.allSettled([
    queryHIBP(`info@${domain}`),
    queryShodan(domain),
    queryGithub(domain),
    queryWhois(domain),
  ]);

  const hibp = hibpResult.status === "fulfilled" ? hibpResult.value : {
    success: false, breaches: [], totalBreaches: 0, error: `HIBP module crashed: ${(hibpResult as any).reason?.message}`,
  };

  const shodan = shodanResult.status === "fulfilled" ? shodanResult.value : {
    success: false, hosts: [], error: `Shodan module crashed: ${(shodanResult as any).reason?.message}`,
  };

  const github = githubResult.status === "fulfilled" ? githubResult.value : {
    success: false, exposures: [], error: `GitHub module crashed: ${(githubResult as any).reason?.message}`,
  };

  const whois = whoisResult.status === "fulfilled" ? whoisResult.value : {
    success: false, whois: null, error: `WHOIS module crashed: ${(whoisResult as any).reason?.message}`,
  };

  if (hibp.success && hibp.breaches.length > 0) {
    try {
      await storeBreachResults(null, domain, hibp.breaches);
    } catch (err: any) {
      await storage.createAuditLog({
        action: "Storage Error",
        details: `Failed to store breach results: ${err.message}`,
      });
    }
  }

  if (shodan.success && shodan.hosts.length > 0) {
    for (const host of shodan.hosts) {
      try {
        await storage.createInfraExposure({
          domainId: domainId || null,
          ip: host.ip,
          ports: host.ports,
          vulnerabilities: host.vulnerabilities,
          severity: host.severity,
        });
      } catch (err: any) {
        await storage.createAuditLog({
          action: "Storage Error",
          details: `Failed to store infra exposure: ${err.message}`,
        });
      }
    }
  }

  if (github.success && github.exposures.length > 0) {
    for (const exposure of github.exposures) {
      try {
        await storage.createGithubExposure({
          domainId: domainId || null,
          repoUrl: exposure.repoUrl,
          secretType: exposure.secretType,
          snippet: exposure.snippet,
          severity: exposure.severity,
        });
      } catch (err: any) {
        await storage.createAuditLog({
          action: "Storage Error",
          details: `Failed to store github exposure: ${err.message}`,
        });
      }
    }
  }

  const severityBreakdown: Record<SeverityLevel, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  let totalScore = 0;

  for (const breach of hibp.breaches) {
    severityBreakdown[breach.severity]++;
    totalScore += SEVERITY_VALUES[breach.severity];
  }

  for (const host of shodan.hosts) {
    severityBreakdown[host.severity]++;
    totalScore += SEVERITY_VALUES[host.severity];
  }

  for (const exp of github.exposures) {
    severityBreakdown[exp.severity]++;
    totalScore += SEVERITY_VALUES[exp.severity];
  }

  if (whois.whois?.riskFlags.length) {
    for (const flag of whois.whois.riskFlags) {
      severityBreakdown["MEDIUM"]++;
      totalScore += SEVERITY_VALUES["MEDIUM"];
    }
  }

  const exposureLevel = classifyExposureLevel(totalScore);

  if (domainId) {
    try {
      const exposureSeverity = Math.min(100, totalScore * 3);
      const attackLikelihood = Math.min(
        100,
        (hibp.breaches.length * 10) +
        (shodan.hosts.reduce((acc, h) => acc + h.ports.length, 0) * 5) +
        (github.exposures.length * 8)
      );
      const operationalImpact = Math.min(
        100,
        (severityBreakdown.CRITICAL * 25) +
        (severityBreakdown.HIGH * 15) +
        (severityBreakdown.MEDIUM * 5) +
        (severityBreakdown.LOW * 1)
      );
      const overallScore = Math.round((exposureSeverity + attackLikelihood + operationalImpact) / 3);

      await storage.createRiskScore({
        domainId,
        exposureSeverity,
        attackLikelihood,
        operationalImpact,
        overallScore,
        classification: exposureLevel,
      });
    } catch (err: any) {
      await storage.createAuditLog({
        action: "Risk Score Error",
        details: `Failed to compute risk score: ${err.message}`,
      });
    }
  }

  if (totalScore >= 15) {
    await storage.createAlert({
      title: `High Exposure Detected: ${domain}`,
      description: `OSINT analysis found ${exposureLevel} level exposure. Score: ${totalScore}. Breaches: ${hibp.breaches.length}, Exposed Services: ${shodan.hosts.reduce((acc, h) => acc + h.ports.length, 0)}, GitHub Leaks: ${github.exposures.length}.`,
      severity: exposureLevel === "CRITICAL" ? "Critical" : "High",
      isRead: false,
    });
  }

  await storage.createAuditLog({
    action: "OSINT Analysis Complete",
    user: "SYSTEM",
    details: `Target: ${domain} | Score: ${totalScore} | Level: ${exposureLevel} | Breaches: ${hibp.breaches.length} | Infra: ${shodan.hosts.length} | GitHub: ${github.exposures.length}`,
  });

  return {
    domain,
    breach_summary: {
      success: hibp.success,
      total_breaches: hibp.breaches.length,
      breaches: hibp.breaches.map((b) => ({
        title: b.title,
        domain: b.domain,
        breachDate: b.breachDate,
        severity: b.severity,
        dataClasses: b.dataClasses,
      })),
      error: hibp.error,
    },
    infrastructure_summary: {
      success: shodan.success,
      hosts: shodan.hosts.map((h) => ({
        ip: h.ip,
        ports: h.ports,
        vulnerabilities: h.vulnerabilities,
        services: h.services,
        organization: h.organization,
        country: h.country,
        severity: h.severity,
      })),
      error: shodan.error,
    },
    github_summary: {
      success: github.success,
      total_exposures: github.exposures.length,
      exposures: github.exposures,
      error: github.error,
    },
    whois_summary: {
      success: whois.success,
      registrar: whois.whois?.registrar || "",
      creationDate: whois.whois?.creationDate || null,
      expirationDate: whois.whois?.expirationDate || null,
      nameServers: whois.whois?.nameServers || [],
      domainAgeDays: whois.whois?.domainAgeDays || 0,
      riskFlags: whois.whois?.riskFlags || [],
      error: whois.error,
    },
    exposure_score: totalScore,
    exposure_level: exposureLevel,
    severity_breakdown: severityBreakdown,
    api_status: {
      hibp: { success: hibp.success, error: hibp.error },
      shodan: { success: shodan.success, error: shodan.error },
      github: { success: github.success, error: github.error },
      whois: { success: whois.success, error: whois.error },
    },
  };
}
