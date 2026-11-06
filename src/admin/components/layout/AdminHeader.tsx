import React from 'react';
import {
  Calendar,
  ExternalLink,
  Layers,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import type { TabType } from './AdminSidebar';
import { Button } from '../ui/button';

interface AdminHeaderProps {
  activeTab: TabType;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const TAB_BREADCRUMBS: Record<TabType, { category: string; title: string }> = {
  dashboard: { category: '数据与大盘', title: '概览大盘' },
  telemetry: { category: '数据与大盘', title: '行为洞察' },
  dossiers: { category: '核心业务管控', title: '卷宗档案库' },
  users: { category: '核心业务管控', title: '用户与世系' },
  echoes: { category: '核心业务管控', title: '回响审核' },
  mailbox: { category: '核心业务管控', title: '暗室信箱' },
  banks: { category: '内容与智能体', title: '题库管理' },
  tasks: { category: '内容与智能体', title: '任务记录' },
  prompts: { category: '内容与智能体', title: 'AI 智能体中台' },
  interrogation: { category: '内容与智能体', title: '审讯室沙盒' },
  dicts: { category: '系统与安全', title: '字典与状态机' },
  security: { category: '系统与安全', title: '安全审计链' },
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  onRefresh,
  isRefreshing = false,
}) => {
  const current = TAB_BREADCRUMBS[activeTab] ?? {
    category: '管理中心',
    title: '控制台',
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 backdrop-blur-md">
      {/* 左侧：面包屑 */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium">{current.category}</span>
        <span className="text-slate-400">/</span>
        <span className="font-semibold text-slate-100">{current.title}</span>
      </div>

      {/* 右侧：操作区 */}
      <div className="flex items-center gap-2.5">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/10 text-[11px] text-slate-400 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
          <span>PRODUCTION DB</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-1.5 text-xs font-medium"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span>刷新</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          asChild
          className="gap-1.5 text-xs text-indigo-300 border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 hover:text-indigo-200"
        >
          <a href="/" target="_blank" rel="noopener noreferrer">
            <span>访问前台</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </div>
    </header>
  );
};
