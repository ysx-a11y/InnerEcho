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
  Bot,
  Sliders,
} from 'lucide-react';
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
import { AdminSelect, type AdminSelectOption } from './components/ui/AdminSelect';
import { AdminDatePicker } from './components/ui/AdminDatePicker';
import { AdminToast, type ToastMessage } from './components/ui/AdminToast';
import { clearAdminToken, getAdminToken, setAdminToken } from './adminToken';
import { adminApi } from './adminApi';
import type { AdminTimeRange } from './adminTypes';

type TabType = 'dashboard' | 'dossiers' | 'users' | 'banks' | 'echoes' | 'mailbox' | 'telemetry' | 'prompts' | 'dicts' | 'tasks' | 'security' | 'interrogation';

interface NavItem {
  id: TabType;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: '数据大盘与分析',
    items: [
      { id: 'dashboard', label: '概览大盘', description: '核心指标与全域大屏', icon: LayoutDashboard },
      { id: 'telemetry', label: '行为洞察', description: '题目停留与作答分布', icon: Activity },
    ],
  },
  {
    title: '核心业务管控',
    items: [
      { id: 'dossiers', label: '卷宗管理', description: '查询、审核与重新评估', icon: FileSpreadsheet },
      { id: 'users', label: '用户与世系', description: '全域会员与画像详情', icon: Users },
      { id: 'echoes', label: '回响审核', description: '自白审核与共鸣治理', icon: Flame },
      { id: 'mailbox', label: '暗室信箱', description: '私密留言与1v1回响', icon: Mail },
    ],
  },
  {
    title: '内容与智能体',
    items: [
      { id: 'banks', label: '题库管理', description: '编排、发布与仿真测试', icon: Library },
      { id: 'tasks', label: '任务记录', description: '任务接取与特殊排位', icon: Bookmark },
      { id: 'prompts', label: 'AI 智能体中台', description: '人设、提示词版本与沙盒演练', icon: Bot },
      { id: 'interrogation', label: '审讯室', description: '测试功能参数与最近会话', icon: Siren },
    ],
  },
  {
    title: '系统配置与安全',
    items: [
      { id: 'dicts', label: '字典与状态机', description: '全域枚举、徽章与流转规则', icon: Sliders },
      { id: 'security', label: '安全审计', description: '异常访问与审计链校验', icon: ShieldAlert },
    ],
  },
];

const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

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
                : activeTab === 'dicts'
                  ? <DictWorkbench />
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
        .admin-nav-group-title {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--admin-text-muted);
          padding: 0.65rem 0.65rem 0.3rem;
          margin-top: 0.4rem;
        }
        .admin-nav-group-title:first-of-type {
          margin-top: 0;
        }
        .admin-nav-pending-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 1px 6px;
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #fbbf24;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          margin-left: auto;
        }
        .admin-nav-pending-badge.mailbox-badge {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.4);
          color: #a5b4fc;
        }
        .admin-nav-pending-badge.banks-badge {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.4);
          color: #34d399;
        }
        .admin-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
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
        <div className="admin-brand" style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="admin-brand-mark">
            <ShieldCheck size={18} />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: '0.92rem', letterSpacing: '-0.01em', color: '#f8fafc' }}>深层回响 · 企业控制台</strong>
            <span style={{ fontSize: '0.62rem', color: 'var(--admin-text-muted)', letterSpacing: '0.04em' }}>
              Enterprise Console v2.4
            </span>
          </div>
          <button className="admin-sidebar-close" onClick={() => setMobileMenuOpen(false)} aria-label="关闭菜单">
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* Navigation Items Grouped by Domain */}
        <nav className="admin-nav" aria-label="管理中心导航" style={{ flex: 1, padding: '0.6rem 0.5rem', overflowY: 'auto' }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="admin-nav-group" style={{ marginBottom: '0.5rem' }}>
              <div className="admin-nav-group-title">{group.title}</div>
              {group.items.map((item) => {
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
            </div>
          ))}
        </nav>

        {/* Sleek Compact Footer (Replaces bulky card) */}
        <div
          style={{
            padding: '0.65rem 0.85rem',
            borderTop: '1px solid var(--admin-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(11, 15, 25, 0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: '#a5b4fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              A
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#f8fafc' }}>系统管理员</span>
              <span style={{ fontSize: '0.62rem', color: 'var(--admin-text-muted)' }}>在线 · 权限 Admin</span>
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
        {/* Modern Enterprise Top Header */}
        <header
          className="admin-topbar"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
            <button className="admin-mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="打开菜单">
              <Menu size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
                工作空间 / 核心业务管控 /
              </span>
              <h1 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#f8fafc', margin: 0, whiteSpace: 'nowrap' }}>
                {activeItem.label}
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.28)',
                  color: '#34d399',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  marginLeft: '0.4rem',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                生产环境直连 (342 份卷宗)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
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
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 8,
                padding: '0.38rem 0.65rem',
                color: isRefreshing ? '#818cf8' : 'var(--admin-text-secondary)',
                cursor: isRefreshing ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.18s ease',
                outline: 'none',
              }}
              title="刷新当前数据"
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin-rotate' : ''} />
            </button>

            {/* Jump to User App */}
            <a
              href="http://localhost:5173/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.38rem 0.75rem',
                borderRadius: 8,
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#c7d2fe',
                fontSize: '0.74rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <span>体验用户端</span>
              <ExternalLink size={11} color="#a5b4fc" />
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
