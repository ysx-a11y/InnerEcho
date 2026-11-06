import React, { useEffect, useState } from 'react';
import type { QuestionDefinition, QuestionType } from '../types/quizEngine';
import {
  fetchUserBankById,
  createUserBank,
  updateUserBank,
  deleteUserBank,
} from '../utils/userBanks';
import { QuestionEditorView } from './QuestionEditorView';
import {
  ChevronUp, ChevronDown, Plus, Trash2, Save, ArrowLeft, Edit3, Send, Loader2, FileText,
} from 'lucide-react';

interface BankEditorViewProps {
  bankId: string | null; // null = 新建模式
  onUnauthorized: () => void;
  onBack: () => void;
  onBankMutated?: () => void; // 创建/更新/删除后的回调（让上层刷新列表）
}

const DRAFT_KEY_PREFIX = 'innerecho:bank_draft:';

export const BankEditorView: React.FC<BankEditorViewProps> = ({
  bankId,
  onUnauthorized,
  onBack,
  onBankMutated,
}) => {
  const isNew = !bankId;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 题库元数据
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'scientific' | 'direct' | 'scenario' | 'preference'>('direct');
  const [badgeColor, setBadgeColor] = useState('#9333ea');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>('');

  // 题目列表
  const [questions, setQuestions] = useState<QuestionDefinition[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [auditStatus, setAuditStatus] = useState<'draft' | 'pending' | 'approved' | 'rejected'>('draft');

  // 编辑中的题目
  const [editingQuestion, setEditingQuestion] = useState<{ question?: QuestionDefinition; index: number } | null>(null);

  // 删除二次确认
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ===== 数据加载 =====
  useEffect(() => {
    if (isNew) {
      // 新建模式：尝试恢复 localStorage 草稿
      const draft = loadDraft(null);
      if (draft) {
        setTitle(draft.title ?? '');
        setSubtitle(draft.subtitle ?? '');
        setDescription(draft.description ?? '');
        setCategory(draft.category ?? 'direct');
        setBadgeColor(draft.badgeColor ?? '#9333ea');
        setEstimatedMinutes(draft.estimatedMinutes ?? '');
        setQuestions(draft.questions ?? []);
      }
      return;
    }
    // 编辑模式：从后端拉取
    setLoading(true);
    fetchUserBankById(bankId!, onUnauthorized)
      .then((bank) => {
        if (!bank) {
          setError('题库不存在或无权访问');
          return;
        }
        setTitle(bank.title);
        setSubtitle(bank.subtitle);
        setDescription(bank.description);
        setCategory(bank.category);
        setBadgeColor(bank.badgeColor ?? '#9333ea');
        setEstimatedMinutes(bank.estimatedMinutes ?? '');
        setQuestions(bank.questions ?? []);
        setIsPublished(bank.isPublished);
        setAuditStatus(bank.auditStatus);
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载题库失败'))
      .finally(() => setLoading(false));
  }, [bankId, isNew, onUnauthorized]);

  // ===== 草稿自动保存（仅新建模式 + 编辑中题目未打开时） =====
  useEffect(() => {
    if (isNew && !editingQuestion) {
      saveDraft(null, {
        title, subtitle, description, category, badgeColor,
        estimatedMinutes: typeof estimatedMinutes === 'number' ? estimatedMinutes : null,
        questions,
      });
    }
  }, [title, subtitle, description, category, badgeColor, estimatedMinutes, questions, isNew, editingQuestion]);

  // ===== 操作处理 =====
  const buildPayload = () => ({
    title: title.trim(),
    subtitle: subtitle.trim(),
    description: description.trim(),
    category,
    badgeColor,
    estimatedMinutes: typeof estimatedMinutes === 'number' ? estimatedMinutes : undefined,
    questions,
  });

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError('请先填写题库名称');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await createUserBank({ ...buildPayload(), isPublished: false }, onUnauthorized);
        clearDraft(null);
        onBankMutated?.();
        onBack();
      } else {
        const res = await updateUserBank(bankId!, { ...buildPayload(), isPublished }, onUnauthorized);
        setIsPublished(res.isPublished);
        setAuditStatus(res.auditStatus);
        setNotice('草稿已保存');
        onBankMutated?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      setError('请先填写题库名称');
      return;
    }
    if (questions.length === 0) {
      setError('请至少添加 1 道题目再发布');
      return;
    }
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      if (isNew) {
        await createUserBank({ ...buildPayload(), isPublished: true }, onUnauthorized);
        clearDraft(null);
        onBankMutated?.();
        onBack();
      } else {
        const res = await updateUserBank(bankId!, { ...buildPayload(), isPublished: true }, onUnauthorized);
        setIsPublished(res.isPublished);
        setAuditStatus(res.auditStatus);
        setNotice('已提交审核，审核通过后才会对其他人公开');
        onBankMutated?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (isNew) {
      clearDraft(null);
      onBack();
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    try {
      await deleteUserBank(bankId!, onUnauthorized);
      onBankMutated?.();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  // ===== 题目操作 =====
  const handleAddQuestion = () => {
    setEditingQuestion({ index: -1 }); // -1 表示新增
  };

  const handleEditQuestion = (q: QuestionDefinition, index: number) => {
    setEditingQuestion({ question: q, index });
  };

  const handleSaveQuestion = (q: QuestionDefinition) => {
    setQuestions((prev) => {
      if (editingQuestion?.index === -1) {
        return [...prev, q];
      }
      const next = [...prev];
      next[editingQuestion!.index] = q;
      return next;
    });
    setEditingQuestion(null);
  };

  const handleMoveQuestion = (index: number, direction: -1 | 1) => {
    setQuestions((prev) => {
      const next = [...prev];
      const newIdx = index + direction;
      if (newIdx < 0 || newIdx >= next.length) return prev;
      [next[index], next[newIdx]] = [next[newIdx], next[index]];
      return next;
    });
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // ===== 渲染 =====
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: '#ff70a6' }} />
      </div>
    );
  }

  // 题目编辑器全屏覆盖
  if (editingQuestion) {
    return (
      <QuestionEditorView
        bankId={bankId ?? 'draft'}
        initialQuestion={editingQuestion.question}
        onSave={handleSaveQuestion}
        onCancel={() => setEditingQuestion(null)}
      />
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.9rem',
          }}
        >
          <ArrowLeft size={16} /> 返回
        </button>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }} className="text-gradient">
          {isNew ? '创建题库' : '编辑题库'}
        </h2>
        <div style={{ width: 60 }} />
      </div>

      {/* 状态徽章 */}
      {!isNew && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <span style={{
            padding: '0.25rem 0.7rem', borderRadius: 12, fontSize: '0.74rem', fontWeight: 600,
            background: auditStatus === 'approved'
              ? 'rgba(34, 197, 94, 0.15)'
              : auditStatus === 'pending'
                ? 'rgba(124, 140, 255, 0.15)'
                : auditStatus === 'rejected'
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(245, 158, 11, 0.15)',
            color: auditStatus === 'approved'
              ? '#22c55e'
              : auditStatus === 'pending'
                ? '#7c8cff'
                : auditStatus === 'rejected'
                  ? '#e58a90'
                  : '#f59e0b',
          }}>
            {auditStatus === 'approved'
              ? '● 已通过 · 已公开'
              : auditStatus === 'pending'
                ? '● 审核中'
                : auditStatus === 'rejected'
                  ? '● 未通过 · 仅自己可见'
                  : '● 草稿 · 仅自己可见'}
          </span>
          <span style={{
            padding: '0.25rem 0.7rem', borderRadius: 12, fontSize: '0.74rem', fontWeight: 600,
            background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',
          }}>
            {questions.length} 题
          </span>
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.7rem 0.9rem', marginBottom: '1rem', borderRadius: 10,
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444', fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      {notice && (
        <div style={{
          padding: '0.7rem 0.9rem', marginBottom: '1rem', borderRadius: 10,
          background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#22c55e', fontSize: '0.85rem',
        }}>
          {notice}
        </div>
      )}

      {/* 题库元数据 */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>题库名称 <span style={{ color: '#ff70a6' }}>*</span></label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="如：我的探索问卷"
          maxLength={80}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>副标题（可选）</label>
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="一句话描述题库定位"
          maxLength={120}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>详细描述（可选）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="题库的背景、目的、设计思路..."
          maxLength={500}
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>分类</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as 'scientific' | 'direct' | 'scenario' | 'preference')}
            style={inputStyle}
          >
            <option value="direct">直球风格</option>
            <option value="scientific">科学量表</option>
            <option value="preference">权责谱系</option>
            <option value="scenario">情境沉浸</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>标签颜色</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="color"
              value={badgeColor}
              onChange={(e) => setBadgeColor(e.target.value)}
              style={{ width: 40, height: 40, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={badgeColor}
              onChange={(e) => setBadgeColor(e.target.value)}
              maxLength={20}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={labelStyle}>预计作答分钟数（可选）</label>
        <input
          type="number"
          min={1}
          max={180}
          value={estimatedMinutes}
          onChange={(e) => {
            const v = e.target.value;
            setEstimatedMinutes(v === '' ? '' : parseInt(v, 10));
          }}
          placeholder="如 5"
          style={{ ...inputStyle, width: 120 }}
        />
      </div>

      {/* 题目列表 */}
      <div style={{
        borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1.25rem', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            题目列表 ({questions.length})
          </h3>
          <button
            type="button"
            onClick={handleAddQuestion}
            style={{
              background: 'linear-gradient(135deg, #ff70a6, #e100ff)',
              border: 'none', color: '#fff', padding: '0.5rem 0.95rem', borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer',
              fontSize: '0.84rem', fontWeight: 600,
            }}
          >
            <Plus size={14} /> 添加题目
          </button>
        </div>

        {questions.length === 0 ? (
          <div style={{
            padding: '2rem 1rem', textAlign: 'center',
            background: 'rgba(255,255,255,0.02)', borderRadius: 14,
            border: '1px dashed rgba(255,255,255,0.1)',
            color: 'var(--text-muted)', fontSize: '0.86rem',
          }}>
            <FileText size={28} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
            <div>暂无题目，点击"添加题目"开始创建</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {questions.map((q, idx, arr) => (
              <div
                key={q.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '0.85rem 1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(255, 112, 166, 0.15)', color: '#ff70a6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.78rem', fontWeight: 700, marginTop: 2,
                  }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem',
                      flexWrap: 'wrap',
                    }}>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                        background: typeColor(q.type).bg, color: typeColor(q.type).fg,
                      }}>
                        {typeLabel(q.type)}
                      </span>
                      {q.isRequired && (
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                          background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
                        }}>
                          必答
                        </span>
                      )}
                      {q.type === 'multiple_choice' && q.maxSelectCount && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          最多选 {q.maxSelectCount}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)',
                      marginBottom: '0.2rem', wordBreak: 'break-word',
                    }}>
                      {q.title || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>（未填写标题）</span>}
                    </div>
                    {q.options && q.options.length > 0 && (
                      <div style={{
                        fontSize: '0.78rem', color: 'var(--text-muted)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {q.options.map((o) => o.text || '（空）').join(' · ')}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.15rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(idx, -1)}
                      disabled={idx === 0}
                      style={iconBtnStyle(idx === 0)}
                      title="上移"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(idx, 1)}
                      disabled={idx === arr.length - 1}
                      style={iconBtnStyle(idx === arr.length - 1)}
                      title="下移"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditQuestion(q, idx)}
                      style={iconBtnStyle(false, '#ff70a6')}
                      title="编辑"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      style={iconBtnStyle(false, '#ef4444')}
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        background: 'rgba(15, 12, 25, 0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '0.85rem 1rem', margin: '0 -1rem -3rem',
        display: 'flex', gap: '0.6rem', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          type="button"
          onClick={handleDelete}
          style={{
            background: confirmDelete ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
            border: `1px solid ${confirmDelete ? '#ef4444' : 'rgba(239, 68, 68, 0.3)'}`,
            color: confirmDelete ? '#ef4444' : 'rgba(239, 68, 68, 0.7)',
            padding: '0.55rem 0.9rem', borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            fontSize: '0.82rem', fontWeight: 600,
          }}
        >
          <Trash2 size={14} /> {confirmDelete ? '确认删除？' : (isNew ? '放弃草稿' : '删除题库')}
        </button>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-primary)',
              padding: '0.55rem 1rem', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.84rem', fontWeight: 600,
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存草稿
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            style={{
              background: 'linear-gradient(135deg, #ff70a6, #e100ff)',
              border: 'none', color: '#fff',
              padding: '0.55rem 1.1rem', borderRadius: 12, cursor: publishing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.84rem', fontWeight: 600,
            }}
          >
            {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {auditStatus === 'approved' ? '更新并重新提交审核' : '提交审核'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ 辅助 ============

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  color: 'var(--text-muted)',
  marginBottom: '0.4rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
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

function typeLabel(t: QuestionType): string {
  switch (t) {
    case 'single_choice': return '单选';
    case 'multiple_choice': return '多选';
    case 'open_text': return '文本';
    case 'media_upload': return '媒体';
  }
}

function typeColor(t: QuestionType): { bg: string; fg: string } {
  switch (t) {
    case 'single_choice': return { bg: 'rgba(255, 112, 166, 0.15)', fg: '#ff70a6' };
    case 'multiple_choice': return { bg: 'rgba(225, 0, 255, 0.15)', fg: '#e100ff' };
    case 'open_text': return { bg: 'rgba(99, 102, 241, 0.15)', fg: '#6366f1' };
    case 'media_upload': return { bg: 'rgba(245, 158, 11, 0.15)', fg: '#f59e0b' };
  }
}

// ============ 草稿持久化（仅新建模式用） ============

interface BankDraft {
  title?: string;
  subtitle?: string;
  description?: string;
  category?: 'scientific' | 'direct' | 'scenario' | 'preference';
  badgeColor?: string;
  estimatedMinutes?: number | null;
  questions?: QuestionDefinition[];
}

function loadDraft(bankId: string | null): BankDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY_PREFIX + (bankId ?? 'new'));
    if (!raw) return null;
    return JSON.parse(raw) as BankDraft;
  } catch {
    return null;
  }
}

function saveDraft(bankId: string | null, draft: BankDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY_PREFIX + (bankId ?? 'new'), JSON.stringify(draft));
  } catch {
    // 容量超限等错误静默忽略
  }
}

function clearDraft(bankId: string | null): void {
  try {
    localStorage.removeItem(DRAFT_KEY_PREFIX + (bankId ?? 'new'));
  } catch {
    // ignore
  }
}
