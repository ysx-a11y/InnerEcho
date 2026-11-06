/**
 * Telemetry & Micro-behavior Analytics Engine for InnerEcho
 * Tracks environment context, typing mechanics (backspaces/pauses per field), option hesitation (flip-flops), and touch dynamics.
 */

export interface FieldTelemetry {
  fieldId: string;
  fieldLabel: string;
  keystrokes: number;
  backspaces: number;
  deletionRatePercent: number;
  pauses: number;
  struggleScore: number; // Combined struggle weight score
}

export interface TelemetryMetrics {
  // 1. Environment & Device Context
  submitTimestamp: string;
  isDarkMode: boolean;
  isLateNight: boolean;

  // 2. Typing Behavior Metrics (Global)
  totalKeystrokes: number;
  totalBackspaces: number;
  deletionRatePercent: number;
  hesitationPauses: number;

  // 3. Per-Field Telemetry & Top 3 Struggled Ranking
  fieldTelemetryMap: Record<string, FieldTelemetry>;
  topStruggledFields: { label: string; deletionRate: number; pauses: number; score: number }[];

  // 4. Choice Flip-Flop Trajectory (反复横跳)
  flipFlopCount: number;
  flipFlopLog: string[];

  // 5. Touch & Pointer Dynamics
  avgTouchDurationMs: number;
  maxTouchForce?: number;
}

class TelemetryTracker {
  private totalKeystrokes = 0;
  private totalBackspaces = 0;
  private hesitationPauses = 0;
  private lastKeystrokeTime = 0;

  private fieldMap: Record<string, { label: string; keystrokes: number; backspaces: number; pauses: number }> = {};
  private activeFieldId: string = '';

  private flipFlopCount = 0;
  private flipFlopLog: string[] = [];

  private touchDurations: number[] = [];
  private touchForces: number[] = [];

  // Stored handler references so removeEventListener can match the same function.
  private touchStartTime = 0;
  private readonly onTouchStart: (e: TouchEvent) => void;
  private readonly onTouchEnd: () => void;
  private listenersAttached = false;

  constructor() {
    this.onTouchStart = (e: TouchEvent) => {
      this.touchStartTime = Date.now();
      if (e.touches && e.touches[0] && typeof (e.touches[0] as any).force === 'number') {
        const force = (e.touches[0] as any).force;
        if (force > 0) this.touchForces.push(force);
      }
    };

    this.onTouchEnd = () => {
      if (this.touchStartTime > 0) {
        const duration = Date.now() - this.touchStartTime;
        this.touchDurations.push(duration);
        this.touchStartTime = 0;
      }
    };

    this.initGlobalListeners();
  }

  private initGlobalListeners() {
    if (typeof window === 'undefined' || this.listenersAttached) return;

    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchend', this.onTouchEnd, { passive: true });
    this.listenersAttached = true;
  }

  /**
   * Remove global touch listeners. Call this when the tracker is no longer
   * needed (e.g. during Vite HMR) to prevent memory leaks from stacked listeners.
   */
  public destroy() {
    if (typeof window === 'undefined' || !this.listenersAttached) return;
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchend', this.onTouchEnd);
    this.listenersAttached = false;
  }

  /**
   * Set active field context for per-field tracking
   */
  public setActiveField(fieldId: string, label: string) {
    this.activeFieldId = fieldId;
    if (!this.fieldMap[fieldId]) {
      this.fieldMap[fieldId] = { label, keystrokes: 0, backspaces: 0, pauses: 0 };
    }
  }

  /**
   * Record a keystroke event in text input (global + per-field)
   */
  public recordKeystroke(key: string, fieldId?: string, label?: string) {
    const targetField = fieldId || this.activeFieldId || 'general';
    const targetLabel = label || targetField;

    if (!this.fieldMap[targetField]) {
      this.fieldMap[targetField] = { label: targetLabel, keystrokes: 0, backspaces: 0, pauses: 0 };
    }

    const now = Date.now();
    this.totalKeystrokes += 1;
    this.fieldMap[targetField].keystrokes += 1;

    const isDelete = key === 'Backspace' || key === 'Delete';
    if (isDelete) {
      this.totalBackspaces += 1;
      this.fieldMap[targetField].backspaces += 1;
    }

    if (this.lastKeystrokeTime > 0) {
      const diff = now - this.lastKeystrokeTime;
      if (diff > 2500) {
        // Pause > 2.5 seconds indicates hesitation/reflection
        this.hesitationPauses += 1;
        this.fieldMap[targetField].pauses += 1;
      }
    }
    this.lastKeystrokeTime = now;
  }

  /**
   * Record an option flip-flop / change (e.g. changing marital status, depth, or tags)
   */
  public recordOptionChange(category: string, from: string, to: string) {
    if (from === to) return;
    this.flipFlopCount += 1;
    const logEntry = `[${new Date().toLocaleTimeString()}] ${category}: "${from}" -> "${to}"`;
    this.flipFlopLog.push(logEntry);
  }

  public getSummary(): TelemetryMetrics {
    return this.getSnapshot();
  }

  /**
   * Snapshot all telemetry metrics & Top 3 struggled fields ranking for submission
   */
  public getSnapshot(): TelemetryMetrics {
    const now = new Date();
    const hours = now.getHours();
    const isLateNight = hours >= 22 || hours <= 5;

    const isDarkMode =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const globalDeletionRate =
      this.totalKeystrokes > 0
        ? Math.round((this.totalBackspaces / this.totalKeystrokes) * 100)
        : 0;

    const fieldTelemetryMap: Record<string, FieldTelemetry> = {};
    const fieldRankingList: { label: string; deletionRate: number; pauses: number; score: number }[] = [];

    Object.entries(this.fieldMap).forEach(([id, f]) => {
      const delRate = f.keystrokes > 0 ? Math.round((f.backspaces / f.keystrokes) * 100) : 0;
      // Struggle score formula: Backspaces * 3 + Pauses * 8 + Keystrokes * 0.1
      const struggleScore = Math.round(f.backspaces * 3 + f.pauses * 8 + f.keystrokes * 0.1);

      fieldTelemetryMap[id] = {
        fieldId: id,
        fieldLabel: f.label,
        keystrokes: f.keystrokes,
        backspaces: f.backspaces,
        deletionRatePercent: delRate,
        pauses: f.pauses,
        struggleScore,
      };

      if (f.keystrokes > 0) {
        fieldRankingList.push({
          label: f.label,
          deletionRate: delRate,
          pauses: f.pauses,
          score: struggleScore,
        });
      }
    });

    // Rank Top 3 struggled fields
    fieldRankingList.sort((a, b) => b.score - a.score);
    const topStruggledFields = fieldRankingList.slice(0, 3);

    const avgTouchDurationMs =
      this.touchDurations.length > 0
        ? Math.round(
            this.touchDurations.reduce((a, b) => a + b, 0) / this.touchDurations.length
          )
        : 0;

    const maxTouchForce =
      this.touchForces.length > 0 ? Math.max(...this.touchForces) : undefined;

    return {
      submitTimestamp: now.toLocaleString(),
      isDarkMode: Boolean(isDarkMode),
      isLateNight,
      totalKeystrokes: this.totalKeystrokes,
      totalBackspaces: this.totalBackspaces,
      deletionRatePercent: globalDeletionRate,
      hesitationPauses: this.hesitationPauses,
      fieldTelemetryMap,
      topStruggledFields,
      flipFlopCount: this.flipFlopCount,
      flipFlopLog: this.flipFlopLog.slice(-10),
      avgTouchDurationMs,
      maxTouchForce,
    };
  }

  /**
   * Reset stats for a new dossier run
   */
  public reset() {
    this.totalKeystrokes = 0;
    this.totalBackspaces = 0;
    this.hesitationPauses = 0;
    this.lastKeystrokeTime = 0;
    this.fieldMap = {};
    this.activeFieldId = '';
    this.flipFlopCount = 0;
    this.flipFlopLog = [];
    this.touchDurations = [];
    this.touchForces = [];
  }
}

export const telemetryTracker = new TelemetryTracker();

// Vite HMR: destroy the old singleton's listeners before the module is replaced,
// preventing stacked touchstart/touchend listeners on every hot reload.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    telemetryTracker.destroy();
  });
}
