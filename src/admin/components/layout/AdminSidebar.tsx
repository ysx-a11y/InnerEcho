import React from 'react';
import {
  Activity,
  FileSpreadsheet,
  LayoutDashboard,
  Library,
  LogOut,
  ShieldCheck,
  Bookmark,
  Users,
  Flame,
  ShieldAlert,
  Mail,
  Siren,
  Bot,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export type TabType =
  | 'dashboard'
  | 'dossiers'
  | 'users'
  | 'banks'
  | 'echoes'
  | 'mailbox'
  | 'telemetry'
  | 'prompts'
  | 'dicts'
  | 'tasks'
  | 'security'
  | 'interrogation';

interface NavItem {
  id: TabType;
  label: string;
  badge?: number | string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  pendingCounts?: { banks: number; echoes: number; mailbox: number };
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  onLogout,
  pendingCounts = { banks: 0, echoes: 0, mailbox: 0 },
}) => {
  const navGroups: NavGroup[] = [
    {
      title: '数据与大盘',
      items: [
        { id: 'dashboard', label: '概览大盘', icon: LayoutDashboard },
        { id: 'telemetry', label: '行为洞察', icon: Activity },
      ],
    },
    {
      title: '核心业务管控',
      items: [
        { id: 'dossiers', label: '卷宗档案库', icon: FileSpreadsheet },
        { id: 'users', label: '用户与世系', icon: Users },
        {
          id: 'echoes',
          label: '回响审核',
          icon: Flame,
          badge: pendingCounts.echoes > 0 ? pendingCounts.echoes : undefined,
        },
        {
          id: 'mailbox',
          label: '暗室信箱',
          icon: Mail,
          badge: pendingCounts.mailbox > 0 ? pendingCounts.mailbox : undefined,
        },
      ],
    },
    {
      title: '内容与智能体',
      items: [
        {
          id: 'banks',
          label: '题库管理',
          icon: Library,
          badge: pendingCounts.banks > 0 ? pendingCounts.banks : undefined,
        },
        { id: 'tasks', label: '任务记录', icon: Bookmark },
        { id: 'prompts', label: 'AI 智能体中台', icon: Bot },
        { id: 'interrogation', label: '审讯室沙盒', icon: Siren },
      ],
    },
    {
      title: '系统与安全',
      items: [
        { id: 'dicts', label: '字典与状态机', icon: Sliders },
        { id: 'security', label: '安全审计链', icon: ShieldAlert },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-white/10 bg-slate-950 transition-all duration-300 ease-in-out select-none shrink-0 z-30',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* 顶部 Brand 区域 */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-3.5">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold tracking-tight text-white leading-tight">
                深层回响 InnerEcho
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ADMIN CONSOLE
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="h-4 w-4" />
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer',
            collapsed && 'hidden'
          )}
          title={collapsed ? '展开菜单' : '折叠菜单'}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 导航菜单列表 */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <h4 className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.title}
              </h4>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={cn(
                      'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer',
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/30 shadow-sm'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent',
                      collapsed && 'justify-center px-0'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive
                          ? 'text-indigo-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    />

                    {!collapsed && (
                      <span className="truncate flex-1 text-left">
                        {item.label}
                      </span>
                    )}

                    {!collapsed && item.badge && (
                      <Badge
                        variant="secondary"
                        className="ml-auto px-1.5 py-0 text-[10px] bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 底部折叠展开按钮（折叠状态下展示） */}
      {collapsed && (
        <div className="p-2 border-t border-white/10 flex justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="展开侧边栏"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 底部用户信息卡片 */}
      <div className="border-t border-white/10 p-2.5">
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-lg p-1.5 bg-slate-900/60 border border-white/5',
            collapsed && 'justify-center p-1'
          )}
        >
          <Avatar className="h-7 w-7 border-indigo-500/30">
            <AvatarFallback className="bg-indigo-600 text-[11px] font-bold text-white">
              A
            </AvatarFallback>
          </Avatar>

          {!collapsed && (
            <div className="flex flex-1 flex-col truncate">
              <span className="text-xs font-medium text-slate-200 leading-none">
                系统管理员
              </span>
              <span className="text-[10px] text-teal-400 font-mono mt-0.5">
                ● 在线 (Active)
              </span>
            </div>
          )}

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              title="退出登录"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};
