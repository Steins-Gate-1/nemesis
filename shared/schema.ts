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
  assetType: text("asset_type").notNull(), // e.g. "Canarytoken"
  url: text("url").notNull(),
  triggered: boolean("triggered").default(false),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deepfake_scans = pgTable("deepfake_scans", {
  id: serial("id").primaryKey(),
  mediaUrl: text("media_url").notNull(),
  isDeepfake: boolean("is_deepfake"),
  confidenceScore: integer("confidence_score"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
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
  user: text("user").default("system"),
  details: text("details"),
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
export const insertDeepfakeScanSchema = createInsertSchema(deepfake_scans).omit({ id: true, createdAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });
export const insertRiskScoreSchema = createInsertSchema(risk_scores).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(audit_logs).omit({ id: true, createdAt: true });

// Types
export type Domain = typeof domains.$inferSelect;
export type Email = typeof emails.$inferSelect;
export type BreachRecord = typeof breach_records.$inferSelect;
export type InfraExposure = typeof infrastructure_exposure.$inferSelect;
export type GithubExposure = typeof github_exposure.$inferSelect;
export type AttackScenario = typeof attack_scenarios.$inferSelect;
export type DeceptionAsset = typeof deception_assets.$inferSelect;
export type DeepfakeScan = typeof deepfake_scans.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type RiskScore = typeof risk_scores.$inferSelect;
export type AuditLog = typeof audit_logs.$inferSelect;
