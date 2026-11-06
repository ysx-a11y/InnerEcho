import { describe, it, expect, beforeEach } from 'vitest';
import { questionTelemetry } from './questionTelemetryTracker';

describe('questionTelemetryTracker', () => {
  beforeEach(() => {
    questionTelemetry.reset();
  });

  it('记录选项选择并结算停留时长', () => {
    questionTelemetry.startQuestion('q1', 'bank1');
    questionTelemetry.recordOptionSelect('q1', ['a', 'b']);
    questionTelemetry.finishQuestion('q1');

    const logs = questionTelemetry.getAllLogs();

    expect(logs).toHaveLength(1);
    expect(logs[0].questionId).toBe('q1');
    expect(logs[0].finalValue.selectedOptions).toEqual(['a', 'b']);
    expect(logs[0].interactionCount).toBe(1);
    expect(logs[0].leaveTimestamp).toBeDefined();
    expect(logs[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('切换题目时自动结算上一题', () => {
    questionTelemetry.startQuestion('q1', 'bank1');
    questionTelemetry.recordTextInput('q1', 'hello');
    questionTelemetry.startQuestion('q2', 'bank1');
    questionTelemetry.finishQuestion('q2');

    const logs = questionTelemetry.getAllLogs();

    expect(logs).toHaveLength(2);
    expect(logs[0].questionId).toBe('q1');
    expect(logs[0].finalValue.textInput).toBe('hello');
    expect(logs[1].questionId).toBe('q2');
  });

  it('reset 清空全部日志', () => {
    questionTelemetry.startQuestion('q1', 'bank1');
    questionTelemetry.recordOptionSelect('q1', ['a']);
    questionTelemetry.reset();

    expect(questionTelemetry.getAllLogs()).toHaveLength(0);
  });
});
