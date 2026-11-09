import React, { useState } from 'react';
import { QuestionDefinition, OptionDefinition, MediaAttachment } from '../types/quizEngine';
import { MediaUploader } from './MediaUploader';
import { Sparkles, Check } from 'lucide-react';

interface QuestionCardRendererProps {
  question: QuestionDefinition;
  selectedOptionIds: string[];
  textInput: string;
  mediaAttachments: MediaAttachment[];
  onOptionSelect: (optionIds: string[]) => void;
  onTextInputChange: (text: string) => void;
  onMediaChange: (attachments: MediaAttachment[]) => void;
}

export const QuestionCardRenderer: React.FC<QuestionCardRendererProps> = ({
  question,
  selectedOptionIds,
  textInput,
  mediaAttachments,
  onOptionSelect,
  onTextInputChange,
  onMediaChange,
}) => {
  const [sparkIndex, setSparkIndex] = useState(0);

  const handleSingleSelect = (optId: string) => {
    onOptionSelect([optId]);
  };

  const handleMultipleToggle = (optId: string) => {
    if (optId === '__none__') {
      if (selectedOptionIds.includes('__none__')) {
        onOptionSelect([]);
      } else {
        onOptionSelect(['__none__']);
      }
      return;
    }

    const baseSelected = selectedOptionIds.filter((id) => id !== '__none__');
    if (baseSelected.includes(optId)) {
      onOptionSelect(baseSelected.filter((id) => id !== optId));
    } else {
      if (!question.maxSelectCount || baseSelected.length < question.maxSelectCount) {
        onOptionSelect([...baseSelected, optId]);
      }
    }
  };

  const cycleSpark = () => {
    if (question.sparks && question.sparks.length > 0) {
      setSparkIndex((prev) => (prev + 1) % question.sparks!.length);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
      {/* 题目标题与情境 */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.45rem' }} className="text-gradient">
        {question.title}
      </h3>
      {question.scenario && (
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          {question.scenario}
        </p>
      )}

      {/* 1. 单选题 (Single Choice) */}
      {question.type === 'single_choice' && question.options && (() => {
        const isLikertScale = question.options.every(opt => opt.text.length <= 6);
        if (isLikertScale) {
          return (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 112, 166, 0.15)',
                borderRadius: 16,
                padding: '0.75rem 1.1rem 0.65rem',
                position: 'relative',
                backdropFilter: 'blur(12px)',
                boxSizing: 'border-box',
              }}
            >
              {/* 两极极向文本提示 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.65rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                <span style={{ color: selectedOptionIds.length > 0 && question.options[0] && selectedOptionIds.includes(question.options[0].id) ? '#ff70a6' : 'var(--text-muted)', transition: 'color 0.5s ease' }}>
                  ← {question.options[0]?.text || '不同意'}
                </span>
                <span style={{ color: selectedOptionIds.length > 0 && question.options[question.options.length - 1] && selectedOptionIds.includes(question.options[question.options.length - 1].id) ? '#ff70a6' : 'var(--text-muted)', transition: 'color 0.5s ease' }}>
                  {question.options[question.options.length - 1]?.text || '强烈同意'} →
                </span>
              </div>

              {/* 5 点能量极光连线轨道 (中轴 100% 精准对齐贯穿) */}
              <div style={{ position: 'relative', width: '100%' }}>
                {/* 1. 专属线轨 Row (固定 44px 高度，背景线条 100% 精准水平居中贯穿，提供移动端 44px 触控区) */}
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: 44,
                    width: '100%',
                  }}
                >
                  {/* 背景贯穿能量中轴线 (top: 50% 完美平分中轴) */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      left: '8px',
                      right: '8px',
                      height: '2px',
                      background: 'linear-gradient(90deg, rgba(255, 112, 166, 0.2) 0%, rgba(255, 112, 166, 0.6) 50%, rgba(255, 112, 166, 0.2) 100%)',
                      zIndex: 1,
                      pointerEvents: 'none',
                    }}
                  />

                  {question.options.map((opt: OptionDefinition) => {
                    const isSelected = selectedOptionIds.includes(opt.id);

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSingleSelect(opt.id)}
                        style={{
                          position: 'relative',
                          zIndex: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 44,
                          height: 44,
                          cursor: 'pointer',
                        }}
                      >
                        {/* 26x26 节点 (完美居中挂在贯穿线正中央，选中态具有极光涟漪光环) */}
                        <div
                          className={isSelected ? 'likert-node-selected' : ''}
                          style={{
                            width: isSelected ? 22 : 14,
                            height: isSelected ? 22 : 14,
                            borderRadius: '50%',
                            background: isSelected
                              ? 'linear-gradient(135deg, #ff3377 0%, #ff70a6 100%)'
                              : 'rgba(255, 255, 255, 0.05)',
                            border: isSelected ? '1.5px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.12)',
                            boxShadow: isSelected
                              ? '0 0 18px rgba(255, 112, 166, 0.75)'
                              : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <Sparkles size={13} color="#ffffff" className="animate-fade-in" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. 节点下方选项文字 Row (平齐排列在 Slot 正下方) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.45rem',
                    padding: '0 0.2rem',
                  }}
                >
                  {question.options.map((opt: OptionDefinition) => {
                    const isSelected = selectedOptionIds.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSingleSelect(opt.id)}
                        style={{
                          cursor: 'pointer',
                          flex: 1,
                          textAlign: 'center',
                          userSelect: 'none',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#ff70a6' : 'var(--text-muted)',
                            transition: 'color 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {opt.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {question.options.map((opt: OptionDefinition) => {
                const isSelected = selectedOptionIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSingleSelect(opt.id)}
                    className={`choice-card ${isSelected ? 'selected' : ''}`}
                    style={{
                      textAlign: 'left',
                      width: '100%',
                      outline: 'none',
                    }}
                  >
                    <span>{opt.text}</span>
                    {isSelected && <Check size={16} strokeWidth={2.5} color="#ff3377" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          );
        }
      })()}

      {/* 2. 多选题 (Multiple Choice) - 胶囊标签多选样式 */}
      {question.type === 'multiple_choice' && question.options && (
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            * 可多选{question.maxSelectCount ? `（最多可选 ${question.maxSelectCount} 项）` : ''} · 若均不涉及可选择“都不符合”
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
            {question.options.map((opt: OptionDefinition) => {
              const isSelected = selectedOptionIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleMultipleToggle(opt.id)}
                  style={{
                    background: isSelected ? 'rgba(225, 0, 255, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1.5px solid ${isSelected ? '#e100ff' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: isSelected ? '#e100ff' : 'var(--text-secondary)',
                    padding: '0.68rem 1.2rem',
                    borderRadius: 20,
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {opt.text}
                </button>
              );
            })}

            {/* 都不符合 / 暂无此类倾向选项 */}
            <button
              type="button"
              onClick={() => handleMultipleToggle('__none__')}
              style={{
                background: selectedOptionIds.includes('__none__')
                  ? 'rgba(160, 160, 180, 0.25)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: `1.5px dashed ${selectedOptionIds.includes('__none__') ? '#a0a0b8' : 'rgba(255, 255, 255, 0.15)'}`,
                color: selectedOptionIds.includes('__none__') ? '#ffffff' : 'var(--text-muted)',
                padding: '0.68rem 1.2rem',
                borderRadius: 20,
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              <span>都不符合 / 暂无此类倾向</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. 开放手填 (Open Text) - 带预设 Spark 换一换灵感 */}
      {question.type === 'open_text' && (
        <div>
          {question.sparks && question.sparks.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>灵感预设启发（可留白或自由手填）：</span>
              <button
                type="button"
                onClick={cycleSpark}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ff70a6',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={13} />
                换一换灵感
              </button>
            </div>
          )}

          <textarea
            value={textInput}
            onChange={(e) => onTextInputChange(e.target.value)}
            placeholder={
              question.sparks && question.sparks.length > 0
                ? question.sparks[sparkIndex]
                : question.placeholder || '留白画布等待倾诉...（完全开放手填）'
            }
            style={{
              width: '100%',
              minHeight: 120,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 14,
              padding: '0.85rem 1rem',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none',
              resize: 'vertical',
              overflowY: 'auto',
              boxSizing: 'border-box',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          />

          {/* 开放题可选多媒体意象或录音附件 */}
          {question.mediaConfig && (
            <div style={{ marginTop: '0.85rem' }}>
              <MediaUploader
                config={question.mediaConfig}
                attachments={mediaAttachments}
                onChange={onMediaChange}
              />
            </div>
          )}
        </div>
      )}

      {/* 4. 多媒体上传题 (Media Upload) */}
      {question.type === 'media_upload' && question.mediaConfig && (
        <MediaUploader
          config={question.mediaConfig}
          attachments={mediaAttachments}
          onChange={onMediaChange}
        />
      )}
    </div>
  );
};
