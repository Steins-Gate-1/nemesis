import { db } from "./db";
import {
  domains, emails, breach_records, infrastructure_exposure, github_exposure,
  attack_scenarios, deception_assets, honey_personas, deepfake_exposure_profiles,
  deepfake_scans, alerts, risk_scores, audit_logs, incident_reports,
  type Alert, type AttackScenario, type BreachRecord, type DeceptionAsset,
  type HoneyPersona, type DeepfakeExposureProfile, type DeepfakeScan, type Domain,
  type Email, type GithubExposure, type InfraExposure, type RiskScore, type AuditLog,
  type IncidentReport,
  type InsertAlert, type InsertAttackScenario, type InsertBreachRecord,
  type InsertDeceptionAsset, type InsertHoneyPersona, type InsertDeepfakeScan, type InsertDomain,
  type InsertEmail, type InsertGithubExposure, type InsertInfraExposure,
  type InsertRiskScore, type InsertAuditLog, type InsertDeepfakeExposureProfile,
  type InsertIncidentReport
} from "@shared/schema";
import { eq, sql, desc, and, like, gte } from "drizzle-orm";
import { createHash } from "crypto";

type InsertBreachRecord = {
  emailId?: number | null;
  title: string;
  domain?: string | null;
  breachDate?: Date | null;
  description?: string | null;
  dataClasses?: any;
  severity: string;
};

type InsertInfraExposure = {
  domainId?: number | null;
  ip: string;
  ports?: any;
  vulnerabilities?: any;
  severity: string;
};

type InsertGithubExposure = {
  domainId?: number | null;
  repoUrl: string;
  secretType?: string | null;
  snippet?: string | null;
  severity: string;
};

type InsertAttackScenarioFull = {
  domainId?: number | null;
  title: string;
  description: string;
  entryPoint?: string | null;
  attackCategory?: string | null;
  attackSteps?: any;
  requiredConditions?: any;
  mitigationSteps?: any;
  likelihoodScore?: number | null;
  impactScore?: number | null;
  riskScore?: number | null;
  severity: string;
  scenarioJson?: any;
};

type InsertRiskScore = {
  domainId?: number | null;
  exposureSeverity: number;
  attackLikelihood: number;
  operationalImpact: number;
  overallScore: number;
  classification: string;
};

export interface IStorage {
  getDashboardStats(): Promise<{
    activeAlerts: number;
    totalRiskScore: number;
    exposedAssets: number;
    deceptionTokensTriggered: number;
    deepfakeThreats: number;
    activeTargeting: boolean;
  }>;

  getAlerts(): Promise<Alert[]>;
  getActiveAlerts(): Promise<Alert[]>;
  getAlertsByStatus(status: string): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertRead(id: number): Promise<Alert>;
  updateAlertStatus(id: number, status: string): Promise<Alert>;
  getRecentAlerts(minutesAgo: number): Promise<Alert[]>;

  getBreachRecords(): Promise<BreachRecord[]>;
  createBreachRecord(record: InsertBreachRecord): Promise<BreachRecord>;
  getInfraExposure(): Promise<InfraExposure[]>;
  createInfraExposure(exposure: InsertInfraExposure): Promise<InfraExposure>;
  getGithubExposure(): Promise<GithubExposure[]>;
  createGithubExposure(exposure: InsertGithubExposure): Promise<GithubExposure>;
  getAttackScenarios(): Promise<AttackScenario[]>;
  getAttackScenariosByDomain(domainId: number): Promise<AttackScenario[]>;
  deleteAttackScenariosByDomain(domainId: number): Promise<void>;
  createAttackScenario(scenario: InsertAttackScenarioFull): Promise<AttackScenario>;

  getDeceptionAssets(): Promise<DeceptionAsset[]>;
  getDeceptionAssetByTokenId(tokenId: string): Promise<DeceptionAsset | undefined>;
  createDeceptionAsset(asset: any): Promise<DeceptionAsset>;
  triggerDeceptionAsset(id: number, data: { sourceIp: string; userAgent: string; geoLocation: string }): Promise<DeceptionAsset>;
  deleteDeceptionAsset(id: number): Promise<void>;

  getHoneyPersonas(): Promise<HoneyPersona[]>;
  createHoneyPersona(persona: any): Promise<HoneyPersona>;
  retireHoneyPersona(id: number): Promise<HoneyPersona>;

  updateRiskScore(id: number, data: { overallScore: number; classification: string }): Promise<RiskScore>;

  getDeepfakeExposureProfiles(): Promise<DeepfakeExposureProfile[]>;
  createDeepfakeExposureProfile(profile: InsertDeepfakeExposureProfile): Promise<DeepfakeExposureProfile>;

  getDeepfakeScans(): Promise<DeepfakeScan[]>;
  createDeepfakeScan(scan: any): Promise<DeepfakeScan>;
  updateDeepfakeScan(id: number, data: Partial<DeepfakeScan>): Promise<DeepfakeScan>;

  getRiskScores(): Promise<RiskScore[]>;
  createRiskScore(score: InsertRiskScore): Promise<RiskScore>;

  getAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  searchAuditLogs(filters: { entity?: string; action?: string; actor?: string }): Promise<AuditLog[]>;

  getIncidentReports(): Promise<IncidentReport[]>;
  createIncidentReport(report: InsertIncidentReport): Promise<IncidentReport>;

  createDomain(domain: InsertDomain): Promise<Domain>;
  getDomainByName(name: string): Promise<Domain | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
}

export class DatabaseStorage implements IStorage {
  async getDashboardStats() {
    const unreadAlerts = await db.select().from(alerts).where(eq(alerts.isRead, false));
    const allRiskScores = await db.select().from(risk_scores);
    const avgRiskScore = allRiskScores.length > 0 
      ? Math.round(allRiskScores.reduce((acc, curr) => acc + curr.overallScore, 0) / allRiskScores.length)
      : 0;
    
    const allInfra = await db.select().from(infrastructure_exposure);
    const triggeredTokens = await db.select().from(deception_assets).where(eq(deception_assets.triggered, true));
    const dfScans = await db.select().from(deepfake_scans).where(eq(deepfake_scans.isDeepfake, true));

    return {
      activeAlerts: unreadAlerts.length,
      totalRiskScore: avgRiskScore,
      exposedAssets: allInfra.length,
      deceptionTokensTriggered: triggeredTokens.length,
      deepfakeThreats: dfScans.length,
      activeTargeting: triggeredTokens.length > 0,
    };
  }

  async getAlerts() {
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async getActiveAlerts() {
    return await db.select().from(alerts)
      .where(and(eq(alerts.isRead, false)))
      .orderBy(desc(alerts.createdAt));
  }

  async getAlertsByStatus(status: string) {
    return await db.select().from(alerts)
      .where(eq(alerts.status, status))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert) {
    const [newAlert] = await db.insert(alerts).values(alert as any).returning();
    return newAlert;
  }

  async markAlertRead(id: number) {
    const [updatedAlert] = await db.update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id))
      .returning();
    return updatedAlert;
  }

  async updateAlertStatus(id: number, status: string) {
    const [updated] = await db.update(alerts)
      .set({ status, updatedAt: new Date(), isRead: status === "RESOLVED" })
      .where(eq(alerts.id, id))
      .returning();
    return updated;
  }

  async getRecentAlerts(minutesAgo: number) {
    const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000);
    return await db.select().from(alerts)
      .where(gte(alerts.createdAt, cutoff))
      .orderBy(desc(alerts.createdAt));
  }

  async getBreachRecords() {
    return await db.select().from(breach_records);
  }

  async createBreachRecord(record: InsertBreachRecord) {
    const [newRecord] = await db.insert(breach_records).values(record as any).returning();
    return newRecord;
  }

  async getInfraExposure() {
    return await db.select().from(infrastructure_exposure);
  }

  async createInfraExposure(exposure: InsertInfraExposure) {
    const [newExposure] = await db.insert(infrastructure_exposure).values(exposure as any).returning();
    return newExposure;
  }

  async getGithubExposure() {
    return await db.select().from(github_exposure);
  }

  async createGithubExposure(exposure: InsertGithubExposure) {
    const [newExposure] = await db.insert(github_exposure).values(exposure as any).returning();
    return newExposure;
  }

  async getAttackScenarios() {
    return await db.select().from(attack_scenarios);
  }

  async getAttackScenariosByDomain(domainId: number) {
    return await db.select().from(attack_scenarios).where(eq(attack_scenarios.domainId, domainId));
  }

  async deleteAttackScenariosByDomain(domainId: number) {
    await db.delete(attack_scenarios).where(eq(attack_scenarios.domainId, domainId));
  }

  async createAttackScenario(scenario: InsertAttackScenarioFull) {
    const [newScenario] = await db.insert(attack_scenarios).values(scenario as any).returning();
    return newScenario;
  }

  async getDeceptionAssets() {
    return await db.select().from(deception_assets);
  }

  async getDeceptionAssetByTokenId(tokenId: string) {
    const [found] = await db.select().from(deception_assets).where(eq(deception_assets.tokenId, tokenId));
    return found;
  }

  async createDeceptionAsset(asset: any) {
    const [newAsset] = await db.insert(deception_assets).values(asset as any).returning();
    return newAsset;
  }

  async triggerDeceptionAsset(id: number, data: { sourceIp: string; userAgent: string; geoLocation: string }) {
    const [updated] = await db.update(deception_assets)
      .set({
        triggered: true,
        status: "TRIGGERED",
        lastTriggeredAt: new Date(),
        sourceIp: data.sourceIp,
        userAgent: data.userAgent,
        geoLocation: data.geoLocation,
        triggerCount: sql`COALESCE(${deception_assets.triggerCount}, 0) + 1`,
        severityLevel: "CRITICAL",
      })
      .where(eq(deception_assets.id, id))
      .returning();
    return updated;
  }

  async deleteDeceptionAsset(id: number) {
    await db.delete(deception_assets).where(eq(deception_assets.id, id));
  }

  async getHoneyPersonas() {
    return await db.select().from(honey_personas);
  }

  async createHoneyPersona(persona: any) {
    const [newPersona] = await db.insert(honey_personas).values(persona as any).returning();
    return newPersona;
  }

  async retireHoneyPersona(id: number) {
    const [updated] = await db.update(honey_personas)
      .set({ status: "RETIRED" })
      .where(eq(honey_personas.id, id))
      .returning();
    return updated;
  }

  async updateRiskScore(id: number, data: { overallScore: number; classification: string }) {
    const [updated] = await db.update(risk_scores)
      .set(data)
      .where(eq(risk_scores.id, id))
      .returning();
    return updated;
  }

  async getDeepfakeExposureProfiles() {
    return await db.select().from(deepfake_exposure_profiles).orderBy(desc(deepfake_exposure_profiles.createdAt));
  }

  async createDeepfakeExposureProfile(profile: InsertDeepfakeExposureProfile) {
    const [newProfile] = await db.insert(deepfake_exposure_profiles).values(profile as any).returning();
    return newProfile;
  }

  async getDeepfakeScans() {
    return await db.select().from(deepfake_scans).orderBy(desc(deepfake_scans.createdAt));
  }

  async createDeepfakeScan(scan: any) {
    const [newScan] = await db.insert(deepfake_scans).values(scan as any).returning();
    return newScan;
  }

  async updateDeepfakeScan(id: number, data: Partial<DeepfakeScan>) {
    const [updated] = await db.update(deepfake_scans)
      .set(data as any)
      .where(eq(deepfake_scans.id, id))
      .returning();
    return updated;
  }

  async getRiskScores() {
    return await db.select().from(risk_scores).orderBy(desc(risk_scores.createdAt));
  }

  async createRiskScore(score: InsertRiskScore) {
    const [newScore] = await db.insert(risk_scores).values(score as any).returning();
    return newScore;
  }

  async getAuditLogs() {
    return await db.select().from(audit_logs).orderBy(desc(audit_logs.createdAt));
  }

  async createAuditLog(log: InsertAuditLog) {
    const lastLogs = await db.select().from(audit_logs).orderBy(desc(audit_logs.id)).limit(1);
    const prevHash = lastLogs.length > 0 ? (lastLogs[0].hashSignature || "") : "GENESIS";
    const logData = JSON.stringify({ ...log, prevHash, timestamp: Date.now() });
    const hashSignature = createHash("sha256").update(logData).digest("hex");
    const [newLog] = await db.insert(audit_logs).values({ ...log, hashSignature } as any).returning();
    return newLog;
  }

  async searchAuditLogs(filters: { entity?: string; action?: string; actor?: string }) {
    let query = db.select().from(audit_logs);
    const conditions = [];
    if (filters.entity) conditions.push(like(audit_logs.targetEntity, `%${filters.entity}%`));
    if (filters.action) conditions.push(like(audit_logs.action, `%${filters.action}%`));
    if (filters.actor) conditions.push(like(audit_logs.user, `%${filters.actor}%`));
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(audit_logs.createdAt));
    }
    return await query.orderBy(desc(audit_logs.createdAt));
  }

  async getIncidentReports() {
    return await db.select().from(incident_reports).orderBy(desc(incident_reports.createdAt));
  }

  async createIncidentReport(report: InsertIncidentReport) {
    const [newReport] = await db.insert(incident_reports).values(report as any).returning();
    return newReport;
  }

  async createDomain(domainInput: InsertDomain) {
    const [newDomain] = await db.insert(domains).values(domainInput).returning();
    return newDomain;
  }

  async getDomainByName(name: string) {
    const [found] = await db.select().from(domains).where(eq(domains.domain, name));
    return found;
  }

  async createEmail(email: InsertEmail) {
    const [newEmail] = await db.insert(emails).values(email).returning();
    return newEmail;
  }
}

export const storage = new DatabaseStorage();
