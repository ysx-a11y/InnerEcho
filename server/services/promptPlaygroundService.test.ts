import { describe, it, expect } from 'vitest';
import { runPromptPlayground } from './promptPlaygroundService.js';

describe('PromptPlaygroundService', () => {
  it('runs dry run with mock variables and returns structured validation metrics', async () => {
    const result = await runPromptPlayground({
      draftSystemPrompt: '你是一位心理导师，分析{{user.occupation}}的心理反差。',
      mockSource: 'preset_mock',
    });

    expect(result.success).toBe(true);
    expect(result.renderedFullPrompt).toContain('外企合规法务总监');
    expect(result.metrics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.metrics.estimatedPromptTokens).toBeGreaterThan(0);
    expect(result.rawResponse).toBeTruthy();
    expect(result.validation.isValid).toBe(true);
  });

  it('runs dry run for interrogator agent', async () => {
    const result = await runPromptPlayground({
      agentId: 'agent_interrogator',
      draftSystemPrompt: '你是主审官，针对供词逼问被审人：{{interrogate.dossier_brief}}',
      mockSource: 'preset_mock',
    });

    expect(result.success).toBe(true);
    expect(result.renderedFullPrompt).toContain('外企法务');
    expect(result.rawResponse).toContain('你在第14题');
  });
});

