import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  FileSpreadsheet,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  PanelLeftClose,
  ShieldCheck,
  Sparkles,
  Bookmark,
  RefreshCw,
  Users,
  Flame,
  ExternalLink,
  ShieldAlert,
  Mail,
  Siren,
} from 'lucide-react';
import { AdminLogin } from './components/AdminLogin';
import { Dashboard } from './components/Dashboard';
import { DossierList } from './components/DossierList';
import { UserWorkbench } from './components/UserWorkbench';
import { PromptWorkbench } from './components/PromptWorkbench';
import { TelemetryStats } from './components/TelemetryStats';
import { TaskList } from './components/TaskList';
import { BankWorkbench } from './components/BankWorkbench';
import { EchoWorkbench } from './components/EchoWorkbench';
import { SecurityEvents } from './components/SecurityEvents';
import { WhisperMailboxWorkbench } from './components/WhisperMailboxWorkbench';
import { InterrogationWorkbench } from './components/InterrogationWorkbench';
import { AdminSelect, type AdminSelectOption } from './components/ui/AdminSelect';
import { AdminDatePicker } from './components/ui/AdminDatePicker';
import { AdminToast, type ToastMessage } from './components/ui/AdminToast';
import { clearAdminToken, getAdminToken, setAdminToken } from './adminToken';
import { adminApi } from './adminApi';
import type { AdminTimeRange } from './adminTypes';

type TabType = 'dashboard' | 'dossiers' | 'users' | 'banks' | 'echoes' | 'mailbox' | 'telemetry' | 'prompts' | 'tasks' | 'security' | 'interrogation';

const NAV_ITEMS = [
  { id: 'dashboard' as const, label: '概览', description: '核心指标与全域大屏', icon: LayoutDashboard },
  { id: 'dossiers' as const, label: '卷宗管理', description: '查询、审核与重新评估', icon: FileSpreadsheet },
  { id: 'users' as const, label: '用户管理', description: '全域会员与画像详情', icon: Users },
  { id: 'banks' as const, label: '题库管理', description: '编排、发布与仿真测试', icon: Library },
  { id: 'echoes' as const, label: '回响审核', description: '自白审核与共鸣治理', icon: Flame },
  { id: 'mailbox' as const, label: '暗室信箱', description: '私密留言与1v1回响', icon: Mail },
  { id: 'telemetry' as const, label: '行为分析', description: '题目停留与作答分布', icon: Activity },
  { id: 'prompts' as const, label: '提示词配置', description: '模板版本与生效策略', icon: Sparkles },
  { id: 'tasks' as const, label: '任务记录', description: '任务接取与特殊排位', icon: Bookmark },
  { id: 'security' as const, label: '安全审计', description: '异常访问与审计链校验', icon: ShieldAlert },
  { id: 'interrogation' as const, label: '审讯室', description: '测试功能参数与最近会话', icon: Siren },
];

const TIME_RANGE_OPTIONS: AdminSelectOption<AdminTimeRange>[] = [
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季' },
  { value: 'year', label: '本年' },
  { value: 'custom', label: '指定日期' },
];

export const AdminApp: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getAdminToken()));
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalRange, setGlobalRange] = useState<AdminTimeRange>('today');
  const [globalCustomDate, setGlobalCustomDate] = useState<string>(() => {
    return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pendingCounts, setPendingCounts] = useState<{ banks: number; echoes: number; mailbox: number }>({
    banks: 0,
    echoes: 0,
    mailbox: 0,
  });

  const addToast = useCallback((type: 'success' | 'error' | 'info', content: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, content }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
      // 忽略网络瞬时抖动
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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      void fetchPendingCounts();
      const timer = setInterval(fetchPendingCounts, 20000);
      return () => clearInterval(timer);
    }
  }, [isLoggedIn, fetchPendingCounts, refreshTrigger]);

  const activeItem = useMemo(
    () => NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0],
    [activeTab]
  );

  const navigate = (tab: TabType) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const logout = () => {
    clearAdminToken();
    setIsLoggedIn(false);
  };

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    addToast('success', '运营数据已同步刷新');
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  if (!isLoggedIn) {
    return (
      <AdminLogin
        onLoginSuccess={(token) => {
          setAdminToken(token);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  const content = activeTab === 'dashboard'
    ? <Dashboard range={globalRange} customDate={globalCustomDate} refreshTrigger={refreshTrigger} onNavigateToUsers={() => navigate('users')} />
    : activeTab === 'dossiers'
      ? <DossierList refreshTrigger={refreshTrigger} onNavigateToUsers={() => navigate('users')} />
      : activeTab === 'users'
        ? <UserWorkbench refreshTrigger={refreshTrigger} />
        : activeTab === 'banks'
          ? <BankWorkbench refreshTrigger={refreshTrigger} onStatusChanged={fetchPendingCounts} />
          : activeTab === 'echoes'
            ? <EchoWorkbench refreshTrigger={refreshTrigger} onStatusChanged={fetchPendingCounts} />
            : activeTab === 'mailbox'
              ? <WhisperMailboxWorkbench onStatusChanged={fetchPendingCounts} />
              : activeTab === 'telemetry'
              ? <TelemetryStats range={globalRange} customDate={globalCustomDate} refreshTrigger={refreshTrigger} />
              : activeTab === 'prompts'
                ? <PromptWorkbench />
                : activeTab === 'tasks'
                  ? <TaskList refreshTrigger={refreshTrigger} />
                  : activeTab === 'interrogation'
                    ? <InterrogationWorkbench />
                    : <SecurityEvents refreshTrigger={refreshTrigger} />;

  return (
    <div className="admin-shell">
      <AdminToast toasts={toasts} onDismiss={dismissToast} />
      <style>{`
        .admin-nav-item-btn {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .admin-nav-pending-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 7px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(255, 112, 166, 0.25) 0%, rgba(255, 51, 119, 0.4) 100%);
          border: 1px solid rgba(255, 112, 166, 0.5);
          color: #fff;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          margin-left: auto;
          box-shadow: 0 0 10px rgba(255, 51, 119, 0.35);
          animation: admin-pulse 2.2s infinite ease-in-out;
        }
        .admin-nav-pending-badge.mailbox-badge {
          background: linear-gradient(135deg, rgba(255, 112, 166, 0.35) 0%, rgba(192, 132, 252, 0.45) 100%);
          border-color: rgba(255, 112, 166, 0.6);
          color: #ffb3d1;
          box-shadow: 0 0 10px rgba(255, 112, 166, 0.35);
        }
        .admin-nav-pending-badge.banks-badge {
          background: linear-gradient(135deg, rgba(255, 209, 128, 0.25) 0%, rgba(255, 160, 0, 0.45) 100%);
          border-color: rgba(255, 209, 128, 0.6);
          color: #ffd180;
          box-shadow: 0 0 10px rgba(255, 160, 0, 0.35);
        }
        .admin-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }
        @keyframes admin-pulse {
          0%, 100% { opacity: 0.92; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        .spin-rotate {
          animation: admin-spin-kf 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes admin-spin-kf {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'is-open' : ''}`}>
        {/* Brand Header */}
        <div className="admin-brand" style={{ padding: '1rem 1.1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <span className="admin-brand-mark" style={{ background: 'rgba(255, 112, 166, 0.15)', color: '#ff70a6', border: '1px solid rgba(255, 112, 166, 0.3)' }}>
            <ShieldCheck size={19} />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: '0.98rem', letterSpacing: '-0.01em', color: '#fff' }}>镜界自白</strong>
            <span style={{ fontSize: '0.66rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Administration
            </span>
          </div>
          <button className="admin-sidebar-close" onClick={() => setMobileMenuOpen(false)} aria-label="关闭菜单">
            <PanelLeftClose size={19} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="admin-nav" aria-label="管理中心导航" style={{ flex: 1, padding: '0.8rem 0.5rem', overflowY: 'auto' }}>
          <span className="admin-nav-section" style={{ fontSize: '0.64rem', letterSpacing: '0.1em', color: 'var(--admin-text-muted)', padding: '0.2rem 0.6rem 0.4rem' }}>
            WORKSPACE
          </span>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeTab;
            const pendingCount = item.id === 'banks'
              ? pendingCounts.banks
              : item.id === 'echoes'
                ? pendingCounts.echoes
                : item.id === 'mailbox'
                  ? pendingCounts.mailbox
                  : 0;
            return (
              <button key={item.id} className={`admin-nav-item-btn ${active ? 'is-active' : ''}`} onClick={() => navigate(item.id)}>
                <span className="admin-nav-icon"><Icon size={16} /></span>
                <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong>{item.label}</strong>
                  </span>
                  <small>{item.description}</small>
                </span>
                {pendingCount > 0 && (
                  <span className={`admin-nav-pending-badge ${item.id === 'banks' ? 'banks-badge' : item.id === 'mailbox' ? 'mailbox-badge' : ''}`}>
                    <span className="admin-badge-dot" />
                    <span>{pendingCount} {item.id === 'mailbox' ? '待回' : '待审'}</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sleek Compact Footer (Replaces bulky card) */}
        <div
          style={{
            padding: '0.65rem 0.85rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(10, 6, 14, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: 'linear-gradient(135deg, rgba(255, 112, 166, 0.2), rgba(170, 38, 218, 0.2))',
                border: '1px solid rgba(255, 112, 166, 0.35)',
                color: '#ff70a6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 800,
              }}
            >
              A
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fff0f5' }}>系统管理员</span>
              <span style={{ fontSize: '0.62rem', color: 'var(--admin-text-muted)' }}>在线</span>
            </div>
          </div>

          <button
            onClick={logout}
            title="退出登录"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 8,
              color: 'var(--admin-text-muted)',
              cursor: 'pointer',
              padding: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--admin-text-muted)')}
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {mobileMenuOpen && <button className="admin-menu-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label="关闭菜单" />}

      <div className="admin-workspace" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
        {/* Modern Top Header */}
        <header
          className="admin-topbar"
          style={{
            position: 'relative',
            zIndex: 100,
            padding: '0.65rem 1.4rem',
            borderBottom: '1px solid rgba(255, 112, 166, 0.15)',
            background: 'rgba(13, 8, 19, 0.92)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <button className="admin-mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="打开菜单">
              <Menu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', minWidth: 0 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
                管理中心 /
              </span>
              <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>
                {activeItem.label}
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Global Time Range Filter */}
            {(activeTab === 'dashboard' || activeTab === 'telemetry') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AdminSelect
                  value={globalRange}
                  options={TIME_RANGE_OPTIONS}
                  onChange={(val) => setGlobalRange(val)}
                  labelPrefix="时段:"
                  align="right"
                />
                {globalRange === 'custom' && (
                  <AdminDatePicker
                    value={globalCustomDate}
                    onChange={(date) => setGlobalCustomDate(date)}
                  />
                )}
              </div>
            )}

            {/* Refresh Button with Spinner animation */}
            <button
              type="button"
              onClick={handleManualRefresh}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 112, 166, 0.25)',
                borderRadius: 10,
                padding: '0.38rem 0.6rem',
                color: isRefreshing ? '#ff70a6' : 'var(--admin-text-secondary)',
                cursor: isRefreshing ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                outline: 'none',
              }}
              title="刷新当前数据"
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin-rotate' : ''} />
            </button>

            {/* Jump to User App */}
            <a
              href="https://secret.neural-node.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.38rem 0.75rem',
                borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(255, 112, 166, 0.15), rgba(170, 38, 218, 0.15))',
                border: '1px solid rgba(255, 112, 166, 0.3)',
                color: '#fff0f5',
                fontSize: '0.74rem',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span>体验用户端</span>
              <ExternalLink size={11} color="#ff70a6" />
            </a>
          </div>
        </header>

        <main className="admin-content" style={{ position: 'relative', zIndex: 1, padding: '1.2rem', maxWidth: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
          {content}
        </main>
      </div>
    </div>
  );
};

export default AdminApp;
