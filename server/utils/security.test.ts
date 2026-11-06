import { describe, expect, it } from 'vitest';
import { sanitizePayloadForLog } from './security.js';

describe('sanitizePayloadForLog', () => {
  it('does not mutate the original dossier payload', () => {
    const payload = {
      chapter1: {
        nickname: '小明',
        occupation: '学生',
        age: '25',
        maritalStatus: '未婚',
        hasBoyfriend: '单身',
        surfaceTrait: '乖乖女',
        innerDesire: '隐秘渴望',
        avatarUrls: ['data:image/jpeg;base64,abc'],
      },
      chapter2: {
        boundaryText: '边界',
        fantasyText: '幻想',
        relationPreference: '关系',
        awakeningMoment: '觉醒',
      },
      chapter3: {
        secretWords: '暗号',
        secretRule: '规则',
      },
      userTextAnswers: { q1: '手填答案' },
      questionLogs: [{ questionId: 'q1' }],
      telemetry: { a: 1 },
      completedBanks: [{ title: '题库' }],
      userMediaAttachments: { q2: [] },
    };

    const before = JSON.stringify(payload);
    const sanitized = sanitizePayloadForLog(payload) as Record<string, any>;

    expect(JSON.stringify(payload)).toBe(before);
    expect(sanitized.chapter1.nickname).toBe('[REDACTED]');
    expect(sanitized.chapter1.occupation).toBe('[REDACTED]');
    expect(sanitized.chapter1.surfaceTrait).toBe('[REDACTED]');
    expect(sanitized.chapter2.boundaryText).toBe('[REDACTED]');
    expect(sanitized.userTextAnswers).toBe('[REDACTED]');
  });
});
