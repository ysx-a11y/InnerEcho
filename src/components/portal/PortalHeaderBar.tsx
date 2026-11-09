import React from 'react';
import { Sparkles, User, LogIn } from 'lucide-react';

interface PortalHeaderBarProps {
  user?: { id: string; email: string } | null;
  onOpenPersonal?: () => void;
  onContinue?: () => void;
  onOpenBanks: () => void;
  onOpenAuth: () => void;
}

function formatAccountBadge(account: string): string {
  const trimmed = account.trim();
  if (/^\d{11}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)}****${trimmed.slice(7)}`;
  }
  return trimmed;
}

export const PortalHeaderBar: React.FC<PortalHeaderBarProps> = ({
  user,
  onOpenPersonal,
  onContinue,
  onOpenBanks,
  onOpenAuth,
}) => {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
        padding: '0 0.25rem',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Sparkles size={14} stroke="url(#rose-magenta-gradient)" className="animate-icon-pulse" />
        <span style={{ fontSize: '0.78rem', color: '#ff70a6', fontWeight: 600, letterSpacing: '0.05em' }}>
          镜界自白 · 极密卷宗
        </span>
      </div>

      {user ? (
        <button
          type="button"
          onClick={onOpenPersonal || onContinue || onOpenBanks}
          style={{
            background: 'rgba(255, 112, 166, 0.1)',
            border: '1px solid rgba(255, 112, 166, 0.26)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.14)',
            borderRadius: 14,
            padding: '0.24rem 0.62rem',
            minHeight: 28,
            boxSizing: 'border-box',
            color: 'var(--text-secondary)',
            fontSize: '0.72rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.32rem',
          }}
          title={`前往个人中心 (${user.email})`}
          aria-label={`前往个人中心 (${user.email})`}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#34d399',
              boxShadow: '0 0 6px #34d399',
              flexShrink: 0,
            }}
          />
          <User size={12} />
          <span style={{ maxWidth: 105, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formatAccountBadge(user.email)}
          </span>
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span
            style={{
              background: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              borderRadius: 14,
              padding: '0.22rem 0.55rem',
              minHeight: 28,
              boxSizing: 'border-box',
              color: '#34d399',
              fontSize: '0.7rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            title="已启用本地设备加密沙盒，无需注册直接测验"
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 6px #34d399',
              }}
            />
            <span>匿名加密沙盒</span>
          </span>

          <button
            type="button"
            onClick={onOpenAuth}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 112, 166, 0.25)',
              borderRadius: 14,
              padding: '0.22rem 0.55rem',
              minHeight: 28,
              minWidth: 64,
              boxSizing: 'border-box',
              color: 'var(--text-muted)',
              fontSize: '0.7rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'background 0.2s',
            }}
            title="选填：云端备份或同步到其他设备"
            aria-label="选填：云端备份或同步到其他设备"
          >
            <LogIn size={11} />
            <span>云端备份</span>
          </button>
        </div>
      )}
    </div>
  );
};

