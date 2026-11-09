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
    <div className="w-full flex justify-between items-center mb-3 px-1 box-border">
      <div className="flex items-center gap-1.5">
        <Sparkles size={14} stroke="url(#rose-magenta-gradient)" className="animate-icon-pulse" />
        <span className="text-xs font-semibold text-[#ff70a6] tracking-wider">
          深层回响 · 极密卷宗
        </span>
      </div>

      {user ? (
        <button
          type="button"
          onClick={onOpenPersonal || onContinue || onOpenBanks}
          className="bg-[rgba(255,112,166,0.1)] border border-[rgba(255,112,166,0.26)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] rounded-full px-2.5 py-1 text-[var(--text-secondary)] text-xs cursor-pointer flex items-center gap-1.5 transition-colors hover:border-[#ff70a6]"
          style={{ minHeight: 28, boxSizing: 'border-box' }}
          title={`前往个人中心 (${user.email})`}
          aria-label={`前往个人中心 (${user.email})`}
        >
          <span className="size-1.5 rounded-full bg-[#34d399] shadow-[0_0_6px_#34d399] shrink-0" />
          <User size={12} />
          <span className="max-w-[105px] truncate whitespace-nowrap">
            {formatAccountBadge(user.email)}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span
            className="bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.3)] rounded-full px-2.5 py-1 text-[#34d399] text-[11px] font-semibold flex items-center gap-1.5"
            style={{ minHeight: 28, boxSizing: 'border-box' }}
            title="已启用本地设备加密沙盒，无需注册直接测验"
          >
            <span className="size-1.5 rounded-full bg-[#34d399] shadow-[0_0_6px_#34d399]" />
            <span>匿名加密沙盒</span>
          </span>

          <button
            type="button"
            onClick={onOpenAuth}
            className="bg-transparent border border-[rgba(255,112,166,0.25)] rounded-full px-2.5 py-1 text-[var(--text-muted)] text-[11px] cursor-pointer flex items-center gap-1 transition-colors hover:text-white hover:border-[#ff70a6]"
            style={{ minHeight: 28, minWidth: 64, boxSizing: 'border-box' }}
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

