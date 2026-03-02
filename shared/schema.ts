import { pgTable, serial, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base tables

export const domains = pgTable("domains", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const breach_records = pgTable("breach_records", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id").references(() => emails.id),
  title: text("title").notNull(),
  domain: text("domain"),
  breachDate: timestamp("breach_date"),
  description: text("description"),
  dataClasses: jsonb("data_classes"), // Array of strings
  severity: text("severity").notNull(), // "Low", "Moderate", "High", "Critical"
  createdAt: timestamp("created_at").defaultNow(),
});

export const infrastructure_exposure = pgTable("infrastructure_exposure", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").references(() => domains.id),
  ip: text("ip").notNull(),
  ports: jsonb("ports"), // Array of numbers
  vulnerabilities: jsonb("vulnerabilities"), // Array of objects
  severity: text("severity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const github_exposure = pgTable("github_exposure", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").references(() => domains.id),
  repoUrl: text("repo_url").notNull(),
  secretType: text("secret_type"),
  snippet: text("snippet"),
  severity: text("severity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attack_scenarios = pgTable("attack_scenarios", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").references(() => domains.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  entryPoint: text("entry_point"),
  attackCategory: text("attack_category"),
  attackSteps: jsonb("attack_steps"),
  requiredConditions: jsonb("required_conditions"),
  mitigationSteps: jsonb("mitigation_steps"),
  likelihoodScore: integer("likelihood_score"),
  impactScore: integer("impact_score"),
  riskScore: integer("risk_score"),
  severity: text("severity").notNull(),
  scenarioJson: jsonb("scenario_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deception_assets = pgTable("deception_assets", {
  id: serial("id").primaryKey(),
  tokenId: text("token_id"),
  assetType: text("asset_type").notNull(),
  placementLocation: text("placement_location"),
  status: text("status").default("ACTIVE"),
  url: text("url").notNull(),
  triggered: boolean("triggered").default(false),
  lastTriggeredAt: timestamp("last_triggered_at"),
  sourceIp: text("source_ip"),
  geoLocation: text("geo_location"),
  userAgent: text("user_agent"),
  severityLevel: text("severity_level").default("HIGH"),
  triggerCount: integer("trigger_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const honey_personas = pgTable("honey_personas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  decoyEmail: text("decoy_email").notNull(),
  department: text("department"),
  deploymentContext: text("deployment_context"),
  status: text("status").default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deepfake_exposure_profiles = pgTable("deepfake_exposure_profiles", {
  id: serial("id").primaryKey(),
  subjectName: text("subject_name").notNull(),
  videoMinutes: integer("video_minutes").default(0),
  audioScore: integer("audio_score").default(0),
  faceVisibilityScore: integer("face_visibility_score").default(0),
  imageAvailabilityScore: integer("image_availability_score").default(0),
  exposureScore: integer("exposure_score").default(0),
  exposureLevel: text("exposure_level").default("LOW"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deepfake_scans = pgTable("deepfake_scans", {
  id: serial("id").primaryKey(),
  mediaUrl: text("media_url").notNull(),
  mediaType: text("media_type").default("video"),
  subjectName: text("subject_name"),
  isDeepfake: boolean("is_deepfake"),
  syntheticProbability: integer("synthetic_probability"),
  confidenceScore: integer("confidence_score"),
  analysisSummary: text("analysis_summary"),
  riskLevel: text("risk_level"),
  detectionTags: jsonb("detection_tags"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(),
  alertType: text("alert_type"),
  domain: text("domain"),
  sourceModule: text("source_module"),
  relatedObjectId: integer("related_object_id"),
  recommendedAction: text("recommended_action"),
  status: text("status").default("OPEN"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const risk_scores = pgTable("risk_scores", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").references(() => domains.id),
  exposureSeverity: integer("exposure_severity").notNull(),
  attackLikelihood: integer("attack_likelihood").notNull(),
  operationalImpact: integer("operational_impact").notNull(),
  overallScore: integer("overall_score").notNull(),
  classification: text("classification").notNull(), // "Low", "Moderate", "High", "Critical"
  createdAt: timestamp("created_at").defaultNow(),
});

export const audit_logs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  actionType: text("action_type"),
  actorType: text("actor_type").default("SYSTEM"),
  user: text("user").default("system"),
  targetEntity: text("target_entity"),
  referenceId: text("reference_id"),
  details: text("details"),
  rawEventData: jsonb("raw_event_data"),
  hashSignature: text("hash_signature"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const incident_reports = pgTable("incident_reports", {
  id: serial("id").primaryKey(),
  reportType: text("report_type").notNull(),
  domain: text("domain"),
  title: text("title").notNull(),
  executiveSummary: text("executive_summary"),
  technicalDetails: jsonb("technical_details"),
  riskLevel: text("risk_level"),
  reportData: jsonb("report_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas
export const insertDomainSchema = createInsertSchema(domains).omit({ id: true, createdAt: true });
export const insertEmailSchema = createInsertSchema(emails).omit({ id: true, createdAt: true });
export const insertBreachRecordSchema = createInsertSchema(breach_records).omit({ id: true, createdAt: true });
export const insertInfraExposureSchema = createInsertSchema(infrastructure_exposure).omit({ id: true, createdAt: true });
export const insertGithubExposureSchema = createInsertSchema(github_exposure).omit({ id: true, createdAt: true });
export const insertAttackScenarioSchema = createInsertSchema(attack_scenarios).omit({ id: true, createdAt: true });
export const insertDeceptionAssetSchema = createInsertSchema(deception_assets).omit({ id: true, createdAt: true });
export const insertHoneyPersonaSchema = createInsertSchema(honey_personas).omit({ id: true, createdAt: true });
export const insertDeepfakeExposureProfileSchema = createInsertSchema(deepfake_exposure_profiles).omit({ id: true, createdAt: true });
export const insertDeepfakeScanSchema = createInsertSchema(deepfake_scans).omit({ id: true, createdAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRiskScoreSchema = createInsertSchema(risk_scores).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(audit_logs).omit({ id: true, createdAt: true });
export const insertIncidentReportSchema = createInsertSchema(incident_reports).omit({ id: true, createdAt: true });

// Types
export type Domain = typeof domains.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type BreachRecord = typeof breach_records.$inferSelect;
export type InfraExposure = typeof infrastructure_exposure.$inferSelect;
export type GithubExposure = typeof github_exposure.$inferSelect;
export type AttackScenario = typeof attack_scenarios.$inferSelect;
export type DeceptionAsset = typeof deception_assets.$inferSelect;
export type HoneyPersona = typeof honey_personas.$inferSelect;
export type DeepfakeExposureProfile = typeof deepfake_exposure_profiles.$inferSelect;
export type DeepfakeScan = typeof deepfake_scans.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type RiskScore = typeof risk_scores.$inferSelect;
export type AuditLog = typeof audit_logs.$inferSelect;
export type IncidentReport = typeof incident_reports.$inferSelect;

export type InsertDeepfakeExposureProfile = z.infer<typeof insertDeepfakeExposureProfileSchema>;
export type InsertIncidentReport = z.infer<typeof insertIncidentReportSchema>;
