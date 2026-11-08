import type Database from 'better-sqlite3';
import type {
  AdminDossier,
  ChapterOneData,
  ChapterTwoData,
  ChapterThreeData,
  DossierRow,
  DossierSummaryContract,
  FullDossierData,
  LlmAnalysisJson,
} from '../../types.js';
import type { DossierAttemptMetricsContract } from '../../../shared/apiContracts.js';
import {
  genId,
  analyticsQuestionLogs,
  safeJsonParse,
} from '../helpers.js';
import {
  encodeJsonField,
  decodeJsonField,
  encodePrivateJson,
  decodePrivateJson,
} from '../crypto.js';
import {
  encryptFields,
  decryptFields,
  isFieldEncryptionEnabled,
} from '../../utils/fieldCrypto.js';

export interface DossierRowDb {
  id: string;
  user_id: string | null;
  device_id: string | null;
  email: string | null;
  nickname: string;
  avatar_urls: string;
  gender?: string | null;
  occupation: string;
  persona_trait: string;
  age: string;
  marital_status: string;
  has_boyfriend: string;
  surface_trait: string;
  inner_desire: string;
  boundary_text: string;
  fantasy_text: string;
  relation_preference: string;
  awakening_moment: string;
  depth_rating: string;
  selected_shadow_tags: string;
  secret_words: string;
  secret_rule: string;
  telemetry_json: string;
  diagnostic_result_json: string;
  quiz_payload_json?: string | null;
  bank_ids?: string | null;
  audit_status?: string | null;
  admin_notes?: string | null;
  resonance_level?: string | null;
  resonance_text?: string | null;
  resonance_at?: string | null;
  created_at: string;
}

/** 逗号分隔的题库 ID 串 → 去空数组（与前端 DossierSummaryContract.bankIds 口径一致）。 */
function splitBankIds(raw: string | null | undefined): string[] {
  return (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

function toOptionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** 归一化 0-100 指标：只做边界收敛，避免异常数值撑破前端进度条。 */
function toOptionalScore(value: unknown): number | null {
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export class DossierRepo {
  constructor(private db: Database.Database) {}

  formatDossierRow(row: DossierRowDb, strict = true): DossierRow {
    let decrypted: Record<string, string>;
    try {
      decrypted = decryptFields(row.id, {
        surface_trait: row.surface_trait,
        inner_desire: row.inner_desire,
        boundary_text: row.boundary_text,
        fantasy_text: row.fantasy_text,
        relation_preference: row.relation_preference,
        awakening_moment: row.awakening_moment,
        secret_words: row.secret_words,
        secret_rule: row.secret_rule,
        resonance_text: row.resonance_text ?? '',
      });
    } catch (err) {
      if (strict) throw err;
      decrypted = {
        surface_trait: '[密文保护(未配置FIELD_ENC_KEY)]',
        inner_desire: '[密文保护(未配置FIELD_ENC_KEY)]',
        boundary_text: '[密文保护(未配置FIELD_ENC_KEY)]',
        fantasy_text: '[密文保护(未配置FIELD_ENC_KEY)]',
        relation_preference: '[密文保护(未配置FIELD_ENC_KEY)]',
        awakening_moment: '[密文保护(未配置FIELD_ENC_KEY)]',
        secret_words: '[密文保护(未配置FIELD_ENC_KEY)]',
        secret_rule: '[密文保护(未配置FIELD_ENC_KEY)]',
        resonance_text: '',
      };
    }
    const quizPayload = decodePrivateJson<Record<string, unknown> | null>(
      row.id,
      'quiz_payload_json',
      row.quiz_payload_json,
      null
    );
    const chapterDurations = (quizPayload && typeof quizPayload === 'object'
      ? quizPayload.chapterDurations
      : undefined) as { chapter1?: number; chapter2?: number; chapter3?: number } | undefined;
    return {
      id: row.id,
      userId: row.user_id,
      deviceId: row.device_id ?? null,
      email: row.email,
      chapter1: {
        nickname: row.nickname,
        avatarUrls: decodeJsonField(row.id, 'avatar_urls', row.avatar_urls, []),
        avatarUrl: decodeJsonField<string[]>(row.id, 'avatar_urls', row.avatar_urls, [])[0] || '',
        gender: row.gender ?? '',
        occupation: row.occupation,
        personaTrait: row.persona_trait,
        age: row.age,
        maritalStatus: row.marital_status,
        hasBoyfriend: row.has_boyfriend,
        surfaceTrait: decrypted.surface_trait,
        innerDesire: decrypted.inner_desire,
        ...(chapterDurations?.chapter1 !== undefined
          ? { durationSeconds: chapterDurations.chapter1 }
          : {}),
      },
      chapter2: {
        boundaryText: decrypted.boundary_text,
        fantasyText: decrypted.fantasy_text,
        relationPreference: decrypted.relation_preference,
        awakeningMoment: decrypted.awakening_moment,
        ...(chapterDurations?.chapter2 !== undefined
          ? { durationSeconds: chapterDurations.chapter2 }
          : {}),
      },
      chapter3: {
        secretWords: decrypted.secret_words,
        secretRule: decrypted.secret_rule,
        ...(chapterDurations?.chapter3 !== undefined
          ? { durationSeconds: chapterDurations.chapter3 }
          : {}),
      },
      depthRating: (row.depth_rating ?? 'medium') as 'light' | 'medium' | 'deep',
      selectedShadowTags: decodeJsonField(row.id, 'selected_shadow_tags', row.selected_shadow_tags, []),
      telemetry: decodePrivateJson(row.id, 'telemetry_json', row.telemetry_json, {}),
      diagnosticResult: decodePrivateJson(row.id, 'diagnostic_result_json', row.diagnostic_result_json, null),
      quizPayload,
      bankIds: row.bank_ids ?? '',
      resonanceLevel: (row.resonance_level as 'exact' | 'partial' | 'guarded' | 'custom') ?? null,
      resonanceText: decrypted.resonance_text || null,
      resonanceAt: row.resonance_at ?? null,
      createdAt: row.created_at,
    };
  }

  formatAdminDossier(row: DossierRowDb, includeFullPayload = false): AdminDossier {
    let decrypted: Record<string, string> = {};
    try {
      decrypted = decryptFields(row.id, {
        surface_trait: row.surface_trait,
        inner_desire: row.inner_desire,
        boundary_text: row.boundary_text,
        fantasy_text: row.fantasy_text,
        relation_preference: row.relation_preference,
        awakening_moment: row.awakening_moment,
        secret_words: row.secret_words,
        secret_rule: row.secret_rule,
        resonance_text: row.resonance_text ?? '',
      });
    } catch {
      decrypted = {
        surface_trait: row.surface_trait ?? '',
        inner_desire: row.inner_desire ?? '',
        boundary_text: row.boundary_text ?? '',
        fantasy_text: row.fantasy_text ?? '',
        relation_preference: row.relation_preference ?? '',
        awakening_moment: row.awakening_moment ?? '',
        secret_words: row.secret_words ?? '',
        secret_rule: row.secret_rule ?? '',
        resonance_text: row.resonance_text ?? '',
      };
    }

    let diag: Record<string, unknown> = {};
    try {
      diag = decodePrivateJson<Record<string, unknown>>(row.id, 'diagnostic_result_json', row.diagnostic_result_json, {});
    } catch {
      diag = safeJsonParse(row.diagnostic_result_json, {});
    }

    let quiz: Record<string, unknown> = {};
    try {
      quiz = decodePrivateJson<Record<string, unknown>>(row.id, 'quiz_payload_json', row.quiz_payload_json, {});
    } catch {
      quiz = safeJsonParse(row.quiz_payload_json, {});
    }

    const avatarUrls: string[] = decodeJsonField<string[]>(row.id, 'avatar_urls', row.avatar_urls, []);
    const shadowTags: string[] = decodeJsonField<string[]>(row.id, 'selected_shadow_tags', row.selected_shadow_tags, []);

    return {
      id: row.id,
      userId: row.user_id,
      deviceId: row.device_id,
      email: row.email,
      submitTime: row.created_at,
      createdAt: row.created_at,
      nickname: row.nickname || '',
      avatarUrls,
      gender: row.gender ?? '',
      occupation: row.occupation || '',
      personaTrait: row.persona_trait || '',
      age: row.age || '',
      maritalStatus: row.marital_status || '',
      hasBoyfriend: row.has_boyfriend || '',
      depthRating: (row.depth_rating as AdminDossier['depthRating']) || 'medium',
      credibilityScore: Number(diag.credibilityScore ?? 0),
      credibilityLevel: (diag.credibilityLevel as AdminDossier['credibilityLevel']) ?? 'low',
      archetypeTitle: String(diag.archetypeTitle ?? ''),
      archetypeSubtitle: String(diag.archetypeSubtitle ?? ''),
      dominanceIndex: Number(diag.dominanceIndex ?? 0),
      submissionIndex: Number(diag.submissionIndex ?? 0),
      restraintIndex: Number(diag.restraintIndex ?? 0),
      sensoryThreshold: Number(diag.sensoryThreshold ?? 0),
      personaDeconstruction: String(diag.personaDeconstruction ?? ''),
      shadowDeconstruction: String(diag.shadowDeconstruction ?? ''),
      psychologicalSublimation: String(diag.psychologicalSublimation ?? ''),
      resonanceKeywords: Array.isArray(diag.resonanceKeywords) ? (diag.resonanceKeywords as string[]) : [],
      selectedShadowTags: shadowTags,
      durationSeconds: Number(quiz.totalDurationSeconds ?? 0),
      auditStatus: (row.audit_status as AdminDossier['auditStatus']) ?? 'pending',
      adminNotes: row.admin_notes ?? '',
      bankIds: row.bank_ids ?? '',
      resonanceLevel: (row.resonance_level as AdminDossier['resonanceLevel']) ?? null,
      resonanceText: decrypted.resonance_text || null,
      resonanceAt: row.resonance_at ?? null,
      q_occupation: row.occupation || '',
      q_surfaceTrait: decrypted.surface_trait || '',
      q_innerDesire: decrypted.inner_desire || '',
      q_boundaryText: decrypted.boundary_text || '',
      q_relationPreference: decrypted.relation_preference || '',
      q_awakeningMoment: decrypted.awakening_moment || '',
      q_secretWords: decrypted.secret_words || '',
      q_secretRule: decrypted.secret_rule || '',
      telemetry: null as any,
      ...(includeFullPayload
        ? {
            diagnosticResult: diag as unknown as LlmAnalysisJson,
            quizPayload: quiz as unknown as AdminDossier['quizPayload'],
          }
        : {}),
    };
  }

  private toDossierSummary(row: DossierRow): DossierSummaryContract {
    return {
      id: row.id,
      bankIds: (row.bankIds ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      createdAt: row.createdAt,
      chapter1: row.chapter1,
      depthRating: row.depthRating,
      selectedShadowTags: row.selectedShadowTags,
      resonanceLevel: row.resonanceLevel ?? null,
      resonanceText: row.resonanceText ?? null,
      resonanceAt: row.resonanceAt ?? null,
    };
  }

  async saveDossier(
    userId: string | null,
    deviceId: string | null,
    fullDossierData: FullDossierData,
    diagnosticResult: LlmAnalysisJson
  ): Promise<{ id: string; createdAt: string }> {
    const ch1: ChapterOneData = fullDossierData?.chapter1 ?? {};
    const ch2: ChapterTwoData = fullDossierData?.chapter2 ?? {};
    const ch3: ChapterThreeData = fullDossierData?.chapter3 ?? {};
    const email: string | null = null;

    const id = genId('dos');
    const createdAt = new Date().toISOString();
    const tagsJson = encodeJsonField(id, 'selected_shadow_tags', fullDossierData?.selectedShadowTags ?? []);
    const telemetry = (fullDossierData?.telemetry ?? {}) as Record<string, unknown>;
    const telemetryJson = encodePrivateJson(id, 'telemetry_json', {
      hesitationPauses: telemetry.hesitationPauses ?? 0,
      deletionRatePercent: telemetry.deletionRatePercent ?? 0,
      flipFlopCount: telemetry.flipFlopCount ?? 0,
    }, telemetry);
    const diagnosticJson = encodePrivateJson(id, 'diagnostic_result_json', {
      credibilityScore: diagnosticResult.credibilityScore,
      credibilityLevel: diagnosticResult.credibilityLevel,
    }, diagnosticResult);
    const avatarUrlsJson = encodeJsonField(id, 'avatar_urls', ch1.avatarUrls ?? (ch1.avatarUrl ? [ch1.avatarUrl] : []));

    const sensitiveFields: Record<string, string> = {
      surface_trait: ch1.surfaceTrait ?? '',
      inner_desire: ch1.innerDesire ?? '',
      boundary_text: ch2.boundaryText ?? '',
      fantasy_text: ch2.fantasyText ?? '',
      relation_preference: ch2.relationPreference ?? '',
      awakening_moment: ch2.awakeningMoment ?? '',
      secret_words: ch3.secretWords ?? '',
      secret_rule: ch3.secretRule ?? '',
    };
    const encryptedSensitive = isFieldEncryptionEnabled()
      ? encryptFields(id, sensitiveFields)
      : sensitiveFields;

    const quizPayload = {
      completedBanks: fullDossierData?.completedBanks ?? [],
      questionLogs: fullDossierData?.questionLogs ?? [],
      aggregatedScores: fullDossierData?.aggregatedScores ?? {},
      collectedTags: fullDossierData?.collectedTags ?? [],
      userTextAnswers: fullDossierData?.userTextAnswers ?? {},
      userMediaAttachments: fullDossierData?.userMediaAttachments ?? {},
      totalDurationSeconds: fullDossierData?.totalDurationSeconds ?? 0,
      // 章节填写时长无独立列，并入 quiz 私有信封随卷宗落库（历史行无此键，读回时自然缺省）
      chapterDurations: {
        chapter1: ch1.durationSeconds,
        chapter2: ch2.durationSeconds,
        chapter3: ch3.durationSeconds,
      },
    };
    const quizPayloadJson = encodePrivateJson(id, 'quiz_payload_json', {
      questionLogs: analyticsQuestionLogs(fullDossierData?.questionLogs),
      totalDurationSeconds: fullDossierData?.totalDurationSeconds ?? 0,
    }, quizPayload);
    const bankIds = (fullDossierData?.selectedBankIds ?? []).join(',');

    const insertTx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO dossiers (
            id, user_id, device_id, email, nickname, avatar_urls, gender, occupation, persona_trait, age, marital_status, has_boyfriend,
            surface_trait, inner_desire, boundary_text, fantasy_text, relation_preference,
            awakening_moment, depth_rating, selected_shadow_tags, secret_words, secret_rule,
            telemetry_json, diagnostic_result_json, quiz_payload_json, bank_ids, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          userId,
          deviceId,
          email,
          ch1.nickname ?? '',
          avatarUrlsJson,
          ch1.gender ?? '',
          ch1.occupation ?? '',
          ch1.personaTrait ?? '',
          ch1.age ?? '',
          ch1.maritalStatus ?? '',
          ch1.hasBoyfriend ?? '',
          encryptedSensitive.surface_trait,
          encryptedSensitive.inner_desire,
          encryptedSensitive.boundary_text,
          encryptedSensitive.fantasy_text,
          encryptedSensitive.relation_preference,
          encryptedSensitive.awakening_moment,
          fullDossierData?.depthRating ?? 'medium',
          tagsJson,
          encryptedSensitive.secret_words,
          encryptedSensitive.secret_rule,
          telemetryJson,
          diagnosticJson,
          quizPayloadJson,
          bankIds,
          createdAt
        );
    });
    insertTx();

    return { id, createdAt };
  }

  async getLatestDossierSummaryByUserId(userId: string): Promise<DossierSummaryContract | null> {
    const row = this.db
      .prepare('SELECT * FROM dossiers WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(userId) as DossierRowDb | undefined;
    if (!row) return null;
    return this.toDossierSummary(this.formatDossierRow(row));
  }

  async listDossierSummariesByUserId(userId: string): Promise<DossierSummaryContract[]> {
    const rows = this.db
      .prepare('SELECT id, bank_ids, created_at FROM dossiers WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Pick<DossierRowDb, 'id' | 'bank_ids' | 'created_at'>[];
    return rows.map((r) => ({
      id: r.id,
      bankIds: splitBankIds(r.bank_ids),
      createdAt: r.created_at,
    }));
  }

  /**
   * 题库完成情况：登录用户按账号、匿名访客按设备标识（只统计匿名卷宗，
   * 避免共享设备登出后把账号的完成记录回传给匿名请求）。
   * 只读 id / bank_ids / created_at，不解密任何报告内容。
   */
  async listDossierCompletionRows(
    owner: { userId: string } | { deviceId: string }
  ): Promise<{ id: string; bankIds: string[]; createdAt: string }[]> {
    const rows = ('userId' in owner
      ? this.db
        .prepare('SELECT id, bank_ids, created_at FROM dossiers WHERE user_id = ? ORDER BY created_at ASC')
        .all(owner.userId)
      : this.db
        .prepare('SELECT id, bank_ids, created_at FROM dossiers WHERE device_id = ? AND user_id IS NULL ORDER BY created_at ASC')
        .all(owner.deviceId)) as Pick<DossierRowDb, 'id' | 'bank_ids' | 'created_at'>[];
    return rows.map((r) => ({ id: r.id, bankIds: splitBankIds(r.bank_ids), createdAt: r.created_at }));
  }

  /**
   * 同一账号在指定题库上的作答指标序列（按时间升序），用于"首次 → 最近一次"复测对比。
   * 只取称号与数值指标，不返回报告正文与私密原文。
   */
  async listDossierAttemptMetricsForBank(userId: string, bankId: string): Promise<DossierAttemptMetricsContract[]> {
    const rows = this.db
      .prepare(
        'SELECT id, bank_ids, created_at, depth_rating, selected_shadow_tags, diagnostic_result_json FROM dossiers WHERE user_id = ? ORDER BY created_at ASC'
      )
      .all(userId) as Pick<
        DossierRowDb,
        'id' | 'bank_ids' | 'created_at' | 'depth_rating' | 'selected_shadow_tags' | 'diagnostic_result_json'
      >[];
    return rows
      .filter((row) => splitBankIds(row.bank_ids).includes(bankId))
      .map((row) => {
        const analysis = decodePrivateJson<Record<string, unknown>>(
          row.id,
          'diagnostic_result_json',
          row.diagnostic_result_json,
          {}
        );
        return {
          dossierId: row.id,
          createdAt: row.created_at,
          depthRating: (row.depth_rating ?? 'medium') as 'light' | 'medium' | 'deep',
          archetypeTitle: toOptionalText(analysis.archetypeTitle),
          archetypeSubtitle: toOptionalText(analysis.archetypeSubtitle),
          disparityScore: toOptionalScore(analysis.disparityScore),
          dominanceIndex: toOptionalScore(analysis.dominanceIndex),
          submissionIndex: toOptionalScore(analysis.submissionIndex),
          restraintIndex: toOptionalScore(analysis.restraintIndex),
          sensoryThreshold: toOptionalScore(analysis.sensoryThreshold),
          selectedShadowTags: decodeJsonField(row.id, 'selected_shadow_tags', row.selected_shadow_tags, []),
        };
      });
  }

  async getDossierByIdForUser(id: string, userId: string): Promise<DossierRow | null> {
    const row = this.db
      .prepare('SELECT * FROM dossiers WHERE id = ? AND user_id = ?')
      .get(id, userId) as DossierRowDb | undefined;
    return row ? this.formatDossierRow(row) : null;
  }

  /**
   * 按调用方身份读取单条卷宗（登录用户 + 同设备匿名卷宗）。
   *
   * 与 updateDossierResonance 的归属口径一致：登录用户可命中本人卷宗，
   * 以及绑定在同一设备上、尚未归属任何账号的匿名卷宗；匿名访客只能命中
   * 自己设备且未绑定账号的卷宗，避免越权读取或改写他人卷宗。
   */
  async getOwnedDossierRow(
    id: string,
    identity: { userId?: string | null; deviceId?: string | null }
  ): Promise<DossierRow | null> {
    const conditions = ['id = ?'];
    const params: unknown[] = [id];

    if (identity.userId) {
      conditions.push('(user_id = ? OR (user_id IS NULL AND device_id = ?))');
      params.push(identity.userId, identity.deviceId ?? null);
    } else if (identity.deviceId) {
      conditions.push('(device_id = ? AND user_id IS NULL)');
      params.push(identity.deviceId);
    } else {
      return null;
    }

    const row = this.db
      .prepare(`SELECT * FROM dossiers WHERE ${conditions.join(' AND ')}`)
      .get(...params) as DossierRowDb | undefined;
    return row ? this.formatDossierRow(row) : null;
  }

  async getDossierHistoryByUserId(userId: string): Promise<DossierRow[]> {
    const rows = this.db
      .prepare('SELECT * FROM dossiers WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as DossierRowDb[];
    return rows.map((r) => this.formatDossierRow(r));
  }

  async getAllDossierHistory(): Promise<DossierRow[]> {
    const rows = this.db
      .prepare('SELECT * FROM dossiers ORDER BY created_at DESC')
      .all() as DossierRowDb[];
    return rows.map((r) => this.formatDossierRow(r));
  }

  async getOccupationStats(): Promise<{ occupation: string; count: number }[]> {
    return this.db
      .prepare('SELECT occupation, COUNT(*) as count FROM dossiers GROUP BY occupation ORDER BY count DESC')
      .all() as { occupation: string; count: number }[];
  }

  async countDossiers(): Promise<number> {
    const r = this.db.prepare('SELECT COUNT(*) as c FROM dossiers').get() as { c: number } | undefined;
    return r?.c ?? 0;
  }

  async listAdminDossiers(
    input: {
      search?: string;
      depth?: string;
      credibility?: string;
      status?: string;
      sort?: 'submitTime' | 'credibilityScore' | 'durationSeconds';
      order?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    },
    resolveBankNamesFn: (bankIds: string[]) => Promise<Record<string, string>>
  ): Promise<{ total: number; items: AdminDossier[]; bankNames: Record<string, string>; deviceUserMap: Record<string, string> }> {
    const search = (input.search ?? '').trim();
    const where: string[] = [];
    const params: unknown[] = [];
    if (search) {
      const like = `%${search}%`;
      where.push('(nickname LIKE ? OR occupation LIKE ? OR persona_trait LIKE ? OR gender LIKE ? OR device_id LIKE ? OR email LIKE ? OR id LIKE ?)');
      params.push(like, like, like, like, like, like, like);
    }
    if (input.depth && input.depth !== 'all') {
      where.push('depth_rating = ?');
      params.push(input.depth);
    }
    if (input.status && input.status !== 'all') {
      where.push('audit_status = ?');
      params.push(input.status);
    }
    if (input.credibility && input.credibility !== 'all') {
      where.push("json_extract(diagnostic_result_json, '$.credibilityLevel') = ?");
      params.push(input.credibility);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sortMap: Record<string, string> = {
      submitTime: 'created_at',
      credibilityScore: "json_extract(diagnostic_result_json, '$.credibilityScore')",
      durationSeconds: "json_extract(quiz_payload_json, '$.totalDurationSeconds')",
    };
    const orderSql = sortMap[input.sort ?? 'submitTime'] ?? 'created_at';
    const dir = input.order === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(Math.max(1, input.limit ?? 50), 200);
    const offset = Math.max(0, input.offset ?? 0);

    const totalRow = this.db.prepare(`SELECT COUNT(*) c FROM dossiers ${whereSql}`).get(...params) as { c: number } | undefined;
    const rows = this.db
      .prepare(`SELECT * FROM dossiers ${whereSql} ORDER BY ${orderSql} ${dir}, created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as DossierRowDb[];

    const items = rows.map((r) => this.formatAdminDossier(r));
    const referencedBankIds = Array.from(
      new Set(
        items.flatMap((d) => (d.bankIds || '').split(',').map((id) => id.trim()).filter(Boolean))
      )
    );
    const bankNames = await resolveBankNamesFn(referencedBankIds);

    // 全量“设备 → 最近登录用户”映射，供管理端跨页合并同设备的游客/登录卷轴。
    // 基于全表而非当前页，避免同一个人跨页后被拆成两个分组。
    const deviceUserRows = this.db
      .prepare(
        `SELECT device_id, MAX(user_id) as user_id
         FROM dossiers
         WHERE device_id IS NOT NULL AND device_id != '' AND user_id IS NOT NULL
         GROUP BY device_id`
      )
      .all() as { device_id: string; user_id: string }[];
    const deviceUserMap: Record<string, string> = {};
    for (const row of deviceUserRows) {
      deviceUserMap[row.device_id] = row.user_id;
    }

    return { total: totalRow?.c ?? 0, items, bankNames, deviceUserMap };
  }

  async getAdminDossierById(id: string): Promise<AdminDossier | null> {
    const row = this.db.prepare('SELECT * FROM dossiers WHERE id = ?').get(id) as DossierRowDb | undefined;
    return row ? this.formatAdminDossier(row, true) : null;
  }

  async getDossierRowById(id: string): Promise<DossierRow | null> {
    const row = this.db.prepare('SELECT * FROM dossiers WHERE id = ?').get(id) as DossierRowDb | undefined;
    return row ? this.formatDossierRow(row) : null;
  }

  async updateDossierAdmin(
    id: string,
    patch: { auditStatus?: string; adminNotes?: string }
  ): Promise<boolean> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.auditStatus !== undefined) {
      sets.push('audit_status = ?');
      params.push(patch.auditStatus);
    }
    if (patch.adminNotes !== undefined) {
      sets.push('admin_notes = ?');
      params.push(patch.adminNotes);
    }
    if (sets.length === 0) return false;
    params.push(id);
    const info = this.db.prepare(`UPDATE dossiers SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return info.changes > 0;
  }

  async deleteDossierById(id: string): Promise<boolean> {
    const info = this.db.prepare('DELETE FROM dossiers WHERE id = ?').run(id);
    return info.changes > 0;
  }

  async deleteDossiersByUserId(userId: string): Promise<number> {
    const info = this.db.prepare('DELETE FROM dossiers WHERE user_id = ?').run(userId);
    return info.changes;
  }

  async batchDeleteDossiers(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const deleteTx = this.db.transaction(() => {
      return this.db.prepare(`DELETE FROM dossiers WHERE id IN (${placeholders})`).run(...ids).changes;
    });
    return deleteTx();
  }

  async updateDossierDiagnostic(id: string, diagnostic: unknown): Promise<boolean> {
    const diagnosticObject = diagnostic && typeof diagnostic === 'object'
      ? diagnostic as Record<string, unknown>
      : {};
    const info = this.db
      .prepare('UPDATE dossiers SET diagnostic_result_json = ? WHERE id = ?')
      .run(
        encodePrivateJson(id, 'diagnostic_result_json', {
          credibilityScore: diagnosticObject.credibilityScore ?? 0,
          credibilityLevel: diagnosticObject.credibilityLevel ?? 'low',
        }, diagnostic),
        id
      );
    return info.changes > 0;
  }

  /** 仅当卷宗归属调用方时，覆盖其诊断结果（用户自助重跑 LLM 用）。 */
  async updateDossierDiagnosticForOwner(
    id: string,
    diagnostic: unknown,
    identity: { userId?: string | null; deviceId?: string | null }
  ): Promise<boolean> {
    const diagnosticObject = diagnostic && typeof diagnostic === 'object'
      ? diagnostic as Record<string, unknown>
      : {};
    const conditions = ['id = ?'];
    const params: unknown[] = [
      encodePrivateJson(id, 'diagnostic_result_json', {
        credibilityScore: diagnosticObject.credibilityScore ?? 0,
        credibilityLevel: diagnosticObject.credibilityLevel ?? 'low',
      }, diagnostic),
      id,
    ];

    if (identity.userId) {
      conditions.push('(user_id = ? OR (user_id IS NULL AND device_id = ?))');
      params.push(identity.userId, identity.deviceId ?? null);
    } else if (identity.deviceId) {
      conditions.push('(device_id = ? AND user_id IS NULL)');
      params.push(identity.deviceId);
    } else {
      return false;
    }

    const info = this.db
      .prepare(`UPDATE dossiers SET diagnostic_result_json = ? WHERE ${conditions.join(' AND ')}`)
      .run(...params);
    return info.changes > 0;
  }

  async updateDossierResonance(
    id: string,
    resonanceLevel: 'exact' | 'partial' | 'guarded' | 'custom',
    resonanceText: string | null = null,
    userId?: string | null,
    deviceId?: string | null
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const encryptedText = resonanceText
      ? (isFieldEncryptionEnabled() ? encryptFields(id, { resonance_text: resonanceText }).resonance_text : resonanceText)
      : '';

    const conditions = ['id = ?'];
    const params: unknown[] = [resonanceLevel, encryptedText, now, id];

    if (userId) {
      conditions.push('(user_id = ? OR (user_id IS NULL AND device_id = ?))');
      params.push(userId, deviceId ?? null);
    } else if (deviceId) {
      // 匿名访客只能修改属于自己设备、且尚未绑定账号的卷宗，避免越权改写他人匿名卷宗
      conditions.push('(device_id = ? AND user_id IS NULL)');
      params.push(deviceId);
    } else {
      // 既无登录态也无设备标识时不允许命中任何记录
      return false;
    }

    const query = `UPDATE dossiers SET resonance_level = ?, resonance_text = ?, resonance_at = ? WHERE ${conditions.join(' AND ')}`;
    const info = this.db.prepare(query).run(...params);
    return info.changes > 0;
  }
}
