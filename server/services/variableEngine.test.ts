import { describe, it, expect } from 'vitest';
import {
  renderTemplateWithVariables,
  getPresetMockVariables,
  extractDossierVariables,
  wrapUntrustedInput,
} from './variableEngine.js';
import type { FullDossierData } from '../types.js';

describe('VariableEngine', () => {
  it('wraps untrusted user input within xml tags', () => {
    const wrapped = wrapUntrustedInput('法务总监', 'user_occupation');
    expect(wrapped).toBe('<user_occupation>\n法务总监\n</user_occupation>');
    expect(wrapUntrustedInput('')).toBe('');
  });

  it('renders template with matching variables', () => {
    const template = '你好，{{user.nickname}}！你的职业是 {{ user.occupation }}。';
    const vars = {
      'user.nickname': 'Alice',
      'user.occupation': '医师',
    };
    const rendered = renderTemplateWithVariables(template, vars);
    expect(rendered).toBe('你好，Alice！你的职业是 医师。');
  });

  it('preserves or strips unmatched placeholders based on options', () => {
    const template = '已知：{{user.nickname}}，未知：{{unknown.var}}';
    const vars = { 'user.nickname': 'Bob' };

    const withPreserve = renderTemplateWithVariables(template, vars);
    expect(withPreserve).toBe('已知：Bob，未知：{{unknown.var}}');

    const withStrip = renderTemplateWithVariables(template, vars, { stripUnmatched: true });
    expect(withStrip).toBe('已知：Bob，未知：');
  });

  it('provides comprehensive preset mock variables for dry-run', () => {
    const mocks = getPresetMockVariables();
    expect(mocks['user.nickname']).toBeTruthy();
    expect(mocks['user.occupation']).toContain('法务');
    expect(mocks['dossier.scores_table']).toContain('臣服指数');
    expect(mocks['interrogate.dossier_brief']).toBeTruthy();
  });

  it('extracts variables cleanly from full dossier data', () => {
    const mockData: FullDossierData = {
      chapter1: {
        nickname: '夜幕',
        occupation: '建筑设计师',
        surfaceTrait: '冷静高冷',
        innerDesire: '渴望被完全看透',
        age: '26',
        maritalStatus: '单身',
        hasBoyfriend: '',
      },
      completedBanks: [
        {
          id: 'bank_test',
          title: '权力图谱测试',
          description: '探索隐秘欲望',
        },
      ],
      questionLogs: [
        {
          questionId: 'q_1',
          durationMs: 25000,
        },
      ],
      userTextAnswers: {
        q_1: '这是一句手填自白',
      },
    };

    const vars = extractDossierVariables(mockData);
    expect(vars['user.nickname']).toBe('夜幕');
    expect(vars['user.occupation']).toContain('建筑设计师');
    expect(vars['user.persona']).toContain('冷静高冷');
    expect(vars['user.open_confession']).toContain('渴望被完全看透');
    expect(vars['dossier.bank_meta']).toContain('权力图谱测试');
    expect(vars['dossier.text_confessions']).toContain('这是一句手填自白');
    expect(vars['pace.hesitation_signals']).toContain('25 秒');
  });
});

