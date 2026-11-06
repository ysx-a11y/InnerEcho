import { useEffect, useMemo, useState } from 'react';
import type { BankCompletionEntryContract, SessionUser } from '../../shared/apiContracts';
import { apiGet } from '../utils/api';

export type BankCompletionStatus = 'syncing' | 'ready' | 'error';

interface UseBankCompletionOptions {
  user: SessionUser | null;
  /** 变化时重新拉取（例如刚保存了一份新卷宗）。 */
  refreshKey?: string;
}

interface UseBankCompletionResult {
  counts: Record<string, number>;
  entries: BankCompletionEntryContract[];
  status: BankCompletionStatus;
}

/**
 * 题库完成情况：登录用户按账号、匿名访客按设备标识（服务端聚合）。
 * 返回的只有题库 ID、次数与首末时间，不落地任何报告内容。
 */
export function useBankCompletion({ user, refreshKey = '' }: UseBankCompletionOptions): UseBankCompletionResult {
  const [entries, setEntries] = useState<BankCompletionEntryContract[]>([]);
  const [status, setStatus] = useState<BankCompletionStatus>('syncing');
  // 访客身份由 apiFetch 自动附带 X-Device-Id；这里只需要一个稳定的重新拉取键。
  const ownerKey = user?.id ?? 'guest';

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    setStatus('syncing');

    void apiGet<{ success: boolean; completions?: BankCompletionEntryContract[] }>('/api/banks/completion', {
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!active) return;
        if (!data.success) {
          setStatus('error');
          return;
        }
        setEntries(data.completions ?? []);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [ownerKey, refreshKey]);

  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const entry of entries) next[entry.bankId] = entry.count;
    return next;
  }, [entries]);

  return { counts, entries, status };
}
