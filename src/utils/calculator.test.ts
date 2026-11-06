import { describe, it, expect } from 'vitest';
import { buildRestoredDossierResult } from './calculator';
import type { RestoredDossierContract } from '../../shared/apiContracts';

const sampleRow: RestoredDossierContract = {
  id: 'dos_test',
  chapter1: {
    nickname: '测试者',
    avatarUrls: [],
    avatarUrl: '',
    occupation: '建筑师',
    personaTrait: '端庄淑女',
    age: '30岁',
    maritalStatus: '未婚',
    hasBoyfriend: '单身',
    surfaceTrait: '严谨自律',
    innerDesire: '渴望交出掌控权',
  },
  chapter2: {
    boundaryText: '一条边界',
    fantasyText: '一个幻想',
    relationPreference: '被引导',
    awakeningMoment: '某个瞬间',
  },
  chapter3: {
    secretWords: '第一句话',
    secretRule: '核心法则',
  },
  depthRating: 'deep',
  selectedShadowTags: ['角色互换'],
  diagnosticResult: {
    archetypeTitle: '暗夜破局者',
    personaDeconstruction: '测试人格解构',
    shadowDeconstruction: '测试阴影解构',
    psychologicalSublimation: '测试升华建议',
    resonanceKeywords: ['反差觉醒'],
  },
  createdAt: '2026-08-09T00:00:00.000Z',
};

describe('buildRestoredDossierResult', () => {
  it('从历史卷宗行重建完整的 FullDossierResult', () => {
    const result = buildRestoredDossierResult(sampleRow);

    expect(result).not.toBeNull();
    expect(result?.dossierData.chapter1.occupation).toBe('建筑师');
    expect(result?.dossierData.chapter1.innerDesire).toBe('渴望交出掌控权');
    expect(result?.dossierData.depthRating).toBe('deep');
    expect(result?.dossierData.selectedShadowTags).toEqual(['角色互换']);
    expect(result?.archetype).toBeDefined();
    expect(result?.behavior.filledCount).toBeGreaterThan(0);
    expect(result?.normalized.awareness).toBeGreaterThan(0);
    expect(result?.llmAnalysis.archetypeTitle).toBe('暗夜破局者');
  });

  it('缺少 diagnosticResult 时返回 null', () => {
    const row: RestoredDossierContract = { ...sampleRow, diagnosticResult: undefined };
    expect(buildRestoredDossierResult(row)).toBeNull();
  });
});
