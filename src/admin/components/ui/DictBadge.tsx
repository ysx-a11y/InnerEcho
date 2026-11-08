import React, { useEffect, useState } from 'react';
import type { SysDictItem } from '../../../../shared/apiContracts';
import { getAdminToken } from '../../adminToken';
import { cn } from '../../lib/utils';

export interface DictBadgeProps {
  dictCode: string;
  value: string | undefined | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: string;
  fallbackLabel?: string;
  className?: string;
}

const dictCache = new Map<string, SysDictItem[]>();
const pendingFetches = new Map<string, Promise<SysDictItem[]>>();

const STATIC_DICT_DEFAULTS: Record<string, Record<string, { label: string; color: string }>> = {
  user_account_status: {
    active: { label: '正常活跃', color: 'teal' },
    muted: { label: '禁言受限', color: 'yellow' },
    suspended: { label: '账号封禁', color: 'red' },
    deleted: { label: '已注销', color: 'gray' },
  },
  echo_audit_status: {
    pending: { label: '待审核', color: 'yellow' },
    approved: { label: '公开展示', color: 'teal' },
    rejected: { label: '违规驳回', color: 'red' },
    hidden: { label: '隐退下架', color: 'gray' },
  },
  bank_audit_status: {
    draft: { label: '草稿编写', color: 'gray' },
    pending_review: { label: '提交审核', color: 'blue' },
    active: { label: '正式上线', color: 'teal' },
    archived: { label: '下线归档', color: 'violet' },
    disabled: { label: '强制停用', color: 'red' },
  },
  dossier_audit_status: {
    draft: { label: '测评中', color: 'gray' },
    sealed: { label: '绝密封存', color: 'teal' },
    archived: { label: '历史归档', color: 'violet' },
  },
  task_progress_status: {
    available: { label: '待接取', color: 'blue' },
    accepted: { label: '修行中', color: 'yellow' },
    submitted: { label: '已提交待验', color: 'indigo' },
    verified: { label: '达成通过', color: 'teal' },
    rejected: { label: '未达标驳回', color: 'red' },
    expired: { label: '已逾期失效', color: 'gray' },
  },
  interrogation_status: {
    active: { label: '审讯交锋中', color: 'teal' },
    completed: { label: '圆满达成', color: 'blue' },
    terminated: { label: '异常熔断', color: 'red' },
  },
};

function getColorClasses(color: string): string {
  switch (color) {
    case 'teal':
    case 'green':
    case 'emerald':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25';
    case 'yellow':
    case 'amber':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25';
    case 'red':
    case 'rose':
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25';
    case 'blue':
    case 'indigo':
    case 'cyan':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25';
    case 'violet':
    case 'purple':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25';
    case 'gray':
    default:
      return 'bg-muted/60 text-muted-foreground border-border';
  }
}

function getSizeClasses(size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string {
  switch (size) {
    case 'xs':
      return 'px-1.5 py-0.25 text-[10px] leading-tight';
    case 'md':
      return 'px-2.5 py-0.75 text-xs';
    case 'lg':
      return 'px-3 py-1 text-sm';
    case 'sm':
    default:
      return 'px-2 py-0.5 text-[11px] leading-snug';
  }
}

export const DictBadge: React.FC<DictBadgeProps> = ({
  dictCode,
  value,
  size = 'sm',
  fallbackLabel,
  className,
}) => {
  const [items, setItems] = useState<SysDictItem[]>(() => dictCache.get(dictCode) ?? []);

  useEffect(() => {
    if (!dictCode || dictCache.has(dictCode)) return;

    if (!pendingFetches.has(dictCode)) {
      const token = getAdminToken();
      const fetchPromise = (typeof fetch === 'function'
        ? fetch(`/api/admin/dict/items/${dictCode}`, {
            headers: token ? { 'x-admin-token': token } : {},
          })
        : Promise.reject()
      )
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Fetch failed'))))
        .then((data: { success: boolean; items: SysDictItem[] }) => {
          if (data?.success && Array.isArray(data.items)) {
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

    pendingFetches.get(dictCode)?.then((res) => {
      if (res && res.length > 0) {
        setItems(res);
      }
    });
  }, [dictCode]);

  if (!value) {
    return (
      <span
        className={cn(
          'inline-flex items-center font-medium rounded-full border border-border bg-muted/40 text-muted-foreground',
          getSizeClasses(size),
          className
        )}
      >
        {fallbackLabel ?? '-'}
      </span>
    );
  }

  // 1. 优先从动态拉取的字典项中匹配
  const item = items.find((i) => i.value === value);
  if (item) {
    return (
      <span
        title={item.remark ?? undefined}
        className={cn(
          'inline-flex items-center font-medium rounded-full border transition-colors',
          getColorClasses(item.badgeColor || 'gray'),
          getSizeClasses(size),
          className
        )}
      >
        {item.label || value}
      </span>
    );
  }

  // 2. 兜底从静态内置配置匹配
  const staticFallback = STATIC_DICT_DEFAULTS[dictCode]?.[value];
  if (staticFallback) {
    return (
      <span
        className={cn(
          'inline-flex items-center font-medium rounded-full border transition-colors',
          getColorClasses(staticFallback.color),
          getSizeClasses(size),
          className
        )}
      >
        {staticFallback.label}
      </span>
    );
  }

  // 3. 终极兜底
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border border-border bg-muted/40 text-muted-foreground',
        getSizeClasses(size),
        className
      )}
    >
      {fallbackLabel ?? value}
    </span>
  );
};

export default DictBadge;
