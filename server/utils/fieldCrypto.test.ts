import { afterEach, describe, expect, it } from 'vitest';
import {
  decryptField,
  decryptFields,
  encryptField,
  encryptFields,
  isFieldEncryptionEnabled,
} from './fieldCrypto.js';

const KEY = Buffer.from('k'.repeat(32)).toString('base64'); // 32 字节固定测试密钥
const recordId = 'dos_test_001';

function setKey(value: string | undefined) {
  if (value === undefined) {
    delete process.env.FIELD_ENC_KEY;
  } else {
    process.env.FIELD_ENC_KEY = value;
  }
}

afterEach(() => setKey(undefined));

describe('fieldCrypto 字段级加密', () => {
  it('未配置密钥时加密能力为禁用', () => {
    setKey(undefined);
    expect(isFieldEncryptionEnabled()).toBe(false);
  });

  it('配置密钥后加密能力开启', () => {
    setKey(KEY);
    expect(isFieldEncryptionEnabled()).toBe(true);
  });

  it('加密->解密往返一致', () => {
    setKey(KEY);
    const plain = '幻想被锁链束缚，24 小时被命令与支配。';
    const cipher = encryptField(plain, `${recordId}:fantasy_text`);
    expect(cipher).not.toContain(plain);
    expect(decryptField(cipher, `${recordId}:fantasy_text`)).toBe(plain);
  });

  it('同一明文两次加密结果不同（随机 IV）', () => {
    setKey(KEY);
    const a = encryptField('同样内容', `${recordId}:f`);
    const b = encryptField('同样内容', `${recordId}:f`);
    expect(a).not.toBe(b);
  });

  it('AAD 不匹配（记录或字段换位）时解密抛错', () => {
    setKey(KEY);
    const cipher = encryptField('秘密', `${recordId}:secret_words`);
    expect(() => decryptField(cipher, `${recordId}:other_field`)).toThrow();
    expect(() => decryptField(cipher, 'dos_other:secret_words')).toThrow();
  });

  it('密文被篡改时解密抛错', () => {
    setKey(KEY);
    const cipher = encryptField('秘密', `${recordId}:secret_words`);
    const [prefix, iv, tag, data] = cipher.split(':');
    const buf = Buffer.from(data, 'base64url');
    buf[0] ^= 1;
    const tampered = [prefix, iv, tag, buf.toString('base64url')].join(':');
    expect(() => decryptField(tampered, `${recordId}:secret_words`)).toThrow();
  });

  it('存量明文（无 v1 前缀）原样返回，兼容旧数据', () => {
    setKey(KEY);
    expect(decryptField('这是旧版明文', `${recordId}:fantasy_text`)).toBe('这是旧版明文');
  });

  it('空字符串原样返回', () => {
    setKey(KEY);
    expect(encryptField('', `${recordId}:f`)).toBe('');
    expect(decryptField('', `${recordId}:f`)).toBe('');
  });

  it('未配置密钥时加密抛错，防止误以为已加密', () => {
    setKey(undefined);
    expect(() => encryptField('内容', `${recordId}:f`)).toThrow();
  });

  it('encryptFields/decryptFields 批量往返一致', () => {
    setKey(KEY);
    const originals = {
      boundary_text: '我希望被完全掌控',
      fantasy_text: '幻想被锁链束缚',
      secret_words: '深夜的秘密',
      surface_trait: '人前干练',
    };
    const encrypted = encryptFields(recordId, originals);
    expect(encrypted.boundary_text).not.toBe(originals.boundary_text);
    expect(decryptFields(recordId, encrypted)).toEqual(originals);
  });
});
