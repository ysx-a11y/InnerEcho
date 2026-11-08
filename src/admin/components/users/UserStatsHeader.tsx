import React from 'react';
import { Users, FileText, Target, Flame, RotateCw } from 'lucide-react';
import type { AdminUserStats } from '../../adminTypes';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

interface UserStatsHeaderProps {
  stats: AdminUserStats | null;
  activeTab: 'all' | 'with_dossier' | 'without_dossier' | 'deleted';
  onTabChange: (tab: 'all' | 'with_dossier' | 'without_dossier' | 'deleted') => void;
  onRefresh: () => void;
  loading: boolean;
}

export const UserStatsHeader: React.FC<UserStatsHeaderProps> = ({
  stats,
  activeTab,
  onTabChange,
  onRefresh,
  loading,
}) => {
  const conversionRate =
    stats && stats.totalUsers > 0
      ? Math.round((stats.withDossierCount / stats.totalUsers) * 100)
      : 0;

  const filterTabs = [
    { key: 'all' as const, label: '全部用户' },
    { key: 'with_dossier' as const, label: '已填卷用户' },
    { key: 'without_dossier' as const, label: '未填卷潜客' },
    { key: 'deleted' as const, label: '已注销' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
      {/* 筛选 Tab 与紧凑指标条 */}
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={activeTab}
          onValueChange={(val) =>
            onTabChange(val as 'all' | 'with_dossier' | 'without_dossier' | 'deleted')
          }
        >
          <TabsList className="h-8">
            {filterTabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                onClick={() => onTabChange(tab.key)}
                className="text-xs px-2.5"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* 紧凑指标徽章条 (代替巨幅卡片，彻底释放垂直空间) */}
        {stats && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground ml-1">
            <span className="text-muted-foreground/40">|</span>
            <span className="inline-flex items-center gap-1">
              <span>总注册用户</span>
              <strong className="text-foreground font-mono">{(stats?.totalUsers ?? 0).toLocaleString()}</strong>
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="inline-flex items-center gap-1">
              <span>已测算卷宗</span>
              <strong className="text-foreground font-mono">{(stats?.withDossierCount ?? 0).toLocaleString()}</strong>
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="inline-flex items-center gap-1">
              <span>未答卷潜客</span>
              <strong className="text-foreground font-mono">{(stats?.withoutDossierCount ?? 0).toLocaleString()}</strong>
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="inline-flex items-center gap-1">
              <span>转化率</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{conversionRate}%</strong>
            </span>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="h-8 text-xs gap-1.5"
      >
        <RotateCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        <span>刷新画像</span>
      </Button>
    </div>
  );
};

export default UserStatsHeader;
