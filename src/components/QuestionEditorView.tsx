import React, { useMemo, useState } from 'react';
import type { QuestionDefinition, QuestionType } from '../types/quizEngine';
import { QuestionCardRenderer } from './QuestionCardRenderer';
import { ChevronUp, ChevronDown, Plus, Trash2, Save, X, Eye } from 'lucide-react';

interface QuestionEditorViewProps {
  bankId: string;
  initialQuestion?: QuestionDefinition;
  onSave: (q: QuestionDefinition) => void;
  onCancel: () => void;
}

const QUESTION_TYPE_LABELS: Record<Exclude<QuestionType, 'media_upload'>, string> = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  open_text: '文本框',
};

const ALLOWED_TYPES: Exclude<QuestionType, 'media_upload'>[] = ['single_choice', 'multiple_choice', 'open_text'];

function genQuestionId(bankId: string) {
  return `${bankId}_q_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`;
}

function genOptionId() {
  return `opt_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`;
}

function createEmptyQuestion(bankId: string, type: Exclude<QuestionType, 'media_upload'>): QuestionDefinition {
  const base: QuestionDefinition = {
    id: genQuestionId(bankId),
    bankId,
    title: '',
    type,
    isRequired: false,
  };
  if (type === 'single_choice' || type === 'multiple_choice') {
    base.options = [
      { id: genOptionId(), text: '' },
      { id: genOptionId(), text: '' },
    ];
    if (type === 'multiple_choice') {
      base.maxSelectCount = 2;
    }
  } else if (type === 'open_text') {
    base.placeholder = '请在此处输入你的回答...';
  }
  return base;
}

export const QuestionEditorView: React.FC<QuestionEditorViewProps> = ({
  bankId,
  initialQuestion,
  onSave,
  onCancel,
}) => {
  const [question, setQuestion] = useState<QuestionDefinition>(
    () => initialQuestion ?? createEmptyQuestion(bankId, 'single_choice')
  );
  const [showPreview, setShowPreview] = useState(false);
  const [previewSelected, setPreviewSelected] = useState<string[]>([]);
  const [previewText, setPreviewText] = useState('');
  const [saved, setSaved] = useState(false);

  // 类型切换时重置字段（清掉不适用的字段）
  const handleTypeChange = (newType: Exclude<QuestionType, 'media_upload'>) => {
    if (newType === question.type) return;
    setQuestion((prev) => {
      const next: QuestionDefinition = {
        ...prev,
        type: newType,
      };
      if (newType === 'single_choice' || newType === 'multiple_choice') {
        if (!prev.options || prev.options.length < 2) {
          next.options = [
            { id: genOptionId(), text: '' },
            { id: genOptionId(), text: '' },
          ];
        }
        if (newType === 'multiple_choice' && !prev.maxSelectCount) {
          next.maxSelectCount = 2;
        }
        if (newType === 'single_choice') {
          delete next.maxSelectCount;
        }
      } else {
        // open_text — 删除选项相关字段
        delete next.options;
        delete next.maxSelectCount;
        if (!next.placeholder) next.placeholder = '请在此处输入你的回答...';
      }
      return next;
    });
    setPreviewSelected([]);
    setPreviewText('');
  };

  const handleAddOption = () => {
    setQuestion((prev) => {
      if (prev.type !== 'single_choice' && prev.type !== 'multiple_choice') return prev;
      const options = prev.options ? [...prev.options] : [];
      options.push({ id: genOptionId(), text: '' });
      return { ...prev, options };
    });
  };

  const handleRemoveOption = (optId: string) => {
    setQuestion((prev) => {
      if (prev.type !== 'single_choice' && prev.type !== 'multiple_choice') return prev;
      const options = (prev.options ?? []).filter((o) => o.id !== optId);
      // 至少保留 2 个选项
      if (options.length < 2) return prev;
      return { ...prev, options };
    });
  };

  const handleOptionChange = (optId: string, field: 'text' | 'subtext', value: string) => {
    setQuestion((prev) => {
      if (!prev.options) return prev;
      const options = prev.options.map((o) => (o.id === optId ? { ...o, [field]: value } : o));
      return { ...prev, options };
    });
  };

  const handleMoveOption = (optId: string, direction: -1 | 1) => {
    setQuestion((prev) => {
      if (!prev.options) return prev;
      const options = [...prev.options];
      const idx = options.findIndex((o) => o.id === optId);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= options.length) return prev;
      [options[idx], options[newIdx]] = [options[newIdx], options[idx]];
      return { ...prev, options };
    });
  };

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSave = () => {
    setValidationError(null);
    // 简单校验
    if (!question.title.trim()) {
      setValidationError('请填写题目标题');
      return;
    }
    if ((question.type === 'single_choice' || question.type === 'multiple_choice')) {
      const validOptions = (question.options ?? []).filter((o) => o.text.trim());
      if (validOptions.length < 2) {
        setValidationError('单选/多选题至少需要 2 个有效选项（含文本）');
        return;
      }
    }
    onSave(question);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const isChoice = question.type === 'single_choice' || question.type === 'multiple_choice';

  // 预览用的题目（标题/选项文本为空时填充占位符，避免渲染异常）
  const previewQuestion = useMemo<QuestionDefinition>(() => ({
    ...question,
    title: question.title || '（未填写标题）',
    options: (question.options ?? []).map((o) => ({ ...o, text: o.text || '（未填写选项文本）' })),
  }), [question]);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.9rem',
          }}
        >
          <X size={16} /> 取消
        </button>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }} className="text-gradient">题目编辑器</h2>
        <button
          onClick={handleSave}
          style={{
            background: saved ? 'rgba(34, 197, 94, 0.15)' : 'linear-gradient(135deg, #ff70a6, #e100ff)',
            border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
          }}
        >
          <Save size={14} /> {saved ? '已保存' : '保存'}
        </button>
      </div>

      {validationError && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.65rem 1rem',
          borderRadius: 12,
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span>⚠️</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* 题目类型切换 */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          题目类型
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {ALLOWED_TYPES.map((t) => {
            const active = question.type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.5rem',
                  borderRadius: 12,
                  border: `1.5px solid ${active ? '#ff70a6' : 'rgba(255,255,255,0.1)'}`,
                  background: active ? 'rgba(255, 112, 166, 0.12)' : 'rgba(255,255,255,0.03)',
                  color: active ? '#ff70a6' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                }}
              >
                {QUESTION_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 题目标题 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          题目标题 <span style={{ color: '#ff70a6' }}>*</span>
        </label>
        <input
          type="text"
          value={question.title}
          onChange={(e) => setQuestion({ ...question, title: e.target.value })}
          placeholder="如：在一个安静的空间里，你更倾向于..."
          style={inputStyle}
        />
      </div>

      {/* 场景描述 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          场景描述（可选）
        </label>
        <textarea
          value={question.scenario ?? ''}
          onChange={(e) => setQuestion({ ...question, scenario: e.target.value })}
          placeholder="可选的背景设定/情境描述..."
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
        />
      </div>

      {/* 必答开关 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.86rem' }}>
          <input
            type="checkbox"
            checked={!!question.isRequired}
            onChange={(e) => setQuestion({ ...question, isRequired: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: '#ff70a6' }}
          />
          <span>必答题（不勾选则允许留白）</span>
        </label>
      </div>

      {/* 选项编辑器（单选/多选） */}
      {isChoice && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              选项列表 <span style={{ color: '#ff70a6' }}>*</span>
            </label>
            <button
              type="button"
              onClick={handleAddOption}
              style={{
                background: 'transparent', border: '1px dashed rgba(255, 112, 166, 0.4)',
                color: '#ff70a6', padding: '0.35rem 0.7rem', borderRadius: 8, fontSize: '0.78rem',
                display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer',
              }}
            >
              <Plus size={12} /> 添加选项
            </button>
          </div>

          {question.type === 'multiple_choice' && (
            <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              最多可选：
              <input
                type="number"
                min={2}
                max={(question.options ?? []).length}
                value={question.maxSelectCount ?? 2}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 2) setQuestion({ ...question, maxSelectCount: v });
                }}
                style={{
                  width: 60, marginLeft: '0.5rem', padding: '0.25rem 0.5rem',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.8rem',
                }}
              />
              项
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {(question.options ?? []).map((opt, idx, arr) => (
              <div
                key={opt.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '0.75rem 0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(255, 112, 166, 0.15)', color: '#ff70a6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700,
                  }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionChange(opt.id, 'text', e.target.value)}
                    placeholder={`选项 ${idx + 1} 文本`}
                    style={{ flex: 1, ...inputStyle, marginBottom: 0 }}
                  />
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button
                      type="button"
                      onClick={() => handleMoveOption(opt.id, -1)}
                      disabled={idx === 0}
                      style={iconBtnStyle(idx === 0)}
                      title="上移"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveOption(opt.id, 1)}
                      disabled={idx === arr.length - 1}
                      style={iconBtnStyle(idx === arr.length - 1)}
                      title="下移"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(opt.id)}
                      disabled={arr.length <= 2}
                      style={iconBtnStyle(arr.length <= 2, '#ef4444')}
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={opt.subtext ?? ''}
                  onChange={(e) => handleOptionChange(opt.id, 'subtext', e.target.value)}
                  placeholder="副文本（可选，如解释/引导语）"
                  style={{ ...inputStyle, marginBottom: 0, fontSize: '0.8rem', opacity: 0.85 }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 文本框配置 */}
      {question.type === 'open_text' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              占位语（可选）
            </label>
            <input
              type="text"
              value={question.placeholder ?? ''}
              onChange={(e) => setQuestion({ ...question, placeholder: e.target.value })}
              placeholder="留白画布等待倾诉..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              灵感预设词（可选，每行一个，答题端可点击"换一换"切换）
            </label>
            <textarea
              value={(question.sparks ?? []).join('\n')}
              onChange={(e) => setQuestion({ ...question, sparks: e.target.value.split('\n').filter((s) => s.trim()) })}
              placeholder={'如：\n一段难忘的对话\n一个反复出现的画面\n一个最深处的渴望'}
              style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
            />
          </div>
        </div>
      )}

      {/* 实时预览切换 */}
      <div style={{ marginTop: '2rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          style={{
            background: 'transparent', border: 'none', color: '#ff70a6',
            display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: 600,
          }}
        >
          <Eye size={14} /> {showPreview ? '隐藏预览' : '显示实时预览'}
        </button>

        {showPreview && (
          <div
            style={{
              marginTop: '0.85rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              预览效果（与答题端一致）：
            </div>
            <QuestionCardRenderer
              question={previewQuestion}
              selectedOptionIds={previewSelected}
              textInput={previewText}
              mediaAttachments={[]}
              onOptionSelect={setPreviewSelected}
              onTextInputChange={setPreviewText}
              onMediaChange={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: 'var(--text-primary)',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

function iconBtnStyle(disabled: boolean, color = 'var(--text-secondary)'): React.CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    color: disabled ? 'rgba(255,255,255,0.15)' : color,
    padding: '0.3rem',
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}
