import React, { useEffect, useState } from 'react';
import { Badge, type BadgeVariant } from '@mantine/core';
import type { SysDictItem } from '../../../../shared/apiContracts';

interface DictBadgeProps {
  dictCode: string;
  value: string | undefined | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: BadgeVariant;
  fallbackLabel?: string;
}

/** 静态缓存避免重复网络请求 */
const dictCache = new Map<string, SysDictItem[]>();
const pendingFetches = new Map<string, Promise<SysDictItem[]>>();

/** 内置默认映射表，保证首屏秒开零闪烁 */
const STATIC_DICT_DEFAULTS: Record<string, Record<string, { label: string; color: string; variant?: BadgeVariant }>> = {
  user_account_status: {
    active: { label: '正常活跃', color: 'teal', variant: 'light' },
    muted: { label: '禁言受限', color: 'yellow', variant: 'light' },
    suspended: { label: '账号封禁', color: 'red', variant: 'filled' },
    deleted: { label: '已注销', color: 'gray', variant: 'outline' },
  },
  echo_audit_status: {
    pending: { label: '待审核', color: 'yellow', variant: 'light' },
    approved: { label: '公开展示', color: 'teal', variant: 'light' },
    rejected: { label: '违规驳回', color: 'red', variant: 'light' },
    hidden: { label: '隐退下架', color: 'gray', variant: 'outline' },
  },
  bank_audit_status: {
    draft: { label: '草稿编写', color: 'gray', variant: 'light' },
    pending_review: { label: '提交审核', color: 'blue', variant: 'light' },
    active: { label: '正式上线', color: 'teal', variant: 'light' },
    archived: { label: '下线归档', color: 'violet', variant: 'light' },
    disabled: { label: '强制停用', color: 'red', variant: 'filled' },
  },
  dossier_audit_status: {
    draft: { label: '测评中', color: 'gray', variant: 'light' },
    sealed: { label: '绝密封存', color: 'teal', variant: 'light' },
    archived: { label: '历史归档', color: 'violet', variant: 'light' },
  },
  task_progress_status: {
    available: { label: '待接取', color: 'blue', variant: 'light' },
    accepted: { label: '修行中', color: 'yellow', variant: 'light' },
    submitted: { label: '已提交待验', color: 'indigo', variant: 'light' },
    verified: { label: '达成通过', color: 'teal', variant: 'light' },
    rejected: { label: '未达标驳回', color: 'red', variant: 'light' },
    expired: { label: '已逾期失效', color: 'gray', variant: 'outline' },
  },
  interrogation_status: {
    active: { label: '审讯交锋中', color: 'teal', variant: 'light' },
    completed: { label: '圆满达成', color: 'blue', variant: 'light' },
    terminated: { label: '异常熔断', color: 'red', variant: 'filled' },
  },
};

class SafeBadgeBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export const DictBadge: React.FC<DictBadgeProps> = ({
  dictCode,
  value,
  size = 'sm',
  variant,
  fallbackLabel,
}) => {
  const [items, setItems] = useState<SysDictItem[]>(() => dictCache.get(dictCode) ?? []);

  useEffect(() => {
    if (!dictCode || dictCache.has(dictCode)) return;

    if (!pendingFetches.has(dictCode)) {
      const fetchPromise = (typeof fetch === 'function' ? fetch(`/api/admin/dict/items/${dictCode}`) : Promise.reject())
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Fetch failed'))))
        .then((data: { success: boolean; items: SysDictItem[] }) => {
          if (data.success && Array.isArray(data.items)) {
            dictCache.set(dictCode, data.items);
            return data.items;
          }
          return [];
        })
        .catch(() => [])
        .finally(() => {
          pendingFetches.delete(dictCode);
        });

      pendingFetches.set(dictCode, fetchPromise);
    }

    pendingFetches.get(dictCode)?.then((resItems) => {
      setItems(resItems);
    });
  }, [dictCode]);

  const displayLabel = (() => {
    if (!value) return fallbackLabel ?? '-';
    const item = items.find((i) => i.value === value);
    if (item) return item.label || value;
    const staticFallback = STATIC_DICT_DEFAULTS[dictCode]?.[value];
    if (staticFallback) return staticFallback.label;
    return fallbackLabel ?? value;
  })();

  const rawFallback = (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: '0.72rem',
        fontWeight: 600,
        background: 'rgba(255, 255, 255, 0.08)',
        color: '#fff',
      }}
    >
      {displayLabel}
    </span>
  );

  if (!value) {
    return (
      <SafeBadgeBoundary fallback={rawFallback}>
        <Badge color="gray" variant="subtle" size={size}>
          {fallbackLabel ?? '-'}
        </Badge>
      </SafeBadgeBoundary>
    );
  }

  // 1. 优先从动态拉取的字典项中匹配
  const item = items.find((i) => i.value === value);
  if (item) {
    return (
      <SafeBadgeBoundary fallback={rawFallback}>
        <Badge
          color={item.badgeColor || 'gray'}
          variant={variant ?? (item.badgeVariant as BadgeVariant) ?? 'light'}
          size={size}
          title={item.remark ?? undefined}
        >
          {item.label || value}
        </Badge>
      </SafeBadgeBoundary>
    );
  }

  // 2. 兜底从静态内置配置匹配
  const staticFallback = STATIC_DICT_DEFAULTS[dictCode]?.[value];
  if (staticFallback) {
    return (
      <SafeBadgeBoundary fallback={rawFallback}>
        <Badge
          color={staticFallback.color}
          variant={variant ?? staticFallback.variant ?? 'light'}
          size={size}
        >
          {staticFallback.label}
        </Badge>
      </SafeBadgeBoundary>
    );
  }

  // 3. 终极兜底
  return (
    <SafeBadgeBoundary fallback={rawFallback}>
      <Badge color="gray" variant={variant ?? 'light'} size={size}>
        {fallbackLabel ?? value}
      </Badge>
    </SafeBadgeBoundary>
  );
};
