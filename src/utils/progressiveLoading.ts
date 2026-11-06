type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

type PreloadTask = {
  key: string;
  load: () => Promise<unknown>;
  priority: number;
};

function getConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

/** 尊重省流量模式，并排除慢速移动网络（2G/3G），避免后台预取挤占主答题与图片传输带宽。 */
export function allowsSpeculativeLoading(): boolean {
  const connection = getConnection();
  if (connection?.saveData) return false;
  if (connection?.effectiveType && ['slow-2g', '2g', '3g'].includes(connection.effectiveType)) {
    return false;
  }
  return true;
}

export class ProgressivePreloadCoordinator {
  private pending = new Map<string, PreloadTask>();
  private promises = new Map<string, Promise<unknown>>();
  private pauseCount = 0;
  private draining = false;

  enqueue(key: string, load: () => Promise<unknown>, priority = 0): void {
    if (!allowsSpeculativeLoading() || this.promises.has(key)) return;
    const current = this.pending.get(key);
    if (!current || priority > current.priority) this.pending.set(key, { key, load, priority });
    void this.drain();
  }

  /** Suspend queued background work. A browser request already in flight cannot be aborted safely. */
  pause(): void {
    this.pauseCount += 1;
  }

  resume(): void {
    this.pauseCount = Math.max(0, this.pauseCount - 1);
    void this.drain();
  }

  /** User intent wins immediately; queued background work resumes after this dependency is ready. */
  prioritize<T>(key: string, load: () => Promise<T>): Promise<T> {
    this.pending.delete(key);
    this.pause();
    const existing = this.promises.get(key) as Promise<T> | undefined;
    if (existing) return existing.finally(() => this.resume());

    const promise = load().catch((error) => {
      this.promises.delete(key);
      throw error;
    });
    this.promises.set(key, promise);
    return promise.finally(() => this.resume());
  }

  private async drain(): Promise<void> {
    if (this.draining || this.pauseCount > 0 || this.pending.size === 0) return;
    this.draining = true;
    try {
      while (this.pauseCount === 0 && this.pending.size > 0) {
        const next = [...this.pending.values()].sort((a, b) => b.priority - a.priority)[0];
        this.pending.delete(next.key);
        const existing = this.promises.get(next.key);
        if (existing) {
          await existing.catch(() => undefined);
          continue;
        }
        const promise = next.load().catch((error) => {
          this.promises.delete(next.key);
          throw error;
        });
        this.promises.set(next.key, promise);
        await promise.catch(() => undefined);
      }
    } finally {
      this.draining = false;
      if (this.pauseCount === 0 && this.pending.size > 0) void this.drain();
    }
  }
}

export const progressivePreloader = new ProgressivePreloadCoordinator();

/** 等页面 load 后再执行任务（无省流量/慢网络门禁，供核心埋点使用）。 */
function scheduleAfterLoad(task: () => void, timeout: number): () => void {
  let cancelled = false;
  let timerId: number | undefined;
  let idleId: number | undefined;

  const run = () => {
    if (!cancelled) task();
  };
  const schedule = () => {
    if ('requestIdleCallback' in window) {
      idleId = (window as typeof window & {
        requestIdleCallback: (callback: () => void, options?: { timeout: number }) => number;
      }).requestIdleCallback(run, { timeout });
    } else {
      timerId = globalThis.setTimeout(run, Math.min(timeout, 2_000)) as unknown as number;
    }
  };

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });

  return () => {
    cancelled = true;
    window.removeEventListener('load', schedule);
    if (timerId !== undefined) globalThis.clearTimeout(timerId);
    if (idleId !== undefined && 'cancelIdleCallback' in window) {
      (window as typeof window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
    }
  };
}

/** Run non-essential loading only after the page has become interactive. */
export function scheduleProgressiveLoad(task: () => void, timeout = 4_000): () => void {
  if (typeof window === 'undefined' || !allowsSpeculativeLoading()) return () => {};
  return scheduleAfterLoad(task, timeout);
}

/** 核心埋点专用：页面加载后必定上报，不受省流量/2G-3G 门禁影响（bot 过滤由调用方负责）。 */
export function scheduleEssentialPostLoad(task: () => void, timeout = 6_000): () => void {
  if (typeof window === 'undefined') return () => {};
  return scheduleAfterLoad(task, timeout);
}
