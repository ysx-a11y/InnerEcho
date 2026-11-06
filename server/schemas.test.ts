import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  deleteAccountSchema,
  analyzeDossierSchema,
  nicknameSchema,
  envSchema,
  mediaAttachmentSchema,
} from './schemas.js';
import { MAX_DOSSIER_IMAGES } from '../shared/dossierLimits.js';

// 1×1 的真实图片数据，用于魔数校验回归。
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TINY_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
const TINY_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const TINY_WEBP = 'data:image/webp;base64,UklGRgAAAABXRUJQ';

describe('registerSchema', () => {
  it('normalizes email to lowercase + trims whitespace', () => {
    const parsed = registerSchema.parse({ email: '  Hello@World.com  ', password: 'pass1234' });
    expect(parsed.email).toBe('hello@world.com');
  });

  it('rejects invalid username format', () => {
    expect(() => registerSchema.parse({ email: 'abc', password: 'pass1234' })).toThrow();
    expect(() => registerSchema.parse({ email: 'hello world', password: 'pass1234' })).toThrow();
    expect(() => registerSchema.parse({ email: 'test#123', password: 'pass1234' })).toThrow();
  });

  it('rejects empty email', () => {
    expect(() => registerSchema.parse({ email: '', password: 'pass1234' })).toThrow();
    expect(() => registerSchema.parse({ email: '   ', password: 'pass1234' })).toThrow();
  });

  it('rejects missing password', () => {
    expect(() => registerSchema.parse({ email: 'a@b.c' })).toThrow();
  });
});

describe('loginSchema', () => {
  it('accepts valid email + password', () => {
    const parsed = loginSchema.parse({ email: 'user@example.com', password: 'secret' });
    expect(parsed.email).toBe('user@example.com');
    expect(parsed.password).toBe('secret');
  });

  it('rejects missing fields', () => {
    expect(() => loginSchema.parse({})).toThrow();
    expect(() => loginSchema.parse({ email: 'a@b.c' })).toThrow();
    expect(() => loginSchema.parse({ password: 'x' })).toThrow();
  });
});

describe('changePasswordSchema', () => {
  it('accepts when newPassword matches confirmPassword', () => {
    const parsed = changePasswordSchema.parse({
      oldPassword: 'old123',
      newPassword: 'new456',
      confirmPassword: 'new456',
    });
    expect(parsed.oldPassword).toBe('old123');
    expect(parsed.newPassword).toBe('new456');
    expect(parsed.confirmPassword).toBe('new456');
  });

  it('rejects when newPassword mismatches confirmPassword', () => {
    expect(() =>
      changePasswordSchema.parse({ oldPassword: 'old123', newPassword: 'new456', confirmPassword: 'different' })
    ).toThrow();
  });

  it('rejects when confirmPassword is missing', () => {
    expect(() => changePasswordSchema.parse({ oldPassword: 'old123', newPassword: 'new456' })).toThrow();
  });

  it('rejects when oldPassword is missing', () => {
    expect(() => changePasswordSchema.parse({ newPassword: 'new456', confirmPassword: 'new456' })).toThrow();
  });
});

describe('deleteAccountSchema', () => {
  it('accepts non-empty confirmEmail', () => {
    const parsed = deleteAccountSchema.parse({ confirmEmail: 'user@example.com' });
    expect(parsed.confirmEmail).toBe('user@example.com');
  });

  it('rejects empty confirmEmail', () => {
    expect(() => deleteAccountSchema.parse({ confirmEmail: '' })).toThrow();
    expect(() => deleteAccountSchema.parse({})).toThrow();
  });
});

describe('nicknameSchema', () => {
  it('accepts nicknames with at least 2 distinct characters', () => {
    expect(nicknameSchema.parse('小明')).toBe('小明');
    expect(nicknameSchema.parse('ab')).toBe('ab');
    expect(nicknameSchema.parse('  Alice  ')).toBe('Alice');
  });

  it('rejects single-character nicknames', () => {
    expect(() => nicknameSchema.parse('a')).toThrow();
    expect(() => nicknameSchema.parse('喵')).toThrow();
    expect(() => nicknameSchema.parse('  ')).toThrow();
  });

  it('rejects repeated single-character nicknames', () => {
    expect(() => nicknameSchema.parse('aa')).toThrow();
    expect(() => nicknameSchema.parse('11')).toThrow();
    expect(() => nicknameSchema.parse('1111')).toThrow();
    expect(() => nicknameSchema.parse('喵喵喵')).toThrow();
  });
});

describe('analyzeDossierSchema', () => {
  it('accepts the supported dossier shape and custom LLM config', () => {
    const parsed = analyzeDossierSchema.parse({
      dossierData: {
        chapter1: { nickname: '契约测试者', occupation: '开发者', durationSeconds: 30 },
        chapter2: { fantasyText: 'private text' },
        questionLogs: [{ questionId: 'q1', durationMs: 1500 }],
        totalDurationSeconds: 90,
      },
      customConfig: {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-test',
      },
    });
    expect(parsed.dossierData.chapter1?.occupation).toBe('开发者');
  });

  it('accepts base64 avatar data URLs larger than the private text limit', () => {
    // 合法 PNG 头 + 超长载荷：只测长度上限，不引入真实大图。
    const bigAvatar = `data:image/png;base64,iVBORw0KGgo=${'A'.repeat(12_000)}`;
    const parsed = analyzeDossierSchema.parse({
      dossierData: {
        chapter1: { nickname: '测试', avatarUrl: bigAvatar, avatarUrls: [bigAvatar] },
      },
    });
    expect(parsed.dossierData.chapter1?.avatarUrl).toBe(bigAvatar);
    expect(parsed.dossierData.chapter1?.avatarUrls).toEqual([bigAvatar]);
  });

  it('rejects oversized private text and unknown top-level fields', () => {
    expect(() =>
      analyzeDossierSchema.parse({
        dossierData: { chapter2: { fantasyText: 'x'.repeat(10_001) } },
      })
    ).toThrow();
    expect(() =>
      analyzeDossierSchema.parse({
        dossierData: {},
        unexpected: true,
      })
    ).toThrow();
  });

  it('rejects malformed custom provider URLs', () => {
    expect(() =>
      analyzeDossierSchema.parse({
        dossierData: {},
        customConfig: { baseUrl: 'not-a-url' },
      })
    ).toThrow();
  });

  // 契约回归：chapter1.age 只接受纯数字。前端任何入口都必须先归一化
  // （见 src/utils/age.ts），否则整个提交会被 400 拒绝、卷宗静默不入库。
  it('accepts digit-only ages and rejects interval labels', () => {
    const parseAge = (age: string) =>
      analyzeDossierSchema.safeParse({ dossierData: { chapter1: { nickname: '年龄回归', age } } });

    expect(parseAge('28').success).toBe(true);
    expect(parseAge('').success).toBe(true);
    expect(parseAge('23-28岁').success).toBe(false);
    expect(parseAge('2328').success).toBe(true); // 纯数字即合法，区间语义由前端负责
  });

  it('caps avatarUrls at the shared MAX_DOSSIER_IMAGES limit', () => {
    const avatar = TINY_PNG;
    const makePayload = (count: number) =>
      analyzeDossierSchema.safeParse({
        dossierData: {
          chapter1: { nickname: '图片回归', avatarUrls: Array.from({ length: count }, () => avatar) },
        },
      });

    expect(makePayload(MAX_DOSSIER_IMAGES).success).toBe(true);
    expect(makePayload(MAX_DOSSIER_IMAGES + 1).success).toBe(false);
  });

  // 契约回归：卷宗必须带署名，否则管理端只能看到一堆无法分辨的匿名记录。
  it('requires a nickname even when chapter1 fields are otherwise valid', () => {
    const missing = analyzeDossierSchema.safeParse({ dossierData: { chapter2: { fantasyText: 'x' } } });
    expect(missing.success).toBe(false);
    if (!missing.success) {
      const issue = missing.error.issues.find(
        (i) => i.path.join('.') === 'dossierData.chapter1.nickname'
      );
      expect(issue?.message).toBe('名称或昵称至少需要 2 个字符');
    }

    // 只给空串同样不通过
    expect(
      analyzeDossierSchema.safeParse({ dossierData: { chapter1: { nickname: '   ' } } }).success
    ).toBe(false);

    // 合法昵称 + 其它字段留白仍然通过（署名是唯一新增的硬性要求）
    expect(
      analyzeDossierSchema.safeParse({ dossierData: { chapter1: { nickname: '夜樱' } } }).success
    ).toBe(true);
  });
});

describe('image data URL magic bytes', () => {
  const parseAvatar = (avatarUrl: string) =>
    analyzeDossierSchema.safeParse({ dossierData: { chapter1: { nickname: '图片回归', avatarUrl } } });
  const parseAttachment = (dataUrl: string, mimeType: string, type: 'image' | 'document' = 'image') =>
    mediaAttachmentSchema.safeParse({
      id: 'att_1',
      name: 'sample',
      type,
      mimeType,
      sizeBytes: 12,
      dataUrl,
    });

  it('accepts the four formats the client can produce', () => {
    for (const url of [TINY_PNG, TINY_JPEG, TINY_GIF, TINY_WEBP]) {
      expect(parseAvatar(url).success).toBe(true);
    }
  });

  it('rejects SVG and HTML disguised as images', () => {
    const svg = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
    const htmlAsPng = 'data:image/png;base64,PGh0bWw+PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0PjwvaHRtbD4=';
    expect(parseAvatar(svg).success).toBe(false);
    expect(parseAvatar(htmlAsPng).success).toBe(false);
    expect(parseAttachment(htmlAsPng, 'image/png').success).toBe(false);
  });

  it('rejects a MIME declaration that disagrees with the magic bytes', () => {
    // 声明 JPEG、实际是 PNG
    expect(parseAvatar(TINY_PNG.replace('image/png', 'image/jpeg')).success).toBe(false);
    expect(parseAttachment(TINY_PNG, 'image/jpeg').success).toBe(false);
  });

  it('still accepts an empty avatar and non-image attachments', () => {
    expect(parseAvatar('').success).toBe(true);
    expect(parseAttachment('data:application/pdf;base64,JVBERi0xLjQK', 'application/pdf', 'document').success).toBe(true);
  });
});

describe('envSchema', () => {
  const validBase = {
    JWT_SECRET: 'a_very_long_random_hex_string_64chars_a_very_long_random_hex_string_64chars',
    ADMIN_TOKEN: 'admin_token_string',
  };

  it('parses valid env with defaults for optional fields', () => {
    const parsed = envSchema.parse(validBase);
    expect(parsed.JWT_SECRET).toBe(validBase.JWT_SECRET);
    expect(parsed.ADMIN_TOKEN).toBe(validBase.ADMIN_TOKEN);
    expect(parsed.PORT).toBe(3000);
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.JWT_EXPIRES_IN).toBe('7d');
    expect(parsed.LLM_MODEL).toBe('deepseek-chat');
  });

  it('coerces PORT string to number', () => {
    const parsed = envSchema.parse({ ...validBase, PORT: '8080' });
    expect(parsed.PORT).toBe(8080);
  });

  it('rejects JWT_SECRET shorter than 16 chars', () => {
    expect(() => envSchema.parse({ ...validBase, JWT_SECRET: 'short' })).toThrow();
  });

  it('rejects JWT_SECRET containing "replace_with"', () => {
    expect(() =>
      envSchema.parse({ ...validBase, JWT_SECRET: 'replace_with_a_long_random_hex_string_at_least_32_chars' })
    ).toThrow();
  });

  it('rejects ADMIN_TOKEN shorter than 8 chars', () => {
    expect(() => envSchema.parse({ ...validBase, ADMIN_TOKEN: 'short' })).toThrow();
  });

  it('rejects invalid JWT_EXPIRES_IN format', () => {
    expect(() => envSchema.parse({ ...validBase, JWT_EXPIRES_IN: '7days' })).toThrow();
  });

  it('accepts valid JWT_EXPIRES_IN formats', () => {
    expect(envSchema.parse({ ...validBase, JWT_EXPIRES_IN: '24h' }).JWT_EXPIRES_IN).toBe('24h');
    expect(envSchema.parse({ ...validBase, JWT_EXPIRES_IN: '30m' }).JWT_EXPIRES_IN).toBe('30m');
    expect(envSchema.parse({ ...validBase, JWT_EXPIRES_IN: '7d' }).JWT_EXPIRES_IN).toBe('7d');
  });

  it('rejects invalid NODE_ENV value', () => {
    expect(() => envSchema.parse({ ...validBase, NODE_ENV: 'staging' })).toThrow();
  });

  it('accepts optional SENTRY_DSN as URL', () => {
    const parsed = envSchema.parse({
      ...validBase,
      SENTRY_DSN: 'https://example@sentry.io/123',
    });
    expect(parsed.SENTRY_DSN).toBe('https://example@sentry.io/123');
  });

  it('allows SENTRY_DSN to be undefined', () => {
    const parsed = envSchema.parse(validBase);
    expect(parsed.SENTRY_DSN).toBeUndefined();
  });

  it('validates FIELD_ENC_KEY at startup', () => {
    expect(() => envSchema.parse({
      JWT_SECRET: 'test-only-jwt-secret-at-least-32-characters',
      ADMIN_TOKEN: 'test-only-admin-token',
      FIELD_ENC_KEY: 'not-a-32-byte-key',
    })).toThrow();

    expect(envSchema.parse({
      JWT_SECRET: 'test-only-jwt-secret-at-least-32-characters',
      ADMIN_TOKEN: 'test-only-admin-token',
      FIELD_ENC_KEY: Buffer.alloc(32, 7).toString('base64'),
    }).FIELD_ENC_KEY).toBe(Buffer.alloc(32, 7).toString('base64'));
  });

  it('requires FIELD_ENC_KEY in production', () => {
    expect(() => envSchema.parse({ ...validBase, NODE_ENV: 'production' })).toThrow();
  });
});
