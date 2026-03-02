import { db } from "./db";
import {
  domains, emails, breach_records, infrastructure_exposure, github_exposure,
  attack_scenarios, deception_assets, deepfake_scans, alerts, risk_scores, audit_logs,
  type Alert, type AttackScenario, type BreachRecord, type DeceptionAsset,
  type DeepfakeScan, type Domain, type Email, type GithubExposure,
  type InfraExposure, type RiskScore, type AuditLog,
  type InsertAlert, type InsertAttackScenario, type InsertBreachRecord,
  type InsertDeceptionAsset, type InsertDeepfakeScan, type InsertDomain,
  type InsertEmail, type InsertGithubExposure, type InsertInfraExposure,
  type InsertRiskScore, type InsertAuditLog
} from "@shared/schema";
import { eq } from "drizzle-orm";

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

  getDeceptionAssets(): Promise<DeceptionAsset[]>;
  createDeceptionAsset(asset: InsertDeceptionAsset): Promise<DeceptionAsset>;

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

  async getDeceptionAssets() {
    return await db.select().from(deception_assets);
  }

  async createDeceptionAsset(asset: InsertDeceptionAsset) {
    const [newAsset] = await db.insert(deception_assets).values(asset).returning();
    return newAsset;
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
