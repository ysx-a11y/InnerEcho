import React, { useCallback, useEffect, useState } from 'react';
import { AdminLogin } from './components/AdminLogin';
import { Dashboard } from './components/Dashboard';
import { DossierList } from './components/DossierList';
import { UserWorkbench } from './components/UserWorkbench';
import { PromptWorkbench } from './components/PromptWorkbench';
import { DictWorkbench } from './components/DictWorkbench';
import { TelemetryStats } from './components/TelemetryStats';
import { TaskList } from './components/TaskList';
import { BankWorkbench } from './components/BankWorkbench';
import { EchoWorkbench } from './components/EchoWorkbench';
import { SecurityEvents } from './components/SecurityEvents';
import { WhisperMailboxWorkbench } from './components/WhisperMailboxWorkbench';
import { InterrogationWorkbench } from './components/InterrogationWorkbench';
import { AdminLayout } from './components/layout/AdminLayout';
import type { TabType } from './components/layout/AdminSidebar';
import { clearAdminToken, getAdminToken, setAdminToken } from './adminToken';
import { adminApi } from './adminApi';
import { adminNotify } from './components/ui/adminNotify';
import type { AdminTimeRange } from './adminTypes';

export const AdminApp: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getAdminToken()));
  const [activeTab, setActiveTab] = useState<TabType>('dossiers');
  const [globalRange, setGlobalRange] = useState<AdminTimeRange>('today');
  const [globalCustomDate, setGlobalCustomDate] = useState<string>(() => {
    return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingCounts, setPendingCounts] = useState<{
    banks: number;
    echoes: number;
    mailbox: number;
  }>({
    banks: 0,
    echoes: 0,
    mailbox: 0,
  });

  const fetchPendingCounts = useCallback(async () => {
    if (!getAdminToken()) return;
    try {
      const res = await adminApi.getPendingCounts();
      if (res.success && res.pendingCounts) {
        setPendingCounts({
          banks: res.pendingCounts.banks || 0,
          echoes: res.pendingCounts.echoes || 0,
          mailbox: res.pendingCounts.mailbox || 0,
        });
      }
    } catch {
      // 忽略瞬时网络抖动
    }
  }, []);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    let cancelled = false;
    fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({}),
    })
      .then((response) => {
        if (!cancelled && !response.ok) {
          clearAdminToken();
          setIsLoggedIn(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAdminToken();
          setIsLoggedIn(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      void fetchPendingCounts();
      const timer = setInterval(fetchPendingCounts, 20000);
      return () => clearInterval(timer);
    }
  }, [isLoggedIn, fetchPendingCounts, refreshTrigger]);

  const navigate = (tab: TabType) => {
    setActiveTab(tab);
  };

  const logout = () => {
    clearAdminToken();
    setIsLoggedIn(false);
  };

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    adminNotify.success('运营数据已同步刷新');
    setTimeout(() => setIsRefreshing(false), 600);
  };

  if (!isLoggedIn) {
    return (
      <AdminLogin
        onLoginSuccess={(token: string) => {
          setAdminToken(token);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  let content: React.ReactNode = null;
  if (activeTab === 'dashboard') {
    content = (
      <Dashboard
        range={globalRange}
        customDate={globalCustomDate}
        refreshTrigger={refreshTrigger}
        onNavigateToUsers={() => navigate('users')}
      />
    );
  } else if (activeTab === 'dossiers') {
    content = (
      <DossierList
        refreshTrigger={refreshTrigger}
        onNavigateToUsers={() => navigate('users')}
      />
    );
  } else if (activeTab === 'users') {
    content = <UserWorkbench refreshTrigger={refreshTrigger} />;
  } else if (activeTab === 'banks') {
    content = (
      <BankWorkbench
        refreshTrigger={refreshTrigger}
        onStatusChanged={fetchPendingCounts}
      />
    );
  } else if (activeTab === 'echoes') {
    content = (
      <EchoWorkbench
        refreshTrigger={refreshTrigger}
        onStatusChanged={fetchPendingCounts}
      />
    );
  } else if (activeTab === 'mailbox') {
    content = <WhisperMailboxWorkbench onStatusChanged={fetchPendingCounts} />;
  } else if (activeTab === 'telemetry') {
    content = (
      <TelemetryStats
        range={globalRange}
        customDate={globalCustomDate}
        refreshTrigger={refreshTrigger}
      />
    );
  } else if (activeTab === 'prompts') {
    content = <PromptWorkbench />;
  } else if (activeTab === 'dicts') {
    content = <DictWorkbench />;
  } else if (activeTab === 'tasks') {
    content = <TaskList refreshTrigger={refreshTrigger} />;
  } else if (activeTab === 'security') {
    content = <SecurityEvents refreshTrigger={refreshTrigger} />;
  } else if (activeTab === 'interrogation') {
    content = <InterrogationWorkbench />;
  }

  return (
    <AdminLayout
      activeTab={activeTab}
      onSelectTab={navigate}
      onLogout={logout}
      onRefresh={handleManualRefresh}
      isRefreshing={isRefreshing}
      pendingCounts={pendingCounts}
    >
      {content}
    </AdminLayout>
  );
};

export default AdminApp;
