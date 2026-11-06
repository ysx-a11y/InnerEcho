import { describe, expect, it } from 'vitest';
import { db } from '../db.js';
import type { FullDossierData, LlmAnalysisJson } from '../types.js';
import { recomputeDossierCredibility } from './credibilityBackfill.js';

function choiceBank(count: number) {
  return {
    id: 'bank_choice',
    title: '示例选择题库',
    category: 'demo',
    questions: Array.from({ length: count }, (_, index) => ({
      id: `q${index + 1}`,
      title: `题目 ${index + 1}`,
      type: 'single_choice',
      options: Array.from({ length: 5 }, (_, option) => ({
        id: `q${index + 1}_opt${option}`,
        text: `选项 ${option + 1}`,
      })),
    })),
  };
}

/** 直线作答（20 题全点第一个位置）：新算法必须压到 45 分。 */
function straightLineDossier(deviceId: string): FullDossierData {
  return {
    chapter1: { nickname: `回填测试-${deviceId}`, occupation: '测试职业' },
    completedBanks: [choiceBank(20)],
    selectedBankIds: ['bank_choice'],
    totalDurationSeconds: 140,
    questionLogs: Array.from({ length: 20 }, (_, index) => ({
      questionId: `q${index + 1}`,
      durationMs: 5000 + index * 200,
      interactionCount: 3,
      isLeftBlank: false,
      finalValue: { selectedOptions: [`q${index + 1}_opt0`] },
    })),
  } as FullDossierData;
}

/** 无作答轨迹的老卷宗：重算必须跳过。 */
function legacyDossier(deviceId: string): FullDossierData {
  return {
    chapter1: { nickname: `回填测试-${deviceId}`, occupation: '测试职业' },
    selectedShadowTags: ['反差情绪'],
  } as FullDossierData;
}

function legacyDiagnostic(): LlmAnalysisJson {
  return {
    credibilityScore: 92,
    credibilityLevel: 'high',
    archetypeTitle: '旧原型',
    personaDeconstruction: '原报告·人格面具段落',
    shadowDeconstruction: '原报告·阴影段落',
    psychologicalSublimation: '原报告·升华段落',
    resonanceKeywords: ['旧关键词'],
  };
}

describe('recomputeDossierCredibility（存量卷宗可信度回填）', () => {
  it('预演模式只统计、不写库', async () => {
    const saved = await db.saveDossier(null, 'dev-backfill-dry', straightLineDossier('dry'), legacyDiagnostic());

    const summary = await recomputeDossierCredibility({ apply: false });

    expect(summary.evaluated).toBeGreaterThan(0);
    expect(summary.updated).toBe(0);
    expect(summary.changes.some((change) => change.id === saved.id)).toBe(true);
    expect(summary.changes.find((change) => change.id === saved.id)?.previousScore).toBe(92);

    const row = await db.getDossierRowById(saved.id);
    const diagnostic = row?.diagnosticResult as Record<string, unknown>;
    expect(diagnostic.credibilityScore).toBe(92);
    expect(diagnostic.credibilityLevel).toBe('high');
  });

  it('写回后只替换可信度字段，报告正文与其余指标保留', async () => {
    const saved = await db.saveDossier(null, 'dev-backfill-apply', straightLineDossier('apply'), legacyDiagnostic());

    const summary = await recomputeDossierCredibility({ apply: true });
    expect(summary.updated).toBe(summary.evaluated);

    const row = await db.getDossierRowById(saved.id);
    const diagnostic = row?.diagnosticResult as Record<string, unknown>;
    expect(diagnostic.credibilityScore).toBe(45);
    expect(diagnostic.credibilityLevel).toBe('low');
    expect(Array.isArray(diagnostic.credibilityReasons)).toBe(true);
    expect(String((diagnostic.credibilityReasons as string[]).join())).toContain('选项位次');
    // 报告正文与 LLM 产出字段必须原样保留
    expect(diagnostic.personaDeconstruction).toBe('原报告·人格面具段落');
    expect(diagnostic.shadowDeconstruction).toBe('原报告·阴影段落');
    expect(diagnostic.psychologicalSublimation).toBe('原报告·升华段落');
    expect(diagnostic.archetypeTitle).toBe('旧原型');
  });

  it('缺少作答轨迹的老卷宗保持原值，不被判低', async () => {
    const saved = await db.saveDossier(null, 'dev-backfill-legacy', legacyDossier('legacy'), legacyDiagnostic());

    const summary = await recomputeDossierCredibility({ apply: true });
    expect(summary.skippedNoTrace).toBeGreaterThan(0);

    const row = await db.getDossierRowById(saved.id);
    const diagnostic = row?.diagnosticResult as Record<string, unknown>;
    expect(diagnostic.credibilityScore).toBe(92);
    expect(diagnostic.credibilityLevel).toBe('high');
    expect(diagnostic.credibilityReasons).toBeUndefined();
  });

  it('重复执行结果稳定（幂等）', async () => {
    const saved = await db.saveDossier(null, 'dev-backfill-idem', straightLineDossier('idem'), legacyDiagnostic());
    await recomputeDossierCredibility({ apply: true });
    const before = await db.getDossierRowById(saved.id);

    const second = await recomputeDossierCredibility({ apply: true });
    const after = await db.getDossierRowById(saved.id);

    expect(second.changed).toBe(0);
    expect((before?.diagnosticResult as Record<string, unknown>).credibilityScore).toBe(45);
    expect((after?.diagnosticResult as Record<string, unknown>).credibilityScore)
      .toBe((before?.diagnosticResult as Record<string, unknown>).credibilityScore);
  });
});
