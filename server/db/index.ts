import type Database from 'better-sqlite3';
import type {
  AdminDossier,
  AdminOverview,
  AdminTelemetry,
  AuthUser,
  ChapterOneData,
  DossierRow,
  DossierSummaryContract,
  FullDossierData,
  LlmAnalysisJson,
  PromptTemplate,
  UserStats,
  UserBankSummary,
  UserBankRecord,
  AdminTaskSummary,
  AdminBankDetail,
  AdminBankListResult,
  AdminUserDetails,
  AdminUserListResult,
} from '../types.js';
import type {
  GlobalStatsContract,
  EchoWhisperContract,
  AdminEchoWhisperContract,
  EchoAuditStatus,
  DossierAttemptMetricsContract,
  AdminTimeRange,
} from '../../shared/apiContracts.js';
import { getRawDatabase, initDatabaseSync, databaseReady } from './connection.js';
import { UserRepo, type UserRow } from './repositories/userRepo.js';
import { DossierRepo } from './repositories/dossierRepo.js';
import { BankRepo } from './repositories/bankRepo.js';
import { TaskRepo, type UserTaskRow, type CustomTaskDefinitionRow } from './repositories/taskRepo.js';
import { EchoRepo } from './repositories/echoRepo.js';
import { AnalyticsRepo } from './repositories/analyticsRepo.js';
import { PromptRepo } from './repositories/promptRepo.js';
import { WhisperMailboxRepo } from './repositories/whisperMailboxRepo.js';
import { InterrogationRepo } from './repositories/interrogationRepo.js';
import { DictRepo } from './repositories/dictRepo.js';
import { AiAgentRepo } from './repositories/aiAgentRepo.js';
import {
  SecurityRepo,
  type RegisterHoneypotTriggerInput,
  type HoneypotBanRow,
  type RecordSecurityEventInput,
  type SecurityEventRow,
  type SecurityEventListParams,
  type SecurityEventListResult,
} from './repositories/securityRepo.js';
import {
  AbuseRepo,
  type ConsumeAbuseQuotaInput,
  type AbuseQuotaResult,
} from './repositories/abuseRepo.js';
export type {
  RegisterHoneypotTriggerInput,
  HoneypotBanRow,
  RecordSecurityEventInput,
  SecurityEventRow,
  SecurityEventListParams,
  SecurityEventListResult,
} from './repositories/securityRepo.js';
export type { ConsumeAbuseQuotaInput, AbuseQuotaResult } from './repositories/abuseRepo.js';

export {
  databaseReady,
  initDatabaseSync,
  getRawDatabase,
  UserRepo,
  DossierRepo,
  BankRepo,
  TaskRepo,
  EchoRepo,
  AnalyticsRepo,
  PromptRepo,
  SecurityRepo,
  AbuseRepo,
  WhisperMailboxRepo,
  DictRepo,
};

import { upgradeSensitiveStorageEncryption as upgradeSensitiveStorageEncryptionInternal } from './crypto.js';

export async function upgradeSensitiveStorageEncryption(database?: Database.Database): Promise<void> {
  const raw = database || getRawDatabase();
  upgradeSensitiveStorageEncryptionInternal(raw);
}
export type { CustomTaskDefinitionRow } from './repositories/taskRepo.js';

export class DatabaseFacade {
  private rawDb: Database.Database;
  public users: UserRepo;
  public dossiers: DossierRepo;
  public banks: BankRepo;
  public tasks: TaskRepo;
  public echoes: EchoRepo;
  public analytics: AnalyticsRepo;
  public prompts: PromptRepo;
  public security: SecurityRepo;
  public abuse: AbuseRepo;
  public mailbox: WhisperMailboxRepo;
  /** 审讯室（测试功能）：额度配置 + 会话/消息，全部按 user_id 归属。 */
  public interrogation: InterrogationRepo;
  /** 动态数据字典与状态机引擎 */
  public dict: DictRepo;
  /** AI 智能体能力与动态变量中台 */
  public aiAgent: AiAgentRepo;

  constructor(rawDb?: Database.Database) {
    this.rawDb = initDatabaseSync(rawDb);
    this.users = new UserRepo(this.rawDb);
    this.dossiers = new DossierRepo(this.rawDb);
    this.banks = new BankRepo(this.rawDb);
    this.tasks = new TaskRepo(this.rawDb);
    this.echoes = new EchoRepo(this.rawDb);
    this.analytics = new AnalyticsRepo(this.rawDb);
    this.prompts = new PromptRepo(this.rawDb);
    this.security = new SecurityRepo(this.rawDb);
    this.abuse = new AbuseRepo(this.rawDb);
    this.mailbox = new WhisperMailboxRepo(this.rawDb);
    this.interrogation = new InterrogationRepo(this.rawDb);
    this.dict = new DictRepo(this.rawDb);
    this.aiAgent = new AiAgentRepo(this.rawDb);
  }

  // ================= Security Methods =================
  async getHoneypotBan(ipKey: string): Promise<HoneypotBanRow | null> {
    return this.security.getHoneypotBan(ipKey);
  }

  async registerHoneypotTrigger(input: RegisterHoneypotTriggerInput): Promise<HoneypotBanRow> {
    return this.security.registerHoneypotTrigger(input);
  }

  async deleteHoneypotBan(ipKey: string): Promise<boolean> {
    return this.security.deleteHoneypotBan(ipKey);
  }

  async countActiveHoneypotBans(nowMs: number): Promise<number> {
    return this.security.countActiveHoneypotBans(nowMs);
  }

  async clearHoneypotBans(): Promise<void> {
    return this.security.clearHoneypotBans();
  }

  async recordSecurityEvent(input: RecordSecurityEventInput): Promise<SecurityEventRow> {
    return this.security.recordSecurityEvent(input);
  }

  async listSecurityEvents(params: SecurityEventListParams): Promise<SecurityEventListResult> {
    return this.security.listSecurityEvents(params);
  }

  async countRecentSecurityEvents(
    eventType: string,
    ipAddress: string,
    sinceMs: number,
    userAgent?: string
  ): Promise<number> {
    return this.security.countRecentSecurityEvents(eventType, ipAddress, sinceMs, userAgent);
  }

  async verifySecurityEventChain(): Promise<boolean> {
    return this.security.verifySecurityEventChain();
  }

  async reanchorSecurityEventChain(): Promise<boolean> {
    return this.security.reanchorSecurityEventChain();
  }

  async clearSecurityEvents(): Promise<void> {
    return this.security.clearSecurityEvents();
  }

  async consumeAbuseQuota(input: ConsumeAbuseQuotaInput): Promise<AbuseQuotaResult> {
    return this.abuse.consumeQuota(input);
  }

  async clearAbuseQuotas(): Promise<void> {
    return this.abuse.clearQuotas();
  }

  // ================= User Methods =================
  async bindUserDevice(userId: string, deviceId: string): Promise<void> {
    return this.users.bindUserDevice(userId, deviceId);
  }

  async findUserByEmail(email: string): Promise<AuthUser & { passwordHash: string; createdAt: string } | null> {
    return this.users.findUserByEmail(email);
  }

  async findAnyUserByEmail(email: string): Promise<UserRow | null> {
    return this.users.findAnyUserByEmail(email);
  }

  async findUserById(id: string): Promise<AuthUser & { passwordHash: string; createdAt: string } | null> {
    return this.users.findUserById(id);
  }

  async countUsersByEmail(email: string): Promise<number> {
    return this.users.countUsersByEmail(email);
  }

  async createUser(email: string, passwordHash: string): Promise<AuthUser> {
    return this.users.createUser(email, passwordHash);
  }

  async upsertUserBasicInfo(userId: string, input: ChapterOneData): Promise<void> {
    return this.users.upsertUserBasicInfo(userId, input);
  }

  async getUserBasicInfo(userId: string): Promise<ChapterOneData | null> {
    return this.users.getUserBasicInfo(userId);
  }

  async getDeviceBasicInfo(deviceId: string): Promise<ChapterOneData | null> {
    return this.users.getDeviceBasicInfo(deviceId, (row) => this.dossiers.formatDossierRow(row));
  }

  async hasUserBasicInfo(userId: string): Promise<boolean> {
    return this.users.hasUserBasicInfo(userId);
  }

  async updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
    return this.users.updateUserPassword(userId, newPasswordHash);
  }

  async softDeleteUser(userId: string): Promise<void> {
    return this.users.softDeleteUser(userId);
  }

  async getUserStats(userId: string): Promise<UserStats | null> {
    return this.users.getUserStats(userId);
  }

  async listAdminUsers(query: {
    search?: string;
    hasDossier?: 'all' | 'yes' | 'no';
    status?: 'all' | 'active' | 'deleted';
    sort?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<AdminUserListResult> {
    return this.users.listAdminUsers(query);
  }

  async getAdminUserDetails(userId: string): Promise<AdminUserDetails | null> {
    return this.users.getAdminUserDetails(userId, (bankIds) => this.banks.resolveBankNames(bankIds));
  }

  async deleteAdminUser(userId: string): Promise<boolean> {
    return this.users.deleteAdminUser(userId);
  }

  // ================= Dossier Methods =================
  async saveDossier(
    userId: string | null,
    deviceId: string | null,
    fullDossierData: FullDossierData,
    diagnosticResult: LlmAnalysisJson
  ): Promise<{ id: string; createdAt: string }> {
    return this.dossiers.saveDossier(userId, deviceId, fullDossierData, diagnosticResult);
  }

  async getLatestDossierSummaryByUserId(userId: string): Promise<DossierSummaryContract | null> {
    return this.dossiers.getLatestDossierSummaryByUserId(userId);
  }

  async listDossierSummariesByUserId(userId: string): Promise<DossierSummaryContract[]> {
    return this.dossiers.listDossierSummariesByUserId(userId);
  }

  async listDossierCompletionRows(
    owner: { userId: string } | { deviceId: string }
  ): Promise<{ id: string; bankIds: string[]; createdAt: string }[]> {
    return this.dossiers.listDossierCompletionRows(owner);
  }

  async listDossierAttemptMetricsForBank(
    userId: string,
    bankId: string
  ): Promise<DossierAttemptMetricsContract[]> {
    return this.dossiers.listDossierAttemptMetricsForBank(userId, bankId);
  }

  async resolveBankNames(bankIds: string[]): Promise<Record<string, string>> {
    return this.banks.resolveBankNames(bankIds);
  }

  async getDossierByIdForUser(id: string, userId: string): Promise<DossierRow | null> {
    return this.dossiers.getDossierByIdForUser(id, userId);
  }

  async getDossierHistoryByUserId(userId: string): Promise<DossierRow[]> {
    return this.dossiers.getDossierHistoryByUserId(userId);
  }

  async getAllDossierHistory(): Promise<DossierRow[]> {
    return this.dossiers.getAllDossierHistory();
  }

  async getOccupationStats(): Promise<{ occupation: string; count: number }[]> {
    return this.dossiers.getOccupationStats();
  }

  async countDossiers(): Promise<number> {
    return this.dossiers.countDossiers();
  }

  async listAdminDossiers(input: {
    search?: string;
    depth?: string;
    credibility?: string;
    status?: string;
    sort?: 'submitTime' | 'credibilityScore' | 'durationSeconds';
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; items: AdminDossier[]; bankNames: Record<string, string> }> {
    return this.dossiers.listAdminDossiers(input, (bankIds) => this.banks.resolveBankNames(bankIds));
  }

  async getAdminDossierById(id: string): Promise<AdminDossier | null> {
    return this.dossiers.getAdminDossierById(id);
  }

  async getDossierRowById(id: string): Promise<DossierRow | null> {
    return this.dossiers.getDossierRowById(id);
  }

  async getOwnedDossierRow(
    id: string,
    identity: { userId?: string | null; deviceId?: string | null }
  ): Promise<DossierRow | null> {
    return this.dossiers.getOwnedDossierRow(id, identity);
  }

  async updateDossierAdmin(
    id: string,
    patch: { auditStatus?: string; adminNotes?: string }
  ): Promise<boolean> {
    return this.dossiers.updateDossierAdmin(id, patch);
  }

  async deleteDossierById(id: string): Promise<boolean> {
    return this.dossiers.deleteDossierById(id);
  }

  async deleteDossiersByUserId(userId: string): Promise<number> {
    return this.dossiers.deleteDossiersByUserId(userId);
  }

  async updateDossierResonance(
    id: string,
    resonanceLevel: 'exact' | 'partial' | 'guarded' | 'custom',
    resonanceText: string | null = null,
    userId?: string | null,
    deviceId?: string | null
  ): Promise<boolean> {
    return this.dossiers.updateDossierResonance(id, resonanceLevel, resonanceText, userId, deviceId);
  }

  async batchDeleteDossiers(ids: string[]): Promise<number> {
    return this.dossiers.batchDeleteDossiers(ids);
  }

  async updateDossierDiagnostic(id: string, diagnostic: unknown): Promise<boolean> {
    return this.dossiers.updateDossierDiagnostic(id, diagnostic);
  }

  async updateDossierDiagnosticForOwner(
    id: string,
    diagnostic: unknown,
    identity: { userId?: string | null; deviceId?: string | null }
  ): Promise<boolean> {
    return this.dossiers.updateDossierDiagnosticForOwner(id, diagnostic, identity);
  }

  // ================= Bank Methods =================
  async createUserBank(input: {
    userId: string;
    title: string;
    subtitle?: string;
    description?: string;
    category?: 'scientific' | 'direct' | 'scenario' | 'preference';
    badgeColor?: string | null;
    estimatedMinutes?: number | null;
    questions: unknown[];
    isPublished?: boolean;
  }): Promise<{ id: string; createdAt: string; updatedAt: string }> {
    return this.banks.createUserBank(input);
  }

  async getUserBanks(userId: string): Promise<UserBankSummary[]> {
    return this.banks.getUserBanks(userId);
  }

  async getUserBankById(id: string, userId: string): Promise<UserBankRecord | null> {
    return this.banks.getUserBankById(id, userId);
  }

  async getPublishedUserBanks(): Promise<UserBankSummary[]> {
    return this.banks.getPublishedUserBanks();
  }

  async getPublishedUserBankById(id: string): Promise<UserBankRecord | null> {
    return this.banks.getPublishedUserBankById(id);
  }

  async updateUserBank(
    id: string,
    userId: string,
    patch: {
      title?: string;
      subtitle?: string;
      description?: string;
      category?: 'scientific' | 'direct' | 'scenario' | 'preference';
      badgeColor?: string | null;
      estimatedMinutes?: number | null;
      questions?: unknown[];
      isPublished?: boolean;
    }
  ): Promise<boolean> {
    return this.banks.updateUserBank(id, userId, patch);
  }

  async deleteUserBank(id: string, userId: string): Promise<boolean> {
    return this.banks.deleteUserBank(id, userId);
  }

  async listAdminBanks(query: {
    search?: string;
    category?: string;
    status?: string;
    source?: string;
    sort?: 'createdAt' | 'updatedAt' | 'title' | 'questionCount';
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<AdminBankListResult> {
    return this.banks.listAdminBanks(query);
  }

  async getAdminBankById(id: string): Promise<AdminBankDetail | null> {
    return this.banks.getAdminBankById(id);
  }

  async createAdminBank(input: {
    title: string;
    subtitle?: string;
    description?: string;
    category?: 'scientific' | 'direct' | 'scenario' | 'preference';
    badgeColor?: string | null;
    estimatedMinutes?: number | null;
    questions?: unknown[];
    isPublished?: boolean;
    userId?: string | null;
  }): Promise<AdminBankDetail> {
    return this.banks.createAdminBank(input);
  }

  async updateAdminBank(
    id: string,
    patch: {
      title?: string;
      subtitle?: string;
      description?: string;
      category?: 'scientific' | 'direct' | 'scenario' | 'preference';
      badgeColor?: string | null;
      estimatedMinutes?: number | null;
      questions?: unknown[];
      isPublished?: boolean;
    }
  ): Promise<{ status: 'ok' | 'not_found' | 'preset'; bank?: AdminBankDetail }> {
    return this.banks.updateAdminBank(id, patch);
  }

  async toggleAdminBankPublish(id: string): Promise<{ status: 'ok' | 'not_found' | 'preset'; bank?: AdminBankDetail }> {
    return this.banks.toggleAdminBankPublish(id);
  }

  async setAdminBankAuditStatus(
    id: string,
    status: 'approved' | 'rejected'
  ): Promise<{ status: 'ok' | 'not_found' | 'preset'; bank?: AdminBankDetail }> {
    return this.banks.setAdminBankAuditStatus(id, status);
  }

  async deleteAdminBank(id: string): Promise<'ok' | 'not_found' | 'preset'> {
    return this.banks.deleteAdminBank(id);
  }

  // ================= Task Methods =================
  async getUserTasks(userId: string): Promise<UserTaskRow[]> {
    return this.tasks.getUserTasks(userId);
  }

  async getUserActiveTask(userId: string, taskId: string): Promise<UserTaskRow | null> {
    return this.tasks.getUserActiveTask(userId, taskId);
  }

  async createUserTask(userId: string, taskId: string): Promise<UserTaskRow> {
    return this.tasks.createUserTask(userId, taskId);
  }

  async completeUserTask(
    userTaskId: string,
    textContent: string,
    attachmentsJson: string
  ): Promise<void> {
    return this.tasks.completeUserTask(userTaskId, textContent, attachmentsJson);
  }

  async abandonUserTask(userTaskId: string): Promise<void> {
    return this.tasks.abandonUserTask(userTaskId);
  }

  async getCompletedTasksCount(userId: string): Promise<number> {
    return this.tasks.getCompletedTasksCount(userId);
  }

  async createCustomTaskDefinition(
    userId: string,
    title: string,
    description: string,
    category: string
  ): Promise<CustomTaskDefinitionRow> {
    return this.tasks.createCustomTaskDefinition(userId, title, description, category);
  }

  async getCustomTaskDefinitions(userId: string): Promise<CustomTaskDefinitionRow[]> {
    return this.tasks.getCustomTaskDefinitions(userId);
  }

  async getTotalAcceptedTasksCount(userId: string): Promise<number> {
    return this.tasks.getTotalAcceptedTasksCount(userId);
  }

  async listAdminTasks(input: {
    limit?: number;
    offset?: number;
    status?: string;
    category?: string;
  }): Promise<{ total: number; items: AdminTaskSummary[] }> {
    return this.tasks.listAdminTasks(input);
  }

  async getSpecialEvaluation(
    taskType: string,
    deviceId: string,
    userId?: string | null
  ) {
    return this.tasks.getSpecialEvaluation(taskType, deviceId, userId);
  }

  async getSpecialPriceLeaderboard(
    taskType: string,
    deviceId: string,
    userId?: string | null
  ) {
    return this.tasks.getSpecialPriceLeaderboard(taskType, deviceId, userId);
  }

  async voteSpecialEvaluation(
    evaluationId: string,
    deviceId: string,
    userId: string | null,
    voteType: 'up' | 'down'
  ) {
    return this.tasks.voteSpecialEvaluation(evaluationId, deviceId, userId, voteType);
  }

  async saveSpecialEvaluation(payload: {
    taskType: string;
    deviceId: string;
    userId?: string | null;
    price: number;
    selfEvaluation: string;
    force?: boolean;
  }) {
    return this.tasks.saveSpecialEvaluation(payload);
  }

  async listAdminSpecialEvaluations(input: {
    taskType?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: 'price' | 'createdAt' | 'updatedAt';
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) {
    return this.tasks.listAdminSpecialEvaluations(input);
  }

  // ================= Echo Methods =================
  async listApprovedEchoes(
    deviceId?: string | null,
    tag?: string | null,
    limit = 30,
    offset = 0,
    userId?: string | null
  ): Promise<{ items: EchoWhisperContract[]; hasMore: boolean }> {
    return this.echoes.listApprovedEchoes(deviceId, tag, limit, offset, userId);
  }

  async listMyPendingEchoes(deviceId: string, userId?: string | null): Promise<EchoWhisperContract[]> {
    return this.echoes.listMyPendingEchoes(deviceId, userId);
  }

  async createEchoWhisper(payload: {
    deviceId: string;
    userId?: string | null;
    surfaceRole: string;
    shadowDesire: string;
    shadowTag: string;
  }): Promise<EchoWhisperContract> {
    return this.echoes.createEchoWhisper(payload);
  }

  async resonateEchoWhisper(
    echoId: string,
    deviceId: string,
    userId?: string | null
  ): Promise<{ echoCount: number; fuzzedEchoes: string; isResonated: boolean }> {
    return this.echoes.resonateEchoWhisper(echoId, deviceId, userId);
  }

  async deleteEchoWhisper(echoId: string, deviceId: string, userId?: string | null): Promise<boolean> {
    return this.echoes.deleteEchoWhisper(echoId, deviceId, userId);
  }

  async listAdminEchoes(query: {
    status?: string;
    tag?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: AdminEchoWhisperContract[]; total: number }> {
    return this.echoes.listAdminEchoes(query);
  }

  async updateAdminEchoStatus(
    id: string,
    auditStatus: EchoAuditStatus,
    options?: { adminNotes?: string; remark?: string }
  ): Promise<boolean> {
    return this.echoes.updateAdminEchoStatus(id, auditStatus, options);
  }

  async batchDeleteEchoes(ids: string[]): Promise<number> {
    return this.echoes.batchDeleteEchoes(ids);
  }

  async getPendingAuditCounts(): Promise<{ banks: number; echoes: number }> {
    return this.echoes.getPendingAuditCounts();
  }

  // ================= Analytics & Visits Methods =================
  async recordVisit(deviceId: string, path: string, referrer = '', regionCode = '', userAgent = '', secFetchSite = ''): Promise<void> {
    return this.analytics.recordVisit(deviceId, path, referrer, regionCode, userAgent, secFetchSite);
  }

  async recordEvent(deviceId: string, eventType: string, dossierId = ''): Promise<void> {
    return this.analytics.recordEvent(deviceId, eventType, dossierId);
  }

  async getVisitStats(): Promise<{ todayVisits: number; todayVisitors: number; totalVisits: number }> {
    return this.analytics.getVisitStats();
  }

  async getMetricsForPeriod(start: string, end: string): Promise<{ visits: number; visitors: number; users: number; dossiers: number; uniquePeople: number }> {
    return this.analytics.getMetricsForPeriod(start, end);
  }

  async getAdminOverview(
    range: AdminTimeRange = 'today',
    customDate?: string
  ): Promise<AdminOverview> {
    return this.analytics.getAdminOverview(range, customDate, (bankIds) => this.banks.resolveBankNames(bankIds));
  }

  async getAdminTelemetry(
    range: AdminTimeRange = 'today',
    customDate?: string
  ): Promise<AdminTelemetry> {
    return this.analytics.getAdminTelemetry(range, customDate, (bankIds) => this.banks.resolveBankNames(bankIds));
  }

  async getGlobalPublicStats(): Promise<GlobalStatsContract> {
    return this.analytics.getGlobalPublicStats();
  }

  async logApiError(input: {
    endpoint: string;
    errorMessage: string;
    stackTrace: string;
    payload: string;
    deviceId?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
  }): Promise<void> {
    return this.analytics.logApiError(input);
  }
  async getErrorLogs(limit = 100): Promise<unknown[]> {
    return this.analytics.getErrorLogs(limit);
  }

  // ================= Prompt Template Methods =================
  async listPromptTemplates(agentId?: string): Promise<PromptTemplate[]> {
    return this.prompts.listPromptTemplates(agentId);
  }

  async getActivePromptTemplate(category?: string): Promise<PromptTemplate | null> {
    return this.prompts.getActivePromptTemplate(category);
  }

  async getPromptTemplateById(id: string): Promise<PromptTemplate | null> {
    return this.prompts.getPromptTemplateById(id);
  }

  async getPromptCategoryConflicts(
    targetId: string,
    targetCategories: string[]
  ): Promise<{ category: string; conflictingTemplateId: string; conflictingTemplateName: string }[]> {
    return this.prompts.getCategoryConflicts(targetId, targetCategories);
  }

  async createPromptTemplate(input: {
    name: string;
    description: string;
    content: string;
    categories?: string[];
  }): Promise<PromptTemplate> {
    return this.prompts.createPromptTemplate(input);
  }

  async updatePromptTemplate(
    id: string,
    patch: { name?: string; description?: string; content?: string; categories?: string[] }
  ): Promise<PromptTemplate | null> {
    return this.prompts.updatePromptTemplate(id, patch);
  }

  async activatePromptTemplate(id: string): Promise<PromptTemplate | null> {
    return this.prompts.activatePromptTemplate(id);
  }

  async deletePromptTemplate(id: string): Promise<'deleted' | 'not_found' | 'active' | 'builtin'> {
    return this.prompts.deletePromptTemplate(id);
  }
}

export const db = new DatabaseFacade();
