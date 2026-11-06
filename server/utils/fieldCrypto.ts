import crypto from 'node:crypto';

/**
 * 字段级落库加密（AES-256-GCM）。
 *
 * 设计要点：
 * - 只加密真正敏感的卷宗自由文本（第二章/三章的深度自白、秘密词等），
 *   身份画像与聚合得分保持明文，便于统计与报告生成。
 * - 每条密文自带随机 IV 与 GCM tag：v1:<iv>:<tag>:<ciphertext>（均 base64url）。
 * - AAD 绑定记录 ID + 字段名，防止密文在不同记录/字段间被换位。
 * - 密钥来自环境变量 FIELD_ENC_KEY（32 字节，base64 或 hex）；
 *   未设置时加密能力为“禁用”，调用方应自行决定是否落明文（默认保持现状）。
 * - 旧数据兼容：非 v1 前缀的存量明文原样返回，迁移期无需一次性改写全表。
 *
 * 接线位置（等你改完 db.ts 后再做，避免冲突）：
 *   saveDossier / formatDossierRow 中，对以下字段调用 encryptFields/decryptFields：
 *   boundary_text, fantasy_text, relation_preference, awakening_moment,
 *   secret_words, secret_rule, surface_trait, inner_desire
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_ENV = 'FIELD_ENC_KEY';
const PREFIX = 'v1';

function loadKey(): Buffer | null {
  const raw = process.env[KEY_ENV]?.trim();
  if (!raw) return null;

  const fromBase64 = Buffer.from(raw, 'base64');
  if (fromBase64.length === 32) return fromBase64;

  const fromHex = Buffer.from(raw, 'hex');
  if (fromHex.length === 32) return fromHex;

  throw new Error(`${KEY_ENV} 必须是 32 字节密钥（base64 或 64 位 hex）`);
}

/** 是否已配置密钥（未配置时加密禁用，落库行为维持现状）。 */
export function isFieldEncryptionEnabled(): boolean {
  return loadKey() !== null;
}

/** 生成一条 32 字节 base64 密钥（运维用）。 */
export function generateFieldEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * 加密单个字段。空字符串原样返回；密钥未配置时抛错（防止误以为已加密）。
 * @param plain 明文
 * @param aad   AAD，建议格式 `${recordId}:${fieldName}`
 */
export function encryptField(plain: string, aad: string): string {
  if (plain === '') return '';
  const key = loadKey();
  if (!key) throw new Error(`${KEY_ENV} 未配置，无法加密（调用前应先检查 isFieldEncryptionEnabled）`);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [PREFIX, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':');
}

/**
 * 解密单个字段。
 * - 空字符串原样返回；
 * - 非 v1 前缀视为存量明文，原样返回（向后兼容）；
 * - 密钥错误 / AAD 不匹配 / 密文被篡改时抛错，绝不返回错误数据。
 */
export function decryptField(payload: string, aad: string): string {
  if (payload === '') return '';
  const parts = payload.split(':');
  if (parts.length === 1 || parts[0] !== PREFIX) return payload; // 旧明文
  if (parts.length !== 4) return payload;

  const key = loadKey();
  if (!key) {
    throw new Error('FIELD_ENC_KEY 未配置，无法解密 v1 密文');
  }

  const iv = Buffer.from(parts[1], 'base64url');
  const tag = Buffer.from(parts[2], 'base64url');
  const data = Buffer.from(parts[3], 'base64url');
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error(`v1 密文参数长度非法: iv=${iv.length}, tag=${tag.length}`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** 批量加密：AAD 统一为 `${recordId}:${fieldName}`，防止跨记录/跨字段换位。 */
export function encryptFields(recordId: string, fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(fields)) {
    out[name] = encryptField(value, `${recordId}:${name}`);
  }
  return out;
}

/** 批量解密：与 encryptFields 的 AAD 规则一一对应。 */
export function decryptFields(recordId: string, fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(fields)) {
    out[name] = decryptField(value, `${recordId}:${name}`);
  }
  return out;
}
