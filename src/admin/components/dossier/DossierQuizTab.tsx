import React from 'react';
import { Check } from 'lucide-react';
import { DossierMediaAttachments } from './DossierMediaAttachments';

interface DossierQuizTabProps {
  completedBanks: any[];
  questionLogs: any[];
  userTextAnswers: Record<string, string>;
  userMediaAttachments: Record<string, any[]>;
  allMediaEntries: any[];
  totalQuestionsCount: number;
  onZoomImage?: (url: string) => void;
}

export const DossierQuizTab: React.FC<DossierQuizTabProps> = ({
  completedBanks,
  questionLogs,
  userTextAnswers,
  userMediaAttachments,
  allMediaEntries,
  totalQuestionsCount,
  onZoomImage,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#80f3ff', margin: 0, fontWeight: 700 }}>
          📝 用户作答全部题目与选中明细卷宗
        </h3>
        <span style={{ fontSize: '0.75rem', color: '#8d879e' }}>
          共 {totalQuestionsCount} 道题目记录
        </span>
      </div>

      {/* 问卷所有媒体上传题汇总展播区 */}
      {allMediaEntries.length > 0 && (
        <div
          style={{
            background: 'rgba(128, 243, 255, 0.04)',
            border: '1px solid rgba(128, 243, 255, 0.25)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', color: '#80f3ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎬 问卷媒体上传题成果汇总 ({allMediaEntries.length} 件)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#8d879e' }}>
              涵盖视频 / 录音 / 照片等作答凭证
            </span>
          </div>
          <DossierMediaAttachments attachments={allMediaEntries} title="全卷媒体成果汇总" onZoomImage={onZoomImage} />
        </div>
      )}

      {/* 题库完整题目与选项渲染 */}
      {completedBanks.length > 0 ? (
        completedBanks.map((bank: any, bIdx: number) => (
          <div key={bank.id || bIdx} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                background: 'rgba(255, 51, 119, 0.08)',
                border: '1px solid rgba(255, 51, 119, 0.2)',
                borderRadius: '10px',
                padding: '0.8rem 1rem',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#ff70a6', fontWeight: 700 }}>
                【题库 #{bIdx + 1}】 {bank.name || '标准倾向测试题库'}
              </span>
              {bank.description && (
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#8d879e' }}>
                  {bank.description}
                </p>
              )}
            </div>

            {/* 题目列表 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {(bank.questions || []).map((q: any, qIdx: number) => {
                const log = questionLogs.find((l: any) => l.questionId === q.id) || {};
                const userSelectedIds = log.finalValue?.selectedOptions || [];
                const textAnswer = userTextAnswers[q.id] || log.finalValue?.textInput;
                const questionMedia = userMediaAttachments[q.id] || log.finalValue?.attachments || [];

                return (
                  <div
                    key={q.id || qIdx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}
                  >
                    {/* 题干 */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.8rem' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#80f3ff', fontWeight: 700, marginRight: '0.4rem' }}>
                          第 {qIdx + 1} 题
                        </span>
                        <span style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
                          {q.title}
                        </span>
                      </div>
                      {log.durationMs !== undefined && (
                        <span style={{ fontSize: '0.68rem', color: '#6e677c', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          ⏱️ {(log.durationMs / 1000).toFixed(1)}s · {log.interactionCount || 1}次操作
                        </span>
                      )}
                    </div>

                    {/* 情境描述 */}
                    {q.scenario && (
                      <p style={{ fontSize: '0.75rem', color: '#8d879e', margin: 0, fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: 6 }}>
                        "{q.scenario}"
                      </p>
                    )}

                    {/* 选项列表 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                      {(q.options || []).map((opt: any, oIdx: number) => {
                        const isSelected = userSelectedIds.includes(opt.id) || userSelectedIds.includes(opt.text);
                        return (
                          <div
                            key={opt.id || oIdx}
                            style={{
                              padding: '0.55rem 0.8rem',
                              borderRadius: '8px',
                              background: isSelected ? 'rgba(255, 51, 119, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                              border: isSelected ? '1px solid #ff70a6' : '1px solid rgba(255, 255, 255, 0.04)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.6rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: '50%',
                                  background: isSelected ? '#ff3377' : 'rgba(255,255,255,0.05)',
                                  border: isSelected ? '1px solid #ff70a6' : '1px solid rgba(255,255,255,0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#fff',
                                  fontSize: '0.65rem',
                                  flexShrink: 0,
                                }}
                              >
                                {isSelected ? <Check size={11} /> : String.fromCharCode(65 + oIdx)}
                              </div>
                              <span style={{ fontSize: '0.78rem', color: isSelected ? '#fff' : '#8d879e', fontWeight: isSelected ? 600 : 400 }}>
                                {opt.text}
                              </span>
                            </div>

                            {isSelected && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  color: '#ff70a6',
                                  background: 'rgba(255, 51, 119, 0.2)',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                已选答案
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 用户手填文本 */}
                    {textAnswer && (
                      <div
                        style={{
                          background: 'rgba(128, 243, 255, 0.06)',
                          border: '1px solid rgba(128, 243, 255, 0.2)',
                          borderRadius: '8px',
                          padding: '0.6rem 0.8rem',
                          marginTop: '0.2rem',
                        }}
                      >
                        <span style={{ fontSize: '0.68rem', color: '#80f3ff', fontWeight: 700, display: 'block', marginBottom: 2 }}>
                          ✍️ 被测者手填自白文本:
                        </span>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#fff', wordBreak: 'break-word' }}>
                          {textAnswer}
                        </p>
                      </div>
                    )}

                    {/* 用户上传媒体附件 */}
                    {questionMedia && questionMedia.length > 0 && (
                      <DossierMediaAttachments attachments={questionMedia} title="本题上传成果" onZoomImage={onZoomImage} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        /* 降级展示单题日志 */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {questionLogs.map((log: any, idx: number) => (
            <div
              key={log.questionId || idx}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '0.8rem 1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <strong style={{ color: '#80f3ff', fontSize: '0.8rem' }}>题目编号: {log.questionId}</strong>
                <span style={{ fontSize: '0.68rem', color: '#6e677c' }}>⏱️ {(log.durationMs / 1000).toFixed(1)}s</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#fff' }}>
                已选选项 ID: <span style={{ color: '#ff70a6', fontWeight: 600 }}>{(log.finalValue?.selectedOptions || []).join(', ') || '无'}</span>
              </div>
              {log.finalValue?.textInput && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#ffd180' }}>
                  手填文本: {log.finalValue.textInput}
                </div>
              )}
              {log.finalValue?.attachments && (
                <DossierMediaAttachments attachments={log.finalValue.attachments} title="本题上传成果" onZoomImage={onZoomImage} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

