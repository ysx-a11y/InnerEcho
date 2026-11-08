import React from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar, type TabType } from './AdminSidebar';
import { SidebarInset, SidebarProvider } from '../ui/sidebar';

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
  return (
    <SidebarProvider defaultOpen={true}>
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onLogout={onLogout}
        pendingCounts={pendingCounts}
      />
      <SidebarInset className="min-w-0 flex flex-1 flex-col">
        <AdminHeader
          activeTab={activeTab}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
        <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="mx-auto w-full max-w-7xl flex flex-col gap-2 sm:gap-2.5">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};
