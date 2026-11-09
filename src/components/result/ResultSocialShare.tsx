import React from 'react';
import { Share2, Send, Copy } from 'lucide-react';
import { LuxuryCard } from '../ui/card';

interface ResultSocialShareProps {
  onShareTwitter: () => void;
  onShareTelegram: () => void;
  onCopyLink: () => void;
}

export const ResultSocialShare: React.FC<ResultSocialShareProps> = ({
  onShareTwitter,
  onShareTelegram,
  onCopyLink,
}) => {
  return (
    <LuxuryCard
      padding="none"
      className="w-full max-w-[640px] px-3.5 py-2 rounded-xl mb-3 flex items-center justify-between flex-wrap gap-2 bg-white/[0.02] border-[rgba(255,112,166,0.2)]"
    >
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <Share2 size={12} color="#ff70a6" />
        <span>契约自白分享：</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onShareTwitter}
          className="inline-flex items-center gap-1 bg-white/[0.06] border border-white/15 rounded-lg px-2.5 py-1 text-white text-xs font-semibold cursor-pointer transition-colors hover:bg-white/15"
          title="分享到 X (Twitter)"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>X 分享</span>
        </button>

        <button
          type="button"
          onClick={onShareTelegram}
          className="inline-flex items-center gap-1 bg-[rgba(36,161,222,0.12)] border border-[rgba(36,161,222,0.35)] rounded-lg px-2.5 py-1 text-[#64d2ff] text-xs font-semibold cursor-pointer transition-colors hover:bg-[rgba(36,161,222,0.2)]"
          title="分享到 Telegram"
        >
          <Send size={11} />
          <span>TG 分享</span>
        </button>

        <button
          type="button"
          onClick={onCopyLink}
          className="inline-flex items-center gap-1 bg-[rgba(255,112,166,0.1)] border border-[rgba(255,112,166,0.3)] rounded-lg px-2.5 py-1 text-[#ff70a6] text-xs font-semibold cursor-pointer transition-colors hover:bg-[rgba(255,112,166,0.2)]"
          title="复制自白链接"
        >
          <Copy size={11} />
          <span>复制契约</span>
        </button>
      </div>
    </LuxuryCard>
  );
};

