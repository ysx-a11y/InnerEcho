import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db.js';
import type { FullDossierData, LlmAnalysisJson } from '../types.js';
import { analyzeDossier } from './analyzeService.js';
import * as llmModule from '../utils/llm.js';

const minimalDossier: FullDossierData = {
  chapter1: { occupation: '开发者' },
  chapter2: {},
  chapter3: {},
};

/**
 * 带完整作答轨迹的卷宗：可信度由算法按作答过程算出 high，
 * 用于验证"走 LLM 分析"这条主链路。
 */
const credibleDossier: FullDossierData = {
  chapter1: { occupation: '开发者' },
  chapter2: {},
  chapter3: {},
  completedBanks: [{
    id: 'bank_choice',
    title: '示例选择题库',
    category: 'demo',
    questions: Array.from({ length: 8 }, (_, index) => ({
      id: `q${index + 1}`,
      title: `题目 ${index + 1}`,
      type: 'single_choice',
      options: Array.from({ length: 5 }, (_, option) => ({
        id: `q${index + 1}_opt${option}`,
        text: `选项 ${option + 1}`,
      })),
    })),
  }],
  totalDurationSeconds: 96,
  questionLogs: [3200, 5100, 7400, 4600, 6100, 8800, 3900, 9200].map((duration, index) => ({
    questionId: `q${index + 1}`,
    durationMs: duration,
    interactionCount: 4,
    isLeftBlank: false,
    finalValue: { selectedOptions: [`q${index + 1}_opt${index % 5}`] },
  })),
};

const fakeLlmResponse: LlmAnalysisJson = {
  credibilityScore: 90,
  credibilityLevel: 'high',
  archetypeTitle: '测试原型',
  personaDeconstruction: '测试内容',
  shadowDeconstruction: '测试内容',
  psychologicalSublimation: '测试内容',
  resonanceKeywords: ['测试关键词'],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('analyzeDossier', () => {
  it('persists anonymous results when a deviceId (UUID) is present', async () => {
    // Mock callLlm 返回假响应，避免真实 API 调用
    vi.spyOn(llmModule, 'callLlm').mockResolvedValue({
      ok: true,
      data: fakeLlmResponse,
    });

    const saveSpy = vi.spyOn(db, 'saveDossier').mockResolvedValue({
      id: 'unused',
      createdAt: new Date(0).toISOString(),
    });

    const result = await analyzeDossier({
      dossierData: credibleDossier,
      userId: null,
      deviceId: 'device-test',
      ipAddress: '127.0.0.1',
    });

    expect(result.success).toBe(true);
    expect(result.saved).toBe(true);
    expect(result.dossierId).toBe('unused');
    expect(result.data.credibilityLevel).toBeUndefined();
    expect(result.data.credibilityScore).toBeUndefined();
    expect(saveSpy).toHaveBeenCalledOnce();
    expect(saveSpy).toHaveBeenCalledWith(
      null,
      'device-test',
      credibleDossier,
      expect.objectContaining({ credibilityLevel: 'high' })
    );
  });

  it('rejects anonymous results without a deviceId instead of reporting success', async () => {
    vi.spyOn(llmModule, 'callLlm').mockResolvedValue({
      ok: true,
      data: fakeLlmResponse,
    });

    const saveSpy = vi.spyOn(db, 'saveDossier').mockResolvedValue({
      id: 'unused',
      createdAt: new Date(0).toISOString(),
    });

    await expect(analyzeDossier({
        dossierData: minimalDossier,
        userId: null,
        deviceId: '',
        ipAddress: '127.0.0.1',
      }))
      .rejects.toThrow('dossier identity required');

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('propagates a persistence failure and never returns a false success', async () => {
    vi.spyOn(llmModule, 'callLlm').mockResolvedValue({ ok: true, data: fakeLlmResponse });
    vi.spyOn(db, 'saveDossier').mockRejectedValue(new Error('database is locked'));

    await expect(analyzeDossier({
      dossierData: minimalDossier,
      userId: 'user-test',
      deviceId: 'device-test',
      ipAddress: '127.0.0.1',
    })).rejects.toThrow('database is locked');
  });

  it('persists fallback results for an authenticated user', async () => {
    // Mock callLlm 返回假响应
    vi.spyOn(llmModule, 'callLlm').mockResolvedValue({
      ok: true,
      data: fakeLlmResponse,
    });

    const saveSpy = vi.spyOn(db, 'saveDossier').mockResolvedValue({
      id: 'dossier-test',
      createdAt: new Date(0).toISOString(),
    });

    const result = await analyzeDossier({
      dossierData: credibleDossier,
      userId: 'user-test',
      deviceId: 'device-test',
      ipAddress: '127.0.0.1',
    });

    expect(saveSpy).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ success: true, saved: true, dossierId: 'dossier-test' });
    expect(saveSpy).toHaveBeenCalledWith(
      'user-test',
      'device-test',
      credibleDossier,
      expect.objectContaining({ credibilityLevel: 'high' })
    );
  });

  it('以算法算出的可信度为准，不采用 LLM 自评的可信度', async () => {
    vi.spyOn(llmModule, 'callLlm').mockResolvedValue({
      ok: true,
      data: { ...fakeLlmResponse, credibilityScore: 100, credibilityLevel: 'high' },
    });
    const saveSpy = vi.spyOn(db, 'saveDossier').mockResolvedValue({
      id: 'dossier-test',
      createdAt: new Date(0).toISOString(),
    });

    await analyzeDossier({
      dossierData: credibleDossier,
      userId: null,
      deviceId: 'device-test',
      ipAddress: '127.0.0.1',
    });

    const savedAnalysis = saveSpy.mock.calls[0]?.[3] as LlmAnalysisJson;
    expect(savedAnalysis.credibilityScore).not.toBe(100);
    expect(Array.isArray(savedAnalysis.credibilityReasons)).toBe(true);
  });

  it('缺少作答轨迹的卷宗不调用 LLM，直接落库兜底报告', async () => {
    const llmSpy = vi.spyOn(llmModule, 'callLlm').mockResolvedValue({
      ok: true,
      data: fakeLlmResponse,
    });
    const saveSpy = vi.spyOn(db, 'saveDossier').mockResolvedValue({
      id: 'dossier-test',
      createdAt: new Date(0).toISOString(),
    });

    const result = await analyzeDossier({
      dossierData: minimalDossier,
      userId: 'user-test',
      deviceId: 'device-test',
      ipAddress: '127.0.0.1',
    });

    expect(llmSpy).not.toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalledOnce();
    const savedAnalysis = saveSpy.mock.calls[0]?.[3] as LlmAnalysisJson;
    expect(savedAnalysis.credibilityLevel).toBe('low');
    expect(savedAnalysis.credibilityScore).toBe(40);
    expect(result.data.credibilityLevel).toBeUndefined();
    expect(result.data.credibilityScore).toBeUndefined();
  });

  it('LLM 失败时落库兜底并标记 llmFailed，供前端手动重试', async () => {
    vi.spyOn(llmModule, 'callLlm').mockResolvedValue({
      ok: false,
      degenerate: true,
      errorMessage: 'LLM 返回明显异常结果：四维指标全部为 0（疑似 0000 默认值）',
    });
    const saveSpy = vi.spyOn(db, 'saveDossier').mockResolvedValue({
      id: 'dossier-test',
      createdAt: new Date(0).toISOString(),
    });

    const result = await analyzeDossier({
      dossierData: credibleDossier,
      userId: 'user-test',
      deviceId: 'device-test',
      ipAddress: '127.0.0.1',
    });

    expect(saveSpy).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      success: true,
      saved: true,
      isFallback: true,
      llmFailed: true,
    });
  });

  it('可信度不足的合规兜底不标记 llmFailed', async () => {
    const saveSpy = vi.spyOn(db, 'saveDossier').mockResolvedValue({
      id: 'dossier-test',
      createdAt: new Date(0).toISOString(),
    });

    const result = await analyzeDossier({
      dossierData: minimalDossier,
      userId: 'user-test',
      deviceId: 'device-test',
      ipAddress: '127.0.0.1',
    });

    expect(saveSpy).toHaveBeenCalledOnce();
    expect(result.isFallback).toBe(true);
    expect(result.llmFailed).toBeFalsy();
  });

  it('向普通用户返回的分析结果绝对不包含内部可信度字段', async () => {
    vi.spyOn(llmModule, 'callLlm').mockResolvedValue({
      ok: true,
      data: fakeLlmResponse,
    });
    vi.spyOn(db, 'saveDossier').mockResolvedValue({
      id: 'dossier-privacy-test',
      createdAt: new Date().toISOString(),
    });

    const result = await analyzeDossier({
      dossierData: credibleDossier,
      userId: 'user-test',
      deviceId: 'device-test',
      ipAddress: '127.0.0.1',
    });

    const rawJson = JSON.stringify(result);
    expect(rawJson).not.toContain('credibilityScore');
    expect(rawJson).not.toContain('credibilityLevel');
    expect(rawJson).not.toContain('credibilityReasons');
  });
});
