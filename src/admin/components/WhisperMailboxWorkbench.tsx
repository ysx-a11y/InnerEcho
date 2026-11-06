import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Send,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageSquare,
  Search,
  User,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { mailboxApi, formatTime, type AdminMailboxMessage } from '../adminApi';
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { AdminToast, type ToastMessage } from './ui/AdminToast';

const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string }> = {
  suggestion: { label: '体验建议', icon: '💡', color: '#ff70a6' },
  whisper: { label: '自白心声', icon: '🖤', color: '#c084fc' },
  question: { label: '题库灵感', icon: '🔮', color: '#80f3ff' },
  bug: { label: '异常反馈', icon: '⚠️', color: '#f59e0b' },
};

interface WhisperMailboxWorkbenchProps {
  onStatusChanged?: () => void;
}

export const WhisperMailboxWorkbench: React.FC<WhisperMailboxWorkbenchProps> = ({ onStatusChanged }) => {
  const [messages, setMessages] = useState<AdminMailboxMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'all' | 'pending' | 'replied'>('all');
  const [loading, setLoading] = useState(true);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminMailboxMessage | null>(null);

  // Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (type: 'success' | 'error' | 'info', content: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, content }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mailboxApi.listMessages({ page, pageSize: 15, status });
      if (res.success) {
        setMessages(res.items);
        setTotal(res.total);
      }
    } catch {
      addToast('error', '加载暗室信箱列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSendReply = async (id: string) => {
    const text = (replyInputs[id] || '').trim();
    if (!text) {
      addToast('error', '请输入回复内容');
      return;
    }

    try {
      setReplyingId(id);
      const res = await mailboxApi.replyMessage(id, text);
      if (res.success) {
        addToast('success', '私密回信已送达对方信箱');
        setReplyInputs((prev) => ({ ...prev, [id]: '' }));
        await loadData();
        onStatusChanged?.();
      } else {
        addToast('error', res.message || '回信失败');
      }
    } catch {
      addToast('error', '网络异常，回信失败');
    } finally {
      setReplyingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await mailboxApi.deleteMessage(deleteTarget.id);
      if (res.success) {
        addToast('success', '密信已删除');
        setDeleteTarget(null);
        await loadData();
        onStatusChanged?.();
      }
    } catch {
      addToast('error', '删除失败');
    }
  };

  const totalPages = Math.ceil(total / 15) || 1;

  return (
    <div style={{ padding: '0.5rem 0', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 顶部控制栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.2rem',
          background: 'var(--admin-surface)',
          padding: '1rem 1.4rem',
          borderRadius: 16,
          border: '1px solid var(--admin-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(255, 112, 166, 0.15)',
              border: '1px solid rgba(255, 112, 166, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Mail size={20} color="#ff70a6" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
              暗室信箱 · 密信回响
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: 'var(--admin-text-muted)' }}>
              用户 1v1 私密投递与专属回音 · 仅对应用户与其当前设备可见
            </p>
          </div>
        </div>

        {/* 筛选与刷新 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 10,
              padding: '3px',
              border: '1px solid var(--admin-border)',
            }}
          >
            {(['all', 'pending', 'replied'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: 8,
                  border: 'none',
                  background: status === s ? 'rgba(255, 112, 166, 0.2)' : 'transparent',
                  color: status === s ? '#ff70a6' : 'var(--admin-text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {s === 'all' ? '全部密信' : s === 'pending' ? '待回复' : '已回复'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.9rem',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--admin-border)',
              color: '#fff',
              fontSize: '0.76rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin-rotate' : ''} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 列表区域 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--admin-text-muted)' }}>
          <RefreshCw size={24} className="spin-rotate" style={{ margin: '0 auto 0.8rem' }} />
          <p style={{ margin: 0, fontSize: '0.85rem' }}>正在检索暗室密信...</p>
        </div>
      ) : messages.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            background: 'var(--admin-surface)',
            borderRadius: 16,
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-muted)',
          }}
        >
          <Mail size={36} style={{ opacity: 0.3, marginBottom: '0.8rem' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>暂无符合条件的密信投递</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((item) => {
            const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.suggestion;
            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 16,
                  padding: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.9rem',
                }}
              >
                {/* 顶部身份与状态 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 8,
                        background: `${catInfo.color}15`,
                        color: catInfo.color,
                        border: `1px solid ${catInfo.color}40`,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      {catInfo.icon} {catInfo.label}
                    </span>

                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff' }}>
                      {item.nickname}
                    </span>

                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.7rem',
                        color: 'var(--admin-text-muted)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                      title={`设备指纹: ${item.deviceId}`}
                    >
                      {item.deviceId ? `${item.deviceId.slice(0, 14)}...` : '未知设备'}
                    </span>

                    {item.contactInfo && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 8,
                          background: 'rgba(52, 211, 153, 0.12)',
                          color: '#34d399',
                          border: '1px solid rgba(52, 211, 153, 0.3)',
                        }}
                      >
                        联系方式: {item.contactInfo}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
                      {formatTime(item.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#ef4444',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <Trash2 size={12} />
                      <span>删除</span>
                    </button>
                  </div>
                </div>

                {/* 投递正文 */}
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 12,
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    color: '#fff',
                    fontSize: '0.86rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.content}
                </div>

                {/* 已回复记录展示 */}
                {item.replyContent && (
                  <div
                    style={{
                      padding: '0.8rem 1rem',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.1) 0%, rgba(255, 112, 166, 0.06) 100%)',
                      border: '1px solid rgba(192, 132, 252, 0.28)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle2 size={13} color="#c084fc" />
                        <span>已发送专属回音（仅对方可见）</span>
                      </span>
                      {item.repliedAt && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>
                          {formatTime(item.repliedAt)}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#fff', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {item.replyContent}
                    </p>
                  </div>
                )}

                {/* 回复输入区域 */}
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <textarea
                    value={replyInputs[item.id] !== undefined ? replyInputs[item.id] : ''}
                    onChange={(e) => setReplyInputs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder={item.replyContent ? '输入新内容以覆盖/追加专属回信...' : '输入主理人专属回音（点击发送后立即推送到对方的暗室信箱）...'}
                    rows={2}
                    style={{
                      flex: 1,
                      padding: '0.6rem 0.8rem',
                      borderRadius: 10,
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--admin-border)',
                      color: '#fff',
                      fontSize: '0.8rem',
                      lineHeight: 1.45,
                      resize: 'none',
                      boxSizing: 'border-box',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="button"
                    disabled={replyingId === item.id}
                    onClick={() => void handleSendReply(item.id)}
                    style={{
                      padding: '0.6rem 1rem',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #ff70a6, #c084fc)',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: replyingId === item.id ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      flexShrink: 0,
                    }}
                  >
                    <Send size={13} />
                    <span>{replyingId === item.id ? '发送中...' : item.replyContent ? '更新回音' : '私密回信'}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* 分页控制器 */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: 8,
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  color: page <= 1 ? 'var(--admin-text-muted)' : '#fff',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.76rem',
                }}
              >
                <ChevronLeft size={14} />
                <span>上一页</span>
              </button>
              <span style={{ fontSize: '0.76rem', color: 'var(--admin-text-muted)' }}>
                {page} / {totalPages} 页 (共 {total} 封)
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: 8,
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  color: page >= totalPages ? 'var(--admin-text-muted)' : '#fff',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.76rem',
                }}
              >
                <span>下一页</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 删除确认弹窗 */}
      <AdminConfirmDialog
        isOpen={deleteTarget !== null}
        title="删除暗室密信"
        description="确认删除该条用户的密信投递吗？删除后对方将无法再查阅此条记录。"
        confirmText="确认删除"
        cancelText="取消"
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <AdminToast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
