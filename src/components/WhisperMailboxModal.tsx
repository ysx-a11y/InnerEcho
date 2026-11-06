import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Mail,
  X,
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  User,
} from 'lucide-react';
import { Z_LAYER } from '../utils/zLayers';
import { getOrCreateDeviceId } from '../utils/deviceId';

export interface WhisperMessageItem {
  id: string;
  userId: string | null;
  deviceId: string;
  nickname: string;
  contactInfo: string;
  category: string;
  content: string;
  replyContent: string | null;
  repliedAt: string | null;
  userHasReadReply: boolean;
  createdAt: string;
}

interface WhisperMailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMessagesRead?: () => void;
  userNickname?: string;
  /** 打开时默认选中的分类（如由异常提示进入时预选「异常反馈」）。 */
  initialCategory?: string;
}

const CATEGORY_MAP: Record<string, { label: string; icon: string }> = {
  suggestion: { label: '体验建议', icon: '💡' },
  whisper: { label: '自白心声', icon: '🖤' },
  question: { label: '题库灵感', icon: '🔮' },
  bug: { label: '异常反馈', icon: '⚠️' },
};

export const WhisperMailboxModal: React.FC<WhisperMailboxModalProps> = ({
  isOpen,
  onClose,
  onMessagesRead,
  userNickname,
  initialCategory = 'suggestion',
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write');
  const [category, setCategory] = useState<string>(initialCategory);
  const [content, setContent] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [messages, setMessages] = useState<WhisperMessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchMyMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mailbox/my', {
        headers: {
          'X-Device-Id': getOrCreateDeviceId(),
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        // 若有未读回复，标记已读
        if (data.hasUnreadReply) {
          void fetch('/api/mailbox/read', {
            method: 'POST',
            headers: {
              'X-Device-Id': getOrCreateDeviceId(),
            },
            credentials: 'include',
          }).then(() => {
            onMessagesRead?.();
          });
        }
      }
    } catch {
      // 容错处理
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      void fetchMyMessages();
    }
  }, [isOpen, initialCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length < 3) {
      setToastMsg('请至少输入 3 个字的信件内容');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/mailbox/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': getOrCreateDeviceId(),
        },
        credentials: 'include',
        body: JSON.stringify({
          content: trimmed,
          category,
          contactInfo: contactInfo.trim() || undefined,
          nickname: userNickname || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContent('');
        setContactInfo('');
        setToastMsg('密信已投递入深渊，将亲自审阅');
        // 自动拉取更新并切到历史标签
        await fetchMyMessages();
        setActiveTab('history');
      } else {
        setToastMsg(data.message || '投递失败，请稍后再试');
      }
    } catch {
      setToastMsg('网络异常，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const repliedCount = messages.filter((m) => m.replyContent).length;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 4, 10, 0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_LAYER.userModal,
        padding: '1rem',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          background: 'linear-gradient(145deg, #130d1e 0%, #0c0816 100%)',
          border: '1px solid rgba(255, 112, 166, 0.28)',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: '0 25px 70px rgba(0,0,0,0.85), 0 0 35px rgba(255, 112, 166, 0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div
          style={{
            padding: '1.1rem 1.4rem 0.9rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(255, 112, 166, 0.15)',
                border: '1px solid rgba(255, 112, 166, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mail size={17} color="#ff70a6" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  暗室信箱
                </h3>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '2px 7px',
                    borderRadius: 10,
                    background: 'rgba(52, 211, 153, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                  }}
                >
                  1v1 绝密
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                私密回响通道 · 仅你与系统可见
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            padding: '0.5rem 1.4rem',
            gap: '0.6rem',
            background: 'rgba(0, 0, 0, 0.25)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 12,
              border: activeTab === 'write' ? '1px solid rgba(255, 112, 166, 0.4)' : '1px solid transparent',
              background: activeTab === 'write' ? 'rgba(255, 112, 166, 0.15)' : 'transparent',
              color: activeTab === 'write' ? '#ff70a6' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            投递新回响
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 12,
              border: activeTab === 'history' ? '1px solid rgba(192, 132, 252, 0.4)' : '1px solid transparent',
              background: activeTab === 'history' ? 'rgba(192, 132, 252, 0.15)' : 'transparent',
              color: activeTab === 'history' ? '#c084fc' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s',
            }}
          >
            <span>我的信箱与回音</span>
            {messages.length > 0 && (
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: 8,
                  background: repliedCount > 0 ? 'rgba(255, 112, 166, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                }}
              >
                {repliedCount > 0 ? `${repliedCount}条回音` : `${messages.length}封`}
              </span>
            )}
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div
          style={{
            padding: '1.2rem 1.4rem',
            overflowY: 'auto',
            flex: 1,
            boxSizing: 'border-box',
          }}
        >
          {toastMsg && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.6rem 0.9rem',
                borderRadius: 10,
                background: 'rgba(255, 112, 166, 0.15)',
                border: '1px solid rgba(255, 112, 166, 0.35)',
                color: '#fff',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{toastMsg}</span>
              <button
                type="button"
                onClick={() => setToastMsg(null)}
                style={{ background: 'none', border: 'none', color: '#ff70a6', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          )}

          {activeTab === 'write' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Category Pills */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.45rem', fontWeight: 600 }}>
                  密信主题分类
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem' }}>
                  {Object.entries(CATEGORY_MAP).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      style={{
                        padding: '0.45rem 0.2rem',
                        borderRadius: 10,
                        border: category === key ? '1px solid #ff70a6' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: category === key ? 'rgba(255, 112, 166, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                        color: category === key ? '#ff70a6' : 'rgba(255, 255, 255, 0.65)',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ fontSize: '0.9rem' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>
                    你的回响或建言
                  </label>
                  <span style={{ fontSize: '0.68rem', color: content.length > 1800 ? '#ef4444' : 'rgba(255, 255, 255, 0.4)' }}>
                    {content.length} / 2000
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="写下你对系统功能的建议、想看的特定题库、或是在测验中未曾尽兴的隐秘心声……"
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 12,
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    resize: 'none',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 112, 166, 0.5)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                />
              </div>

              {/* Contact Info (Optional) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.65)', marginBottom: '0.35rem' }}>
                  回音联系方式（选填）
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="微信 / Telegram / 邮箱（不填则仅在当前信箱中回信）"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 10,
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '0.78rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || content.trim().length < 3}
                className="btn-glow"
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  borderRadius: 12,
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  border: 'none',
                  cursor: submitting || content.trim().length < 3 ? 'not-allowed' : 'pointer',
                  opacity: submitting || content.trim().length < 3 ? 0.6 : 1,
                  marginTop: '0.2rem',
                }}
              >
                <Send size={14} />
                <span>{submitting ? '密缄投递中...' : '密缄投递'}</span>
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem' }}>
                  正在检索信箱暗室...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'rgba(255, 255, 255, 0.45)' }}>
                  <Mail size={32} style={{ opacity: 0.3, marginBottom: '0.6rem' }} />
                  <p style={{ margin: 0, fontSize: '0.82rem' }}>信箱暂无往期投递</p>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.3)' }}>
                    在此处投递你的心声，回复后将仅在你此处显影
                  </p>
                </div>
              ) : (
                messages.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 14,
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}
                  >
                    {/* Message Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '2px 7px',
                          borderRadius: 8,
                          background: 'rgba(255, 112, 166, 0.12)',
                          color: '#ff70a6',
                          border: '1px solid rgba(255, 112, 166, 0.25)',
                        }}
                      >
                        {CATEGORY_MAP[item.category]?.icon} {CATEGORY_MAP[item.category]?.label || '建议'}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                        {item.createdAt.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>

                    {/* User Content */}
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: 'rgba(255, 255, 255, 0.85)',
                        lineHeight: 1.45,
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.content}
                    </p>

                    {/* Admin Reply Section */}
                    {item.replyContent ? (
                      <div
                        style={{
                          marginTop: '0.3rem',
                          padding: '0.75rem 0.85rem',
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.12) 0%, rgba(255, 112, 166, 0.08) 100%)',
                          border: '1px solid rgba(192, 132, 252, 0.35)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Sparkles size={12} color="#c084fc" />
                            <span>专属回音</span>
                          </span>
                          {item.repliedAt && (
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                              {item.repliedAt.slice(0, 16).replace('T', ' ')}
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.78rem',
                            color: '#fff',
                            lineHeight: 1.45,
                            wordBreak: 'break-word',
                          }}
                        >
                          {item.replyContent}
                        </p>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255, 209, 128, 0.7)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={11} />
                        <span>已封存入信箱，等待审阅回音中...</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
