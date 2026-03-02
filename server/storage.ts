import { db } from "./db";
import {
  domains, emails, breach_records, infrastructure_exposure, github_exposure,
  attack_scenarios, deception_assets, honey_personas, deepfake_scans, alerts, risk_scores, audit_logs,
  type Alert, type AttackScenario, type BreachRecord, type DeceptionAsset,
  type HoneyPersona, type DeepfakeScan, type Domain, type Email, type GithubExposure,
  type InfraExposure, type RiskScore, type AuditLog,
  type InsertAlert, type InsertAttackScenario, type InsertBreachRecord,
  type InsertDeceptionAsset, type InsertHoneyPersona, type InsertDeepfakeScan, type InsertDomain,
  type InsertEmail, type InsertGithubExposure, type InsertInfraExposure,
  type InsertRiskScore, type InsertAuditLog
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

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
  }>;

  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertRead(id: number): Promise<Alert>;

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

  getDeepfakeScans(): Promise<DeepfakeScan[]>;
  createDeepfakeScan(scan: InsertDeepfakeScan): Promise<DeepfakeScan>;

  getRiskScores(): Promise<RiskScore[]>;
  createRiskScore(score: InsertRiskScore): Promise<RiskScore>;

  getAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

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

    return {
      activeAlerts: unreadAlerts.length,
      totalRiskScore: avgRiskScore,
      exposedAssets: allInfra.length,
      deceptionTokensTriggered: triggeredTokens.length
    };
  }

  async getAlerts() {
    return await db.select().from(alerts);
  }

  async createAlert(alert: InsertAlert) {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async markAlertRead(id: number) {
    const [updatedAlert] = await db.update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id))
      .returning();
    return updatedAlert;
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

  async getDeepfakeScans() {
    return await db.select().from(deepfake_scans);
  }

  async createDeepfakeScan(scan: InsertDeepfakeScan) {
    const [newScan] = await db.insert(deepfake_scans).values(scan).returning();
    return newScan;
  }

  async getRiskScores() {
    return await db.select().from(risk_scores);
  }

  async createRiskScore(score: InsertRiskScore) {
    const [newScore] = await db.insert(risk_scores).values(score as any).returning();
    return newScore;
  }

  async getAuditLogs() {
    return await db.select().from(audit_logs);
  }

  async createAuditLog(log: InsertAuditLog) {
    const [newLog] = await db.insert(audit_logs).values(log).returning();
    return newLog;
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
