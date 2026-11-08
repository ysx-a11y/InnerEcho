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
  Bot,
  Sliders,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '../ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

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
  onLogout: () => void;
  pendingCounts?: { banks: number; echoes: number; mailbox: number };
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  onLogout,
  pendingCounts = { banks: 0, echoes: 0, mailbox: 0 },
}) => {
  const { setOpenMobile, isMobile } = useSidebar();

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
        { id: 'interrogation', label: '审讯室沙盒', icon: Sparkles },
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

  const handleSelect = (id: TabType) => {
    onSelectTab(id);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/* Workspace Header */}
      <SidebarHeader className="border-b border-border/40 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-accent cursor-pointer">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-xs">
                IE
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight">
                  深层回响 InnerEcho
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Console · 生产管控平台
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
              {group.title}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      onClick={() => handleSelect(item.id)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      )}
                    >
                      <IconComponent className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <Badge
                          variant="secondary"
                          className="ms-auto rounded-full px-1.5 py-0 text-[10px] font-semibold"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer User Info */}
      <SidebarFooter className="border-t border-border/40 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                      主管
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium">系统主管</span>
                    <span className="truncate text-xs text-muted-foreground">
                      admin@innerecho.internal
                    </span>
                  </div>
                  <ChevronsUpDown className="ms-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                        主管
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-start text-sm leading-tight">
                      <span className="truncate font-semibold">系统主管</span>
                      <span className="truncate text-xs text-muted-foreground">
                        安全管控层级：L4 最高权限
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  退出管理会话
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
