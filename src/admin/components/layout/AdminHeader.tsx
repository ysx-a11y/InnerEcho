import React from 'react';
import { ExternalLink, RotateCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { SidebarTrigger } from '../ui/sidebar';
import { ThemeSwitch } from '../ThemeSwitch';
import { ConfigDrawer } from '../ConfigDrawer';
import type { TabType } from './AdminSidebar';
import { cn } from '../../lib/utils';

interface AdminHeaderProps {
  activeTab: TabType;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const TAB_TITLES: Record<TabType, { section: string; title: string }> = {
  dashboard: { section: '数据与大盘', title: '概览大盘' },
  telemetry: { section: '数据与大盘', title: '行为洞察' },
  dossiers: { section: '核心业务管控', title: '卷宗档案库' },
  users: { section: '核心业务管控', title: '用户与世系' },
  echoes: { section: '核心业务管控', title: '回响审核' },
  mailbox: { section: '核心业务管控', title: '暗室信箱' },
  banks: { section: '内容与智能体', title: '题库管理' },
  tasks: { section: '内容与智能体', title: '任务记录' },
  prompts: { section: '内容与智能体', title: 'AI 智能体中台' },
  interrogation: { section: '内容与智能体', title: '审讯室沙盒' },
  dicts: { section: '系统与安全', title: '字典与状态机' },
  security: { section: '系统与安全', title: '安全审计链' },
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  onRefresh,
  isRefreshing = false,
}) => {
  const meta = TAB_TITLES[activeTab] || { section: '控制台', title: activeTab };

  return (
    <header className="sticky top-0 z-40 flex h-11 shrink-0 items-center gap-2 border-b border-border/40 bg-background/95 px-3 sm:px-4 backdrop-blur-md">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1.5 h-3.5" />

      {/* Breadcrumb Info */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground hidden sm:inline">{meta.section}</span>
        <span className="text-muted-foreground/60 hidden sm:inline">/</span>
        <span className="font-semibold text-foreground tracking-tight">{meta.title}</span>
      </div>

      {/* Right Actions */}
      <div className="ms-auto flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="font-mono">PRODUCTION DB</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-7 gap-1 text-xs px-2.5 cursor-pointer"
        >
          <RotateCw
            className={cn('size-3', isRefreshing && 'animate-spin')}
          />
          <span className="hidden sm:inline">{isRefreshing ? '同步中...' : '刷新'}</span>
        </Button>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
        >
          <span className="hidden md:inline">访问前台</span>
          <ExternalLink className="size-3" />
        </a>

        <Separator orientation="vertical" className="h-3.5" />

        <ThemeSwitch />
        <ConfigDrawer />
      </div>
    </header>
  );
};
