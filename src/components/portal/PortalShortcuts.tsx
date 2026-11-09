import React from 'react';
import { Crown, Layers, Activity, ChevronRight } from 'lucide-react';

interface PortalShortcutsProps {
  onOpenTasks: () => void;
  onOpenCards: () => void;
  onOpenAstrolabe: () => void;
}

export const PortalShortcuts: React.FC<PortalShortcutsProps> = ({
  onOpenTasks,
  onOpenCards,
  onOpenAstrolabe,
}) => {
  return (
    <>
      {/* 第三层：并列双入口（流光香槟金任务 + 幻彩紫晶角色卡） */}
      <div className="w-full grid grid-cols-2 gap-2.5 mb-3 box-border">
        {/* 试炼任务 */}
        <button
          type="button"
          onClick={onOpenTasks}
          className="glass-card portal-base-card p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer border border-[rgba(255,209,128,0.32)] bg-gradient-to-br from-[rgba(255,209,128,0.11)] to-[rgba(18,6,24,0.72)] box-border text-center min-h-[102px] relative overflow-hidden transition-all hover:border-[rgba(255,209,128,0.5)]"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-6 -right-6 size-20 rounded-full bg-[radial-gradient(circle,rgba(255,209,128,0.18)_0%,transparent_70%)]"
          />
          <span className="size-9 rounded-full bg-[rgba(255,209,128,0.15)] border border-[rgba(255,209,128,0.42)] shadow-[0_0_14px_rgba(255,209,128,0.2),inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center justify-center shrink-0">
            <Crown size={18} stroke="url(#gold-orange-gradient)" className="icon-glow-gold" />
          </span>
          <span className="text-xs font-extrabold text-[#ffd180] leading-tight">
            试炼任务
          </span>
          <span className="text-[11px] text-[var(--text-secondary)] opacity-80 leading-tight">
            接取暗面悬赏与挑战
          </span>
        </button>

        {/* 自制角色卡 */}
        <button
          type="button"
          onClick={onOpenCards}
          className="glass-card portal-base-card p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer border border-[rgba(192,132,252,0.34)] bg-gradient-to-br from-[rgba(192,132,252,0.12)] to-[rgba(18,6,24,0.72)] box-border text-center min-h-[102px] relative overflow-hidden transition-all hover:border-[rgba(192,132,252,0.5)]"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-6 -right-6 size-20 rounded-full bg-[radial-gradient(circle,rgba(192,132,252,0.2)_0%,transparent_70%)]"
          />
          <span className="size-9 rounded-full bg-[rgba(192,132,252,0.16)] border border-[rgba(192,132,252,0.44)] shadow-[0_0_14px_rgba(192,132,252,0.22),inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center justify-center shrink-0">
            <Layers size={18} color="#c084fc" className="icon-glow-violet" />
          </span>
          <span className="text-xs font-extrabold text-[#c084fc] leading-tight">
            自制角色卡
          </span>
          <span className="text-[11px] text-[var(--text-secondary)] opacity-80 leading-tight">
            生成专属自白卡片
          </span>
        </button>
      </div>

      {/* 第四层：潜意识星盘（冰晶青微光单行入口） */}
      <button
        type="button"
        onClick={onOpenAstrolabe}
        className="glass-card portal-base-card w-full py-2.5 px-3.5 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer border border-[rgba(128,243,255,0.26)] bg-gradient-to-r from-[rgba(128,243,255,0.08)] to-[rgba(18,6,24,0.65)] box-border text-left transition-all hover:border-[rgba(128,243,255,0.45)]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="size-7 rounded-full bg-[rgba(128,243,255,0.14)] border border-[rgba(128,243,255,0.36)] shadow-[0_0_10px_rgba(128,243,255,0.18)] flex items-center justify-center shrink-0">
            <Activity size={14} color="#80f3ff" />
          </span>
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-xs font-bold text-[#80f3ff]">
              潜意识星盘
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] opacity-80 truncate">
              群体四维心流数据分布
            </span>
          </div>
        </div>

        <ChevronRight size={14} color="#80f3ff" className="shrink-0" />
      </button>
    </>
  );
};

