import React, { useState } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar, type TabType } from './AdminSidebar';

interface AdminLayoutProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  pendingCounts?: { banks: number; echoes: number; mailbox: number };
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onSelectTab,
  onLogout,
  onRefresh,
  isRefreshing = false,
  pendingCounts,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-slate-950 text-slate-100 antialiased overflow-hidden">
      {/* 现代折叠式侧边栏 */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onLogout={onLogout}
        pendingCounts={pendingCounts}
      />

      {/* 主工作区 */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* 顶部导航头 */}
        <AdminHeader
          activeTab={activeTab}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        {/* 页面内容区 */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
          <div className="mx-auto w-full max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
