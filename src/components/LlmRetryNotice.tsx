import React, { useState } from 'react';
import { Loader2, RefreshCw, LifeBuoy } from 'lucide-react';
import { WhisperMailboxModal } from './WhisperMailboxModal';
import type { LlmRetryState } from '../hooks/useDossierSubmission';

interface LlmRetryNoticeProps {
  state: LlmRetryState;
  onRetry?: () => void;
}

/**
 * LLM 深度解读「返回明显错误默认值（如 0000）」时的重试提示条。
 *
 * - 服务端已自动重试一次；这里只承载「一次手动重试」；
 * - 手动重试仍失败后，改为引导用户前往暗室信箱（异常反馈）反馈本次问题。
 */
export const LlmRetryNotice: React.FC<LlmRetryNoticeProps> = ({ state, onRetry }) => {
  const [mailboxOpen, setMailboxOpen] = useState(false);

  if (!state.failed && !state.retrying) return null;

  return (
    <>
      <div
        role="status"
        style={{
          width: 'calc(100% - 1.5rem)',
          margin: '0 auto 0.75rem',
          padding: '0.75rem 1rem',
          borderRadius: 12,
          border: '1px solid rgba(251, 146, 60, 0.45)',
          background: 'rgba(251, 146, 60, 0.1)',
          color: '#fed7aa',
          boxSizing: 'border-box',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: 'min(720px, calc(100% - 1.5rem))',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.6rem',
        }}
      >
        <span style={{ flex: '1 1 220px', minWidth: 0 }}>
          {state.retrying
            ? '正在重新生成 AI 深度解读…'
            : state.retryUsed
              ? 'AI 深度解读仍未正常生成，可继续使用本地分析结果，或反馈本次异常。'
              : 'AI 深度解读疑似异常（返回默认值），可重新生成一次。'}
        </span>

        {state.retrying ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', opacity: 0.85 }}>
            <Loader2 size={16} className="animate-spin" />
            重试中
          </span>
        ) : state.retryUsed ? (
          <button
            type="button"
            onClick={() => setMailboxOpen(true)}
            style={noticeButtonStyle}
          >
            <LifeBuoy size={16} />
            反馈此问题
          </button>
        ) : (
          <button type="button" onClick={onRetry} style={noticeButtonStyle}>
            <RefreshCw size={16} />
            重新生成一次
          </button>
        )}
      </div>

      <WhisperMailboxModal
        isOpen={mailboxOpen}
        onClose={() => setMailboxOpen(false)}
        initialCategory="bug"
      />
    </>
  );
};

const noticeButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  flexShrink: 0,
  padding: '0.4rem 0.9rem',
  borderRadius: 999,
  border: '1px solid rgba(251, 146, 60, 0.6)',
  background: 'rgba(251, 146, 60, 0.16)',
  color: '#ffe4c7',
  cursor: 'pointer',
  fontSize: '0.85rem',
  whiteSpace: 'nowrap',
};
