import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * C1 回归测试（2026-08-10 生产事故）：
 * 匿名测评提交若不带 X-Device-Id，后端会按“无身份”规则静默丢弃卷宗。
 * 该测试直接从源码断言请求头，防止前端再次漏发设备标识。
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const submissionHookSource = fs.readFileSync(
  path.resolve(__dirname, '../hooks/useDossierSubmission.ts'),
  'utf-8',
);

describe('匿名测评请求必须携带设备标识（C1 回归）', () => {
  it('提交 hook 已引入 getOrCreateDeviceId', () => {
    expect(submissionHookSource).toMatch(/import\s*\{[^}]*getOrCreateDeviceId[^}]*\}\s*from\s*['"][^'"]*deviceId['"]/);
  });

  it('/api/analyze-dossier 请求包含 X-Device-Id 头', () => {
    const block = submissionHookSource.slice(submissionHookSource.indexOf("fetch('/api/analyze-dossier'"));
    expect(block).toMatch(/X-Device-Id/);
    expect(block).toMatch(/getOrCreateDeviceId\(\)/);
  });
});
