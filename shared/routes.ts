import { z } from 'zod';
import { 
  insertDomainSchema, domains, 
  insertEmailSchema, emails,
  insertAlertSchema, alerts,
  insertAttackScenarioSchema, attack_scenarios,
  insertBreachRecordSchema, breach_records,
  insertDeceptionAssetSchema, deception_assets,
  insertHoneyPersonaSchema, honey_personas,
  insertDeepfakeExposureProfileSchema, deepfake_exposure_profiles,
  insertDeepfakeScanSchema, deepfake_scans,
  insertGithubExposureSchema, github_exposure,
  insertInfraExposureSchema, infrastructure_exposure,
  insertRiskScoreSchema, risk_scores,
  insertAuditLogSchema, audit_logs,
  insertIncidentReportSchema, incident_reports
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

const domainSchema = z.custom<typeof domains.$inferSelect>();
const emailSchema = z.custom<typeof emails.$inferSelect>();
const alertSchema = z.custom<typeof alerts.$inferSelect>();
const attackScenarioSchema = z.custom<typeof attack_scenarios.$inferSelect>();
const breachRecordSchema = z.custom<typeof breach_records.$inferSelect>();
const deceptionAssetSchema = z.custom<typeof deception_assets.$inferSelect>();
const honeyPersonaSchema = z.custom<typeof honey_personas.$inferSelect>();
const deepfakeExposureProfileSchema = z.custom<typeof deepfake_exposure_profiles.$inferSelect>();
const deepfakeScanSchema = z.custom<typeof deepfake_scans.$inferSelect>();
const githubExposureSchema = z.custom<typeof github_exposure.$inferSelect>();
const infraExposureSchema = z.custom<typeof infrastructure_exposure.$inferSelect>();
const riskScoreSchema = z.custom<typeof risk_scores.$inferSelect>();
const auditLogSchema = z.custom<typeof audit_logs.$inferSelect>();
const incidentReportSchema = z.custom<typeof incident_reports.$inferSelect>();

export const api = {
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats' as const,
      responses: {
        200: z.object({
          activeAlerts: z.number(),
          totalRiskScore: z.number(),
          exposedAssets: z.number(),
          deceptionTokensTriggered: z.number()
        }),
      }
    }
  },
  scans: {
    analyze: {
      method: 'POST' as const,
      path: '/api/scans/analyze' as const,
      input: z.object({ 
        target: z.string(), 
        type: z.enum(["domain", "email"]) 
      }),
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
        400: errorSchemas.validation,
      }
    }
  },
  alerts: {
    list: {
      method: 'GET' as const,
      path: '/api/alerts' as const,
      responses: {
        200: z.array(alertSchema),
      }
    },
    active: {
      method: 'GET' as const,
      path: '/api/alerts/active' as const,
      responses: {
        200: z.array(alertSchema),
      }
    },
    markRead: {
      method: 'PATCH' as const,
      path: '/api/alerts/:id/read' as const,
      responses: {
        200: alertSchema,
        404: errorSchemas.notFound,
      }
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/alerts/:id/status' as const,
      input: z.object({ status: z.enum(["OPEN", "ACKNOWLEDGED", "UNDER_REVIEW", "RESOLVED"]) }),
      responses: {
        200: alertSchema,
        404: errorSchemas.notFound,
      }
    },
  },
  threats: {
    breaches: {
      method: 'GET' as const,
      path: '/api/threats/breaches' as const,
      responses: { 200: z.array(breachRecordSchema) }
    },
    infrastructure: {
      method: 'GET' as const,
      path: '/api/threats/infrastructure' as const,
      responses: { 200: z.array(infraExposureSchema) }
    },
    github: {
      method: 'GET' as const,
      path: '/api/threats/github' as const,
      responses: { 200: z.array(githubExposureSchema) }
    },
    attackScenarios: {
      method: 'GET' as const,
      path: '/api/threats/scenarios' as const,
      responses: { 200: z.array(attackScenarioSchema) }
    },
    simulateAttack: {
      method: 'POST' as const,
      path: '/api/threats/simulate' as const,
      input: z.object({ domain: z.string() }),
      responses: {
        200: z.object({
          attack_scenarios: z.array(z.any()),
          highest_risk_scenario: z.any().nullable(),
          overall_risk_score: z.number(),
          overall_risk_level: z.string(),
          risk_explanation: z.string(),
          playbook: z.any().nullable(),
        }),
        400: errorSchemas.validation,
      }
    }
  },
  deception: {
    list: {
      method: 'GET' as const,
      path: '/api/deception' as const,
      responses: { 200: z.array(deceptionAssetSchema) }
    },
    deploy: {
      method: 'POST' as const,
      path: '/api/deception/deploy' as const,
      input: z.object({
        tokenType: z.string(),
        placementLocation: z.string(),
      }),
      responses: {
        201: deceptionAssetSchema,
        400: errorSchemas.validation
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/deception/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      }
    },
    simulateTrigger: {
      method: 'POST' as const,
      path: '/api/deception/simulate-trigger' as const,
      input: z.object({
        tokenId: z.string(),
        sourceIp: z.string().optional(),
      }),
      responses: {
        200: z.object({
          asset: deceptionAssetSchema,
          alert: alertSchema,
          correlationResult: z.any(),
        }),
        400: errorSchemas.validation,
      }
    },
    correlation: {
      method: 'GET' as const,
      path: '/api/deception/correlation' as const,
      responses: { 200: z.any() }
    },
    stats: {
      method: 'GET' as const,
      path: '/api/deception/stats' as const,
      responses: { 200: z.any() }
    },
    personas: {
      list: {
        method: 'GET' as const,
        path: '/api/deception/personas' as const,
        responses: { 200: z.array(honeyPersonaSchema) }
      },
      create: {
        method: 'POST' as const,
        path: '/api/deception/personas' as const,
        input: z.object({ deploymentContext: z.string().optional() }),
        responses: {
          201: honeyPersonaSchema,
          400: errorSchemas.validation
        }
      },
      retire: {
        method: 'PATCH' as const,
        path: '/api/deception/personas/:id/retire' as const,
        responses: {
          200: honeyPersonaSchema,
          404: errorSchemas.notFound,
        }
      },
    },
  },
  deepfake: {
    list: {
      method: 'GET' as const,
      path: '/api/deepfake' as const,
      responses: { 200: z.array(deepfakeScanSchema) }
    },
    scan: {
      method: 'POST' as const,
      path: '/api/deepfake/scan' as const,
      input: z.object({
        mediaUrl: z.string(),
        mediaType: z.enum(["video", "audio", "image"]).optional(),
        subjectName: z.string().optional(),
      }),
      responses: {
        201: deepfakeScanSchema,
        400: errorSchemas.validation
      }
    },
    stats: {
      method: 'GET' as const,
      path: '/api/deepfake/stats' as const,
      responses: { 200: z.any() }
    },
    exposure: {
      list: {
        method: 'GET' as const,
        path: '/api/deepfake/exposure' as const,
        responses: { 200: z.array(deepfakeExposureProfileSchema) }
      },
      create: {
        method: 'POST' as const,
        path: '/api/deepfake/exposure' as const,
        input: z.object({
          subjectName: z.string(),
          videoMinutes: z.number().min(0).max(999),
          audioScore: z.number().min(0).max(100),
          faceVisibilityScore: z.number().min(0).max(100),
          imageAvailabilityScore: z.number().min(0).max(100),
        }),
        responses: {
          201: deepfakeExposureProfileSchema,
          400: errorSchemas.validation
        }
      },
    },
    mitigate: {
      method: 'POST' as const,
      path: '/api/deepfake/mitigate' as const,
      input: z.object({
        exposureLevel: z.string(),
        syntheticDetected: z.boolean().optional(),
      }),
      responses: {
        200: z.object({ guidance: z.array(z.string()) }),
      }
    },
  },
  risk: {
    scores: {
      method: 'GET' as const,
      path: '/api/risk' as const,
      responses: { 200: z.array(riskScoreSchema) }
    }
  },
  audit: {
    list: {
      method: 'GET' as const,
      path: '/api/audit' as const,
      responses: { 200: z.array(auditLogSchema) }
    },
    search: {
      method: 'GET' as const,
      path: '/api/audit/search' as const,
      responses: { 200: z.array(auditLogSchema) }
    },
  },
  reports: {
    list: {
      method: 'GET' as const,
      path: '/api/reports' as const,
      responses: { 200: z.array(incidentReportSchema) }
    },
    generate: {
      method: 'POST' as const,
      path: '/api/reports/generate' as const,
      input: z.object({
        reportType: z.enum(["EXPOSURE", "ACTIVE_TARGETING", "DEEPFAKE_INCIDENT", "EXECUTIVE_SUMMARY"]),
        domain: z.string().optional(),
      }),
      responses: {
        201: incidentReportSchema,
        400: errorSchemas.validation
      }
    },
  },
  externalIntel: {
    analyze: {
      method: 'POST' as const,
      path: '/api/analyze' as const,
      input: z.object({
        target: z.string().min(1),
        password: z.string().optional(),
      }),
      responses: {
        200: z.object({
          dark_web_risk: z.any(),
          password_risk: z.any(),
          combined_score: z.number(),
          combined_risk_level: z.string(),
          individual_signals: z.any(),
          weighted_scores: z.any(),
          correlation_triggers: z.array(z.any()),
          attack_probability_percentage: z.number(),
          explainability_report: z.string(),
        }),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      }
    },
    correlate: {
      method: 'POST' as const,
      path: '/api/correlate' as const,
      input: z.object({
        dark_web: z.object({
          risk_level: z.string(),
          risk_score: z.number().optional(),
          domain_mentions: z.number().optional(),
          keywords_found: z.record(z.any()).optional(),
        }).optional(),
        credentials: z.object({
          exposure_count: z.number().optional(),
          risk_level: z.string(),
        }).optional(),
        additional_signals: z.record(z.object({
          score: z.number(),
          risk_level: z.string(),
        })).optional(),
      }),
      responses: {
        200: z.object({
          individual_signals: z.any(),
          weighted_scores: z.any(),
          correlation_triggers: z.array(z.any()),
          combined_score: z.number(),
          combined_risk_level: z.string(),
          attack_probability_percentage: z.number(),
          explainability_report: z.string(),
        }),
        400: errorSchemas.validation,
      }
    },
  },
  system: {
    health: {
      method: 'GET' as const,
      path: '/api/system/health' as const,
      responses: {
        200: z.object({
          status: z.string(),
          uptime: z.number(),
          dbStatus: z.string(),
          timestamp: z.string(),
          activeIntegrations: z.array(z.string()),
        })
      }
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
