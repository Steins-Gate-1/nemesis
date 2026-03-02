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

export interface IStorage {
  // Stats
  getDashboardStats(): Promise<{
    activeAlerts: number;
    totalRiskScore: number;
    exposedAssets: number;
    deceptionTokensTriggered: number;
  }>;

  // Alerts
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertRead(id: number): Promise<Alert>;

  // Threats
  getBreachRecords(): Promise<BreachRecord[]>;
  getInfraExposure(): Promise<InfraExposure[]>;
  getGithubExposure(): Promise<GithubExposure[]>;
  getAttackScenarios(): Promise<AttackScenario[]>;

  // Deception
  getDeceptionAssets(): Promise<DeceptionAsset[]>;
  createDeceptionAsset(asset: InsertDeceptionAsset): Promise<DeceptionAsset>;

  // Deepfake
  getDeepfakeScans(): Promise<DeepfakeScan[]>;
  createDeepfakeScan(scan: InsertDeepfakeScan): Promise<DeepfakeScan>;

  // Risk
  getRiskScores(): Promise<RiskScore[]>;

  // Audit
  getAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  
  // Scans
  createDomain(domain: InsertDomain): Promise<Domain>;
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

  async getInfraExposure() {
    return await db.select().from(infrastructure_exposure);
  }

  async getGithubExposure() {
    return await db.select().from(github_exposure);
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

  async getAuditLogs() {
    return await db.select().from(audit_logs);
  }

  async createAuditLog(log: InsertAuditLog) {
    const [newLog] = await db.insert(audit_logs).values(log).returning();
    return newLog;
  }

  async createDomain(domain: InsertDomain) {
    const [newDomain] = await db.insert(domains).values(domain).returning();
    return newDomain;
  }

  async createEmail(email: InsertEmail) {
    const [newEmail] = await db.insert(emails).values(email).returning();
    return newEmail;
  }
}

export const storage = new DatabaseStorage();
