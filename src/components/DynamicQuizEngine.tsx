import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QuestionBankDefinition, QuestionDefinition, MediaAttachment, DynamicQuizPayload } from '../types/quizEngine';
import { QuestionCardRenderer } from './QuestionCardRenderer';
import { questionTelemetry } from '../utils/questionTelemetryTracker';
import { telemetryTracker } from '../utils/telemetryTracker';
import { aggregateScores } from '../utils/scoreAggregator';
import { Sparkles, CheckCircle2, ArrowLeft, ShieldCheck, Home } from 'lucide-react';

interface DynamicQuizEngineProps {
  selectedBanks: QuestionBankDefinition[];
  onBackToBankSelect: () => void;
  onBackToHome?: () => void;
  onComplete: (payload: DynamicQuizPayload) => void;
}

export const DynamicQuizEngine: React.FC<DynamicQuizEngineProps> = ({
  selectedBanks,
  onBackToBankSelect,
  onBackToHome,
  onComplete,
}) => {
  // 全量扁平题目队列（useMemo：避免每次渲染生成新数组，防止 startQuestion effect 反复触发）
  const allQuestions = useMemo(
    () => selectedBanks.flatMap((b) => b.questions),
    [selectedBanks]
  );

  // 用户回答状态缓存
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string[]>>({});
  const [textInputMap, setTextInputMap] = useState<Record<string, string>>({});
  const [mediaMap, setMediaMap] = useState<Record<string, MediaAttachment[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [unansweredNotice, setUnansweredNotice] = useState<string | null>(null);

  const startTimeRef = useRef<number>(Date.now());

  // 行为遥测：按输入前后长度差估算击键/退格次数，供后端脱敏聚合（犹豫度/修改率）
  const trackTextKeystrokes = (fieldId: string, label: string, prev: string, next: string) => {
    telemetryTracker.setActiveField(fieldId, label);
    const deleted = Math.max(0, prev.length - next.length);
    const added = Math.max(0, next.length - prev.length);
    for (let i = 0; i < deleted; i++) {
      telemetryTracker.recordKeystroke('Backspace', fieldId, label);
    }
    for (let i = 0; i < added; i++) {
      telemetryTracker.recordKeystroke('input', fieldId, label);
    }
  };

  // 初始化第一道题遥测：每次题库会话开始时先清空上一轮残留日志
  useEffect(() => {
    questionTelemetry.reset();
    if (allQuestions.length > 0) {
      questionTelemetry.startQuestion(allQuestions[0].id, allQuestions[0].bankId);
    }
  }, [allQuestions]);

  const handleOptionSelect = (qId: string, bankId: string, optionIds: string[]) => {
    questionTelemetry.startQuestion(qId, bankId);
    const qTitle = allQuestions.find((qq) => qq.id === qId)?.title || qId;
    telemetryTracker.recordOptionChange(
      `question_${qTitle}`,
      (selectedOptionsMap[qId] || []).join(','),
      optionIds.join(',')
    );
    setSelectedOptionsMap((prev) => ({ ...prev, [qId]: optionIds }));
    questionTelemetry.recordOptionSelect(qId, optionIds);
    questionTelemetry.finishQuestion(qId);
  };

  const handleTextInputChange = (qId: string, bankId: string, text: string) => {
    questionTelemetry.startQuestion(qId, bankId);
    const qTitle = allQuestions.find((qq) => qq.id === qId)?.title || qId;
    trackTextKeystrokes(`question_${qId}`, qTitle, textInputMap[qId] || '', text);
    setTextInputMap((prev) => ({ ...prev, [qId]: text }));
    questionTelemetry.recordTextInput(qId, text);
  };

  const handleMediaChange = (qId: string, bankId: string, attachments: MediaAttachment[]) => {
    questionTelemetry.startQuestion(qId, bankId);
    setMediaMap((prev) => ({ ...prev, [qId]: attachments }));
    questionTelemetry.recordMediaUpload(qId, attachments);
  };

  const isQuestionAnswered = (question: QuestionDefinition): boolean => {
    if (question.type === 'open_text') {
      const hasText = Boolean((textInputMap[question.id] || '').trim());
      const hasMedia = Boolean((mediaMap[question.id] || []).length);
      return hasText || hasMedia;
    }
    if (question.type === 'media_upload') {
      return Boolean((mediaMap[question.id] || []).length);
    }
    return Boolean((selectedOptionsMap[question.id] || []).length);
  };

  const handleSubmitAll = () => {
    if (submitting) return;

    // 必填项校验：确保所有题目都已作答
    const unansweredQuestions = allQuestions.filter((question) => !isQuestionAnswered(question));

    if (unansweredQuestions.length > 0) {
      setUnansweredNotice(`您还有 ${unansweredQuestions.length} 道题目未作答。为了保证分析精度，请全部完成后再提交。`);

      // 平滑滚动定位到第一道未作答的题目
      const firstUnansweredId = unansweredQuestions[0].id;
      const element = document.getElementById(`q_${firstUnansweredId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);

    allQuestions.forEach((q) => questionTelemetry.finishQuestion(q.id));
    const logs = questionTelemetry.getAllLogs();
    const { normalizedScores, collectedTags } = aggregateScores(selectedBanks, logs);

    const totalDurationSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

    const payload: DynamicQuizPayload = {
      selectedBankIds: selectedBanks.map((b) => b.id),
      completedBanks: selectedBanks,
      aggregatedScores: normalizedScores,
      collectedTags,
      questionLogs: logs,
      userTextAnswers: textInputMap,
      userMediaAttachments: mediaMap,
      totalDurationSeconds,
    };

    onComplete(payload);
  };

  // 统计已回答题数
  const answeredCount = allQuestions.filter((question) => isQuestionAnswered(question)).length;
  const progressPercent = Math.round((answeredCount / Math.max(1, allQuestions.length)) * 100);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 740,
        margin: '0 auto',
        padding: '1rem 0.85rem 4rem',
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box',
      }}
    >
      {unansweredNotice && (
        <div
          role="alert"
          style={{
            position: 'sticky',
            top: 12,
            zIndex: 45,
            marginBottom: '1rem',
            padding: '0.8rem 1rem',
            borderRadius: 16,
            background: 'rgba(251, 146, 60, 0.12)',
            border: '1px solid rgba(251, 146, 60, 0.45)',
            color: '#fed7aa',
            fontSize: '0.82rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.35)',
            boxSizing: 'border-box',
          }}
        >
          <span>{unansweredNotice}</span>
          <button
            type="button"
            onClick={() => setUnansweredNotice(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fb923c',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            知道了
          </button>
        </div>
      )}

      {/* 顶部固定常驻沉浸式进度栏 */}
      <div className="quiz-sticky-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={onBackToBankSelect}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
              className="hover:text-white"
            >
              <ArrowLeft size={14} />
              <span>返回选题</span>
            </button>
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
                className="hover:text-white"
              >
                <Home size={13} />
                <span>返回首页</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={14} color="#ff70a6" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
              已回答 {answeredCount} / {allQuestions.length} 题
            </span>
          </div>
        </div>

        {/* 极光发光进度条 */}
        <div
          style={{
            width: '100%',
            height: 5,
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #ff70a6, #e100ff)',
              borderRadius: 3,
              transition: 'width 0.35s ease',
              boxShadow: '0 0 10px rgba(255, 112, 166, 0.6)',
            }}
          />
        </div>
      </div>

      {/* 🚀 连续纵向流式答题表单 (高能紧凑，滑动极速，一屏可看多题) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }} className="animate-fade-in">
        {allQuestions.map((question: QuestionDefinition, idx: number) => {
          const isAnswered = isQuestionAnswered(question);

          return (
            <div
              key={question.id}
              id={`q_${question.id}`}
              className="glass-card"
              style={{
                padding: '1.05rem 1.15rem',
                borderRadius: 18,
                boxSizing: 'border-box',
                width: '100%',
                maxWidth: '100%',
                border: isAnswered
                  ? '1px solid rgba(255, 112, 166, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: isAnswered
                  ? 'rgba(255, 51, 119, 0.035)'
                  : 'rgba(255, 255, 255, 0.02)',
                transition: 'all 0.3s ease',
              }}
            >
              {/* 题号 Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.45rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.65rem',
                    borderRadius: 14,
                    background: isAnswered ? '#ff3377' : 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    whiteSpace: 'nowrap',
                  }}
                >
                  第 {idx + 1} 题
                </span>

                {isAnswered && (
                  <span style={{ fontSize: '0.75rem', color: '#ff70a6', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                    <CheckCircle2 size={13} />
                    已记录
                  </span>
                )}
              </div>

              {/* 单题渲染器 */}
              <QuestionCardRenderer
                question={question}
                selectedOptionIds={selectedOptionsMap[question.id] || []}
                textInput={textInputMap[question.id] || ''}
                mediaAttachments={mediaMap[question.id] || []}
                onOptionSelect={(opts) => handleOptionSelect(question.id, question.bankId, opts)}
                onTextInputChange={(txt) => handleTextInputChange(question.id, question.bankId, txt)}
                onMediaChange={(att) => handleMediaChange(question.id, question.bankId, att)}
              />
            </div>
          );
        })}
      </div>

      {/* 底部全量卷宗提交大按钮 */}
      <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={submitting}
          className="btn-glow"
          style={{
            width: '100%',
            maxWidth: 420,
            padding: '1.05rem 2rem',
            fontSize: '1.05rem',
            fontWeight: 800,
            borderRadius: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            boxShadow: '0 0 30px rgba(255, 51, 119, 0.5)',
          }}
        >
          <Sparkles size={20} />
          <span>{submitting ? '正在生成卷宗剖析中...' : `提交并生成解构卷宗 (${answeredCount}/${allQuestions.length})`}</span>
        </button>
      </div>
    </div>
  );
};
