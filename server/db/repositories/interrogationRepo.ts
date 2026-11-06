import type Database from 'better-sqlite3';
import { genId } from '../helpers.js';
import {
  DEFAULT_INTERROGATOR_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  INTERROGATION_PROMPT_LIMITS,
} from '../../services/interrogationPrompts.js';

/**
 * 审讯室（测试功能）。
 *
 * 归属口径：所有会话与消息只认 user_id（登录账号），不读取也不写入设备指纹。
 * 额度配置存 app_settings，管理端可以在线修改，读取时再做一次范围钳制，
 * 避免手工改库写入越界值后把线上对话直接打挂。
 */
export type InterrogationStatus = 'active' | 'exhausted' | 'summarized';

export interface InterrogationConfig {
  maxTurns: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  /** 审讯者系统提示词；管理端留空即回到默认文案。 */
  interrogatorPrompt: string;
  /** 总结系统提示词；管理端留空即回到默认文案。 */
  summaryPrompt: string;
  updatedAt: string | null;
}

export interface InterrogationSessionRow {
  id: string;
  user_id: string;
  status: InterrogationStatus;
  turn_count: number;
  summary: string | null;
  summary_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterrogationMessageRow {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const INTERROGATION_DEFAULTS = {
  maxTurns: 5,
  maxInputTokens: 1200,
  maxOutputTokens: 300,
} as const;

export const INTERROGATION_LIMITS = {
  maxTurns: { min: 1, max: 20 },
  maxInputTokens: { min: 64, max: 8000 },
  maxOutputTokens: { min: 32, max: 2000 },
} as const;

const CONFIG_KEYS = {
  maxTurns: 'interrogation.max_turns',
  maxInputTokens: 'interrogation.max_input_tokens',
  maxOutputTokens: 'interrogation.max_output_tokens',
  interrogatorPrompt: 'interrogation.prompt.interrogator',
  summaryPrompt: 'interrogation.prompt.summary',
} as const;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export class InterrogationRepo {
  constructor(private readonly db: Database.Database) {}

  private readSetting(key: string): { value: number; updatedAt: string } | null {
    const row = this.db
      .prepare('SELECT value, updated_at FROM app_settings WHERE key = ?')
      .get(key) as { value: string; updated_at: string } | undefined;
    if (!row) return null;
    const parsed = Number.parseInt(row.value, 10);
    if (!Number.isFinite(parsed)) return null;
    return { value: parsed, updatedAt: row.updated_at };
  }

  private readText(key: string): { value: string; updatedAt: string } | null {
    const row = this.db
      .prepare('SELECT value, updated_at FROM app_settings WHERE key = ?')
      .get(key) as { value: string; updated_at: string } | undefined;
    return row ? { value: row.value, updatedAt: row.updated_at } : null;
  }

  getConfig(): InterrogationConfig {
    const turns = this.readSetting(CONFIG_KEYS.maxTurns);
    const input = this.readSetting(CONFIG_KEYS.maxInputTokens);
    const output = this.readSetting(CONFIG_KEYS.maxOutputTokens);
    const interrogator = this.readText(CONFIG_KEYS.interrogatorPrompt);
    const summary = this.readText(CONFIG_KEYS.summaryPrompt);
    const updatedAt = [turns?.updatedAt, input?.updatedAt, output?.updatedAt, interrogator?.updatedAt, summary?.updatedAt]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;
    return {
      maxTurns: clamp(turns?.value ?? INTERROGATION_DEFAULTS.maxTurns, INTERROGATION_LIMITS.maxTurns.min, INTERROGATION_LIMITS.maxTurns.max),
      maxInputTokens: clamp(input?.value ?? INTERROGATION_DEFAULTS.maxInputTokens, INTERROGATION_LIMITS.maxInputTokens.min, INTERROGATION_LIMITS.maxInputTokens.max),
      maxOutputTokens: clamp(output?.value ?? INTERROGATION_DEFAULTS.maxOutputTokens, INTERROGATION_LIMITS.maxOutputTokens.min, INTERROGATION_LIMITS.maxOutputTokens.max),
      // 空串/纯空白视为「使用默认」，仓储直接返回默认文案，管理端看到的就是实际在用的文本。
      interrogatorPrompt: interrogator?.value.trim() || DEFAULT_INTERROGATOR_PROMPT,
      summaryPrompt: summary?.value.trim() || DEFAULT_SUMMARY_PROMPT,
      updatedAt,
    };
  }

  updateConfig(
    patch: Partial<
      Pick<
        InterrogationConfig,
        'maxTurns' | 'maxInputTokens' | 'maxOutputTokens' | 'interrogatorPrompt' | 'summaryPrompt'
      >
    >,
  ): InterrogationConfig {
    const now = new Date().toISOString();
    const upsert = this.db.prepare(`
      INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    const tx = this.db.transaction(() => {
      if (patch.maxTurns !== undefined) upsert.run(CONFIG_KEYS.maxTurns, String(patch.maxTurns), now);
      if (patch.maxInputTokens !== undefined) upsert.run(CONFIG_KEYS.maxInputTokens, String(patch.maxInputTokens), now);
      if (patch.maxOutputTokens !== undefined) upsert.run(CONFIG_KEYS.maxOutputTokens, String(patch.maxOutputTokens), now);
      if (patch.interrogatorPrompt !== undefined) {
        upsert.run(
          CONFIG_KEYS.interrogatorPrompt,
          patch.interrogatorPrompt.trim().slice(0, INTERROGATION_PROMPT_LIMITS.interrogatorPrompt),
          now,
        );
      }
      if (patch.summaryPrompt !== undefined) {
        upsert.run(
          CONFIG_KEYS.summaryPrompt,
          patch.summaryPrompt.trim().slice(0, INTERROGATION_PROMPT_LIMITS.summaryPrompt),
          now,
        );
      }
    });
    tx();
    return this.getConfig();
  }

  /** 每个账号只保留一条最新会话：进入房间即续上，不会因为刷新而重开。 */
  getLatestSession(userId: string): InterrogationSessionRow | null {
    const row = this.db
      .prepare('SELECT * FROM interrogation_sessions WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1')
      .get(userId) as InterrogationSessionRow | undefined;
    return row ?? null;
  }

  getSessionById(userId: string, sessionId: string): InterrogationSessionRow | null {
    const row = this.db
      .prepare('SELECT * FROM interrogation_sessions WHERE id = ? AND user_id = ?')
      .get(sessionId, userId) as InterrogationSessionRow | undefined;
    return row ?? null;
  }

  createSession(userId: string): InterrogationSessionRow {
    const now = new Date().toISOString();
    const id = genId('itr');
    this.db
      .prepare(`
        INSERT INTO interrogation_sessions (id, user_id, status, turn_count, created_at, updated_at)
        VALUES (?, ?, 'active', 0, ?, ?)
      `)
      .run(id, userId, now, now);
    return this.getSessionById(userId, id)!;
  }

  getOrCreateSession(userId: string): InterrogationSessionRow {
    return this.getLatestSession(userId) ?? this.createSession(userId);
  }

  listMessages(sessionId: string): InterrogationMessageRow[] {
    return this.db
      .prepare('SELECT * FROM interrogation_messages WHERE session_id = ? ORDER BY created_at ASC, rowid ASC')
      .all(sessionId) as InterrogationMessageRow[];
  }

  /**
   * 一轮问答落库：两条消息 + 轮次自增 + 到额即标记 exhausted。
   * 放在一个事务里，避免只写进用户消息却没写进回复（或反之）。
   */
  appendExchange(input: {
    sessionId: string;
    userId: string;
    userContent: string;
    assistantContent: string;
    maxTurns: number;
  }): InterrogationSessionRow {
    const now = new Date().toISOString();
    const insertMessage = this.db.prepare(`
      INSERT INTO interrogation_messages (id, session_id, user_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const tx = this.db.transaction(() => {
      insertMessage.run(genId('itm'), input.sessionId, input.userId, 'user', input.userContent, now);
      insertMessage.run(genId('itm'), input.sessionId, input.userId, 'assistant', input.assistantContent, now);
      const nextTurn = this.getSessionById(input.userId, input.sessionId)!.turn_count + 1;
      const status: InterrogationStatus = nextTurn >= input.maxTurns ? 'exhausted' : 'active';
      this.db
        .prepare('UPDATE interrogation_sessions SET turn_count = ?, status = ?, updated_at = ? WHERE id = ? AND user_id = ?')
        .run(nextTurn, status, now, input.sessionId, input.userId);
    });
    tx();
    return this.getSessionById(input.userId, input.sessionId)!;
  }

  setSummary(sessionId: string, userId: string, summary: string): InterrogationSessionRow {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE interrogation_sessions
        SET summary = ?, summary_generated_at = ?, status = 'summarized', updated_at = ?
        WHERE id = ? AND user_id = ?
      `)
      .run(summary, now, now, sessionId, userId);
    return this.getSessionById(userId, sessionId)!;
  }

  /** 管理端只做用量观察：返回最近若干条会话的账号与轮次。 */
  listRecentSessions(limit: number): Array<InterrogationSessionRow & { email: string | null }> {
    return this.db
      .prepare(`
        SELECT s.*, u.email AS email
        FROM interrogation_sessions s
        LEFT JOIN users u ON u.id = s.user_id
        ORDER BY s.created_at DESC, s.rowid DESC
        LIMIT ?
      `)
      .all(limit) as Array<InterrogationSessionRow & { email: string | null }>;
  }
}
