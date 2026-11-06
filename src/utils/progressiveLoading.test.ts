// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  ProgressivePreloadCoordinator,
  scheduleEssentialPostLoad,
  scheduleProgressiveLoad,
} from './progressiveLoading';

function setSaveData(enabled: boolean) {
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: { saveData: enabled, effectiveType: '3g' },
  });
}

function restoreConnection() {
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: undefined,
  });
}

describe('ProgressivePreloadCoordinator', () => {
  it('pauses background work and resumes it in priority order after user intent', async () => {
    const events: string[] = [];
    const coordinator = new ProgressivePreloadCoordinator();
    coordinator.pause();
    coordinator.enqueue('low', async () => { events.push('low'); }, 10);
    coordinator.enqueue('high', async () => { events.push('high'); }, 20);

    expect(events).toEqual([]);
    await coordinator.prioritize('interactive', async () => { events.push('interactive'); });
    expect(events).toEqual(['interactive']);

    coordinator.resume();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toEqual(['interactive', 'high', 'low']);
  });

  it('reuses an in-flight preload instead of starting the same resource twice', async () => {
    const coordinator = new ProgressivePreloadCoordinator();
    let starts = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const loader = async () => { starts += 1; await pending; };

    coordinator.enqueue('shared', loader, 10);
    const prioritized = coordinator.prioritize('shared', loader);
    release();
    await prioritized;

    expect(starts).toBe(1);
  });

  it('skips speculative tasks when data saving is enabled', () => {
    setSaveData(true);
    try {
      let ran = false;
      const cancel = scheduleProgressiveLoad(() => { ran = true; }, 50);
      expect(ran).toBe(false);
      cancel();
    } finally {
      restoreConnection();
    }
  });

  it('still runs essential post-load tasks when data saving is enabled', async () => {
    setSaveData(true);
    try {
      let ran = false;
      const cancel = scheduleEssentialPostLoad(() => { ran = true; }, 50);
      if (document.readyState !== 'complete') {
        window.dispatchEvent(new Event('load'));
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(ran).toBe(true);
      cancel();
    } finally {
      restoreConnection();
    }
  });
});
