import { describe, it, expect, beforeEach } from 'vitest';
import { telemetryTracker } from './telemetryTracker';

describe('telemetryTracker', () => {
  beforeEach(() => {
    telemetryTracker.reset();
  });

  it('汇总按键与退格统计并计算删除率', () => {
    telemetryTracker.setActiveField('f1', '填空一');
    telemetryTracker.recordKeystroke('a', 'f1', '填空一');
    telemetryTracker.recordKeystroke('b', 'f1', '填空一');
    telemetryTracker.recordKeystroke('c', 'f1', '填空一');
    telemetryTracker.recordKeystroke('Backspace', 'f1', '填空一');
    telemetryTracker.recordKeystroke('Backspace', 'f1', '填空一');

    const snapshot = telemetryTracker.getSnapshot();

    expect(snapshot.totalKeystrokes).toBe(5);
    expect(snapshot.totalBackspaces).toBe(2);
    expect(snapshot.deletionRatePercent).toBe(40);
    expect(snapshot.fieldTelemetryMap.f1.deletionRatePercent).toBe(40);
    expect(snapshot.topStruggledFields[0]?.label).toBe('填空一');
  });

  it('记录选项反复横跳且相同值不计数', () => {
    telemetryTracker.recordOptionChange('探索深度', 'light', 'medium');
    telemetryTracker.recordOptionChange('探索深度', 'medium', 'light');
    telemetryTracker.recordOptionChange('探索深度', 'light', 'light');

    const snapshot = telemetryTracker.getSnapshot();

    expect(snapshot.flipFlopCount).toBe(2);
    expect(snapshot.flipFlopLog).toHaveLength(2);
  });

  it('reset 清空全部统计', () => {
    telemetryTracker.recordKeystroke('a', 'f1', '填空一');
    telemetryTracker.recordOptionChange('探索深度', 'light', 'medium');

    telemetryTracker.reset();
    const snapshot = telemetryTracker.getSnapshot();

    expect(snapshot.totalKeystrokes).toBe(0);
    expect(snapshot.totalBackspaces).toBe(0);
    expect(snapshot.topStruggledFields).toEqual([]);
    expect(snapshot.flipFlopCount).toBe(0);
    expect(Object.keys(snapshot.fieldTelemetryMap)).toHaveLength(0);
  });
});
