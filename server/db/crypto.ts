import type Database from 'better-sqlite3';
import { logger } from '../logger.js';
import {
  encryptField,
  decryptField,
  isFieldEncryptionEnabled,
} from '../utils/fieldCrypto.js';
import { safeJsonParse, analyticsQuestionLogs } from './helpers.js';

export const ENCRYPTED_PAYLOAD_KEY = '__encryptedPayload';

export function encodeJsonField(recordId: string, fieldName: string, value: unknown): string {
  const json = JSON.stringify(value);
  return isFieldEncryptionEnabled()
    ? encryptField(json, `${recordId}:${fieldName}`)
    : json;
}

export function decodeJsonField<T>(recordId: string, fieldName: string, stored: string | null | undefined, fallback: T): T {
  if (!stored) return fallback;
  try {
    const json = decryptField(stored, `${recordId}:${fieldName}`);
    return safeJsonParse(json, fallback);
  } catch {
    return fallback;
  }
}

export function encodePrivateJson(
  recordId: string,
  fieldName: string,
  publicData: Record<string, unknown>,
  privateData: unknown
): string {
  if (!isFieldEncryptionEnabled()) return JSON.stringify(privateData);
  return JSON.stringify({
    ...publicData,
    [ENCRYPTED_PAYLOAD_KEY]: encryptField(JSON.stringify(privateData), `${recordId}:${fieldName}`),
  });
}

export function decodePrivateJson<T>(recordId: string, fieldName: string, stored: string | null | undefined, fallback: T): T {
  const parsed = safeJsonParse<Record<string, unknown>>(stored, {});
  const encrypted = parsed[ENCRYPTED_PAYLOAD_KEY];
  if (typeof encrypted !== 'string') return safeJsonParse(stored, fallback);
  try {
    const json = decryptField(encrypted, `${recordId}:${fieldName}`);
    return safeJsonParse(json, fallback);
  } catch (err) {
    if (parsed && typeof parsed === 'object') {
      return { ...parsed, ...((fallback && typeof fallback === 'object') ? fallback : {}) } as T;
    }
    throw err;
  }
}

interface DossierRowDb {
  id: string;
  avatar_urls: string;
  selected_shadow_tags: string;
  surface_trait: string;
  inner_desire: string;
  boundary_text: string;
  fantasy_text: string;
  relation_preference: string;
  awakening_moment: string;
  secret_words: string;
  secret_rule: string;
  telemetry_json: string;
  diagnostic_result_json: string;
  quiz_payload_json?: string | null;
}

interface UserTaskRow {
  id: string;
  text_content: string | null;
  attachments_json: string | null;
}

export function upgradeSensitiveStorageEncryption(database: Database.Database): void {
  if (!isFieldEncryptionEnabled()) return;

  // 一次性迁移：首次启用密钥时把存量明文原地升级为密文，完成后写标记。
  const doneMarker = database
    .prepare("SELECT value FROM app_meta WHERE key = 'sensitive_storage_encryption_done'")
    .all() as { value: string }[];
  if (doneMarker.length > 0) return;

  const dossierRows = database.prepare('SELECT * FROM dossiers').all() as DossierRowDb[];
  let upgradedDossiers = 0;
  for (const row of dossierRows) {
    const updates: string[] = [];
    const values: unknown[] = [];
    const addUpdate = (column: string, value: string) => {
      updates.push(`${column} = ?`);
      values.push(value);
    };

    const scalarFields: Array<[keyof DossierRowDb, string]> = [
      ['surface_trait', 'surface_trait'],
      ['inner_desire', 'inner_desire'],
      ['boundary_text', 'boundary_text'],
      ['fantasy_text', 'fantasy_text'],
      ['relation_preference', 'relation_preference'],
      ['awakening_moment', 'awakening_moment'],
      ['secret_words', 'secret_words'],
      ['secret_rule', 'secret_rule'],
    ];
    for (const [column, fieldName] of scalarFields) {
      const value = String(row[column] ?? '');
      if (!value) continue;
      if (value.startsWith('v1:')) continue; // 已加密，无需处理
      addUpdate(String(column), encryptField(value, `${row.id}:${fieldName}`));
    }

    if (row.avatar_urls && !row.avatar_urls.startsWith('v1:')) {
      addUpdate('avatar_urls', encodeJsonField(row.id, 'avatar_urls', safeJsonParse(row.avatar_urls, [])));
    }
    if (row.selected_shadow_tags && !row.selected_shadow_tags.startsWith('v1:')) {
      addUpdate('selected_shadow_tags', encodeJsonField(row.id, 'selected_shadow_tags', safeJsonParse(row.selected_shadow_tags, [])));
    }

    const diagnosticEnvelope = safeJsonParse<Record<string, unknown>>(row.diagnostic_result_json, {});
    if (typeof diagnosticEnvelope[ENCRYPTED_PAYLOAD_KEY] !== 'string') {
      addUpdate('diagnostic_result_json', encodePrivateJson(row.id, 'diagnostic_result_json', {
        credibilityScore: diagnosticEnvelope.credibilityScore ?? 0,
        credibilityLevel: diagnosticEnvelope.credibilityLevel ?? 'low',
      }, diagnosticEnvelope));
    }

    const quizEnvelope = safeJsonParse<Record<string, unknown>>(row.quiz_payload_json, {});
    if (typeof quizEnvelope[ENCRYPTED_PAYLOAD_KEY] !== 'string') {
      addUpdate('quiz_payload_json', encodePrivateJson(row.id, 'quiz_payload_json', {
        questionLogs: analyticsQuestionLogs(quizEnvelope.questionLogs),
        totalDurationSeconds: quizEnvelope.totalDurationSeconds ?? 0,
      }, quizEnvelope));
    }

    const telemetryEnvelope = safeJsonParse<Record<string, unknown>>(row.telemetry_json, {});
    if (typeof telemetryEnvelope[ENCRYPTED_PAYLOAD_KEY] !== 'string') {
      addUpdate('telemetry_json', encodePrivateJson(row.id, 'telemetry_json', {
        hesitationPauses: telemetryEnvelope.hesitationPauses ?? 0,
        deletionRatePercent: telemetryEnvelope.deletionRatePercent ?? 0,
        flipFlopCount: telemetryEnvelope.flipFlopCount ?? 0,
      }, telemetryEnvelope));
    }

    if (updates.length > 0) {
      values.push(row.id);
      database.prepare(`UPDATE dossiers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      upgradedDossiers++;
    }
  }

  const taskRows = database.prepare('SELECT * FROM user_tasks').all() as UserTaskRow[];
  let upgradedTasks = 0;
  for (const row of taskRows) {
    const updates: string[] = [];
    const values: unknown[] = [];
    for (const [column, fieldName] of [
      ['text_content', 'text_content'],
      ['attachments_json', 'attachments_json'],
    ] as const) {
      const value = row[column];
      if (!value) continue;
      if (value.startsWith('v1:')) continue; // 已加密，无需处理
      updates.push(`${column} = ?`);
      values.push(encryptField(value, `${row.id}:${fieldName}`));
    }
    if (updates.length > 0) {
      values.push(row.id);
      database.prepare(`UPDATE user_tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      upgradedTasks++;
    }
  }

  if (upgradedDossiers > 0 || upgradedTasks > 0) {
    logger.info({ upgradedDossiers, upgradedTasks }, 'sensitive storage encryption upgraded');
  }

  database.prepare(`INSERT OR REPLACE INTO app_meta (key, value, updated_at) VALUES (?, '1', ?)`).run(
    'sensitive_storage_encryption_done',
    new Date().toISOString()
  );
}
