import { SingleQuestionLog, MediaAttachment } from '../types/quizEngine';

class QuestionTelemetryTracker {
  private logs: Map<string, SingleQuestionLog> = new Map();
  private currentActiveQuestionId: string | null = null;
  /**
   * 仍在计时的题目集合。
   *
   * 背景：startQuestion 在每次作答交互时都会被调用，而 handleSubmitAll 会对着
   * 全部题目再跑一遍 finishQuestion。旧实现的 finishQuestion 没有任何"是否已经
   * 结算过"的判断，每次调用都把 `now - enterTimestamp` 再加一遍，于是来回切题或
   * 交卷时单题停留时长会被反复累加，甚至出现"单题停留合计远大于整场作答时长"的
   * 假数据。这里显式记录计时中的题目，保证一次进入只结算一次。
   */
  private openQuestionIds = new Set<string>();

  /**
   * 启动单题埋点监控 (当用户切换到某道题时)
   */
  startQuestion(questionId: string, bankId: string): void {
    // 自动结算上道题
    if (this.currentActiveQuestionId && this.currentActiveQuestionId !== questionId) {
      this.finishQuestion(this.currentActiveQuestionId);
    }

    this.currentActiveQuestionId = questionId;
    const now = Date.now();

    if (!this.logs.has(questionId)) {
      this.logs.set(questionId, {
        questionId,
        bankId,
        enterTimestamp: now,
        interactionCount: 0,
        actionLogs: [`enter:${now}`],
        isLeftBlank: true,
        finalValue: {},
      });
      this.openQuestionIds.add(questionId);
    } else {
      const existing = this.logs.get(questionId)!;
      existing.actionLogs.push(`re_enter:${now}`);
      // 重新进入一道已结算的题：重开计时窗口，否则停留时长会把
      // "上次作答结束到这次重新进入"之间的空档也算进来。
      if (!this.openQuestionIds.has(questionId)) {
        existing.enterTimestamp = now;
        this.openQuestionIds.add(questionId);
      }
    }
  }

  /**
   * 记录单题内的用户交互流水 (支持隐私脱敏)
   */
  recordAction(questionId: string, actionType: string, payloadSummary?: string): void {
    const log = this.logs.get(questionId);
    if (!log) return;

    log.interactionCount += 1;
    const logEntry = payloadSummary ? `${actionType}:${payloadSummary}` : actionType;
    log.actionLogs.push(logEntry);
  }

  /**
   * 记录手填输入变化 (隐私脱敏：只记录字符长度变化与沉思停顿，保护隐秘草稿)
   */
  recordTextInput(questionId: string, text: string): void {
    const log = this.logs.get(questionId);
    if (!log) return;

    const trimmed = text.trim();
    log.finalValue.textInput = text;
    log.isLeftBlank = trimmed.length === 0 && !log.finalValue.selectedOptions?.length && !log.finalValue.mediaAttachments?.length;

    this.recordAction(questionId, 'text_input', `len_${trimmed.length}`);
  }

  /**
   * 记录选项选择动作
   */
  recordOptionSelect(questionId: string, selectedOptionIds: string[]): void {
    const log = this.logs.get(questionId);
    if (!log) return;

    log.finalValue.selectedOptions = selectedOptionIds;
    log.isLeftBlank = selectedOptionIds.length === 0 && !log.finalValue.textInput?.trim() && !log.finalValue.mediaAttachments?.length;

    this.recordAction(questionId, 'select_options', selectedOptionIds.join(','));
  }

  /**
   * 记录多媒体文件上传动作（隐私脱敏：仅保留附件元信息，抹除巨大的 dataUrl 字符，
   * 避免与 userMediaAttachments 重复打包 base64 导致请求体翻倍触发 413）
   */
  recordMediaUpload(questionId: string, attachments: MediaAttachment[]): void {
    const log = this.logs.get(questionId);
    if (!log) return;

    const sanitized = attachments.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      durationSeconds: a.durationSeconds,
    }));
    log.finalValue.mediaAttachments = sanitized as any;
    log.isLeftBlank = attachments.length === 0 && !log.finalValue.textInput?.trim() && !log.finalValue.selectedOptions?.length;

    this.recordAction(questionId, 'media_upload', `count_${attachments.length}`);
  }

  /**
   * 结算单题停留耗时
   */
  finishQuestion(questionId: string): void {
    const log = this.logs.get(questionId);
    if (!log) return;
    // 幂等：已结算过的题目直接跳过，避免交卷时的批量结算重复累加时长。
    if (!this.openQuestionIds.has(questionId)) return;

    const now = Date.now();
    log.leaveTimestamp = now;
    log.durationMs = (log.durationMs || 0) + (now - log.enterTimestamp);
    log.actionLogs.push(`leave:${now}`);
    this.openQuestionIds.delete(questionId);

    if (this.currentActiveQuestionId === questionId) {
      this.currentActiveQuestionId = null;
    }
  }

  /**
   * 获取所有单题埋点日志列表
   */
  getAllLogs(): SingleQuestionLog[] {
    if (this.currentActiveQuestionId) {
      this.finishQuestion(this.currentActiveQuestionId);
    }
    return Array.from(this.logs.values());
  }

  /**
   * 清空埋点缓存
   */
  reset(): void {
    this.logs.clear();
    this.currentActiveQuestionId = null;
    this.openQuestionIds.clear();
  }
}

export const questionTelemetry = new QuestionTelemetryTracker();
