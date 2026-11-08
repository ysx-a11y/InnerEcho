import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { adminApi, formatTime } from '../adminApi';
import type { AdminSecurityEvent, SecurityEventSeverity } from '../adminTypes';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { adminNotify } from './ui/adminNotify';
import { AdminSelect, type AdminSelectOption } from './ui/AdminSelect';

const PAGE_SIZE = 30;

const EVENT_FILTERS: AdminSelectOption[] = [
  { value: 'all', label: '全部事件' },
  { value: 'admin_new_source', label: '新管理来源' },
  { value: 'admin_auth_failure_burst', label: '登录失败突发' },
  { value: 'admin_read_burst', label: '敏感读取突发' },
  { value: 'honeypot_permanent_ban', label: '蜜罐永久封禁' },
];

const SEVERITY_FILTERS: AdminSelectOption[] = [
  { value: 'all', label: '全部严重度' },
  { value: 'critical', label: '严重' },
  { value: 'warning', label: '警告' },
  { value: 'info', label: '信息' },
];

const EVENT_LABELS: Record<string, string> = {
  admin_auth_success: '管理登录成功',
  admin_auth_failure: '管理登录失败',
  admin_access_denied: '管理访问被拒',
  admin_probe: '管理路径探测',
  admin_mutation: '管理数据变更',
  admin_sensitive_read: '敏感管理读取',
  admin_audit_read: '安全审计读取',
  admin_new_source: '新管理来源',
  admin_auth_failure_burst: '登录失败突发',
  admin_read_burst: '敏感读取突发',
  honeypot_permanent_ban: '蜜罐永久封禁',
};

function severityLabel(severity: SecurityEventSeverity): string {
  return severity === 'critical' ? '严重' : severity === 'warning' ? '警告' : '信息';
}

function severityVariant(severity: SecurityEventSeverity): 'destructive' | 'secondary' | 'outline' {
  if (severity === 'critical') return 'destructive';
  return 'secondary';
}

interface SecurityEventsProps {
  refreshTrigger: number;
}

export const SecurityEvents: React.FC<SecurityEventsProps> = ({ refreshTrigger }) => {
  const [events, setEvents] = useState<AdminSecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [chainValid, setChainValid] = useState(true);
  const [eventType, setEventType] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reanchoring, setReanchoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listSecurityEvents({
        eventType: eventType === 'all' ? undefined : eventType,
        severity: severity === 'all' ? undefined : (severity as SecurityEventSeverity),
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setEvents(result.events);
      setTotal(result.total);
      setChainValid(result.chainValid);
    } catch (err) {
      setError(err instanceof Error ? err.message : '安全事件加载失败');
    } finally {
      setLoading(false);
    }
  }, [eventType, severity, page]);

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  const handleReanchor = async () => {
    setReanchoring(true);
    try {
      const res = await adminApi.reanchorSecurityEvents();
      if (res.success && res.chainValid) {
        setChainValid(true);
        adminNotify.success('审计链哈希边界重锚成功，链条已验证为完整');
        void load();
      } else {
        adminNotify.error('重锚后哈希校验仍不匹配，请检查底层日志');
      }
    } catch (err) {
      adminNotify.error(err instanceof Error ? err.message : '重锚操作失败');
    } finally {
      setReanchoring(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const severityCounts = useMemo(
    () => ({
      critical: events.filter((event) => event.severity === 'critical').length,
      warning: events.filter((event) => event.severity === 'warning').length,
      info: events.filter((event) => event.severity === 'info').length,
    }),
    [events]
  );

  const changeEventType = (value: string) => {
    setEventType(value);
    setPage(0);
  };
  const changeSeverity = (value: string) => {
    setSeverity(value);
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-7xl mx-auto" aria-label="安全事件">
      {/* 1. 紧凑告警栏 (仅异常时展示) */}
      {!chainValid && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs"
        >
          <div className="flex items-center gap-2">
            <AlertOctagon className="size-3.5 shrink-0" />
            <strong className="font-semibold">审计链校验失败</strong>
            <span className="text-[11px] text-destructive/80 hidden sm:inline">
              当前保留区间可能被修改或删除。请保留数据库与日志现场，并立即检查服务器访问记录。
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={reanchoring}
            onClick={handleReanchor}
            className="h-6 text-[11px] px-2.5 gap-1 shrink-0"
          >
            <ShieldCheck className="size-3" />
            <span>{reanchoring ? '重锚中…' : '一键重校重锚'}</span>
          </Button>
        </div>
      )}

      {/* 2. 紧凑单行集成控制与过滤栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={chainValid ? 'outline' : 'destructive'}
            className="flex items-center gap-1.5 h-8 px-2.5 font-medium text-xs"
          >
            {chainValid ? (
              <CheckCircle2 className="size-3.5 text-emerald-500" />
            ) : (
              <AlertTriangle className="size-3.5" />
            )}
            <span>{chainValid ? '审计链完整' : '审计链异常'}</span>
          </Badge>

          <AdminSelect
            value={eventType}
            options={EVENT_FILTERS}
            onChange={changeEventType}
            labelPrefix="事件:"
          />
          <AdminSelect
            value={severity}
            options={SEVERITY_FILTERS}
            onChange={changeSeverity}
            labelPrefix="严重度:"
          />
        </div>

        <div className="flex items-center gap-2 text-xs" aria-label="当前页严重度统计">
          <div className="hidden sm:flex items-center gap-1.5">
            <Badge variant="destructive" className="h-6 px-1.5 text-[10px]">
              严重 {severityCounts.critical}
            </Badge>
            <Badge variant="secondary" className="h-6 px-1.5 text-[10px] text-amber-600 dark:text-amber-400">
              警告 {severityCounts.warning}
            </Badge>
            <Badge variant="outline" className="h-6 px-1.5 text-[10px] text-muted-foreground">
              信息 {severityCounts.info}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            title="刷新安全事件"
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </Button>
        </div>
      </div>

      {/* 3. 报错提示 */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between p-2.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} className="h-6 text-xs px-2">
            重试
          </Button>
        </div>
      )}

      {/* 4. 高密度统一事件流容器 */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        {loading && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2 text-xs">
            <RefreshCw className="size-4 animate-spin text-primary" />
            <span>正在读取安全事件…</span>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-xs">
            当前筛选条件下暂无安全事件
          </div>
        )}

        <div className="divide-y divide-border/80 border-t border-border/80" aria-busy={loading}>
          {events.map((event) => {
            const isCrit = event.severity === 'critical';
            const isWarn = event.severity === 'warning';
            return (
              <details
                key={event.id}
                className={`group transition-colors bg-card hover:bg-muted/40 border-l-4 ${
                  isCrit
                    ? 'border-l-destructive'
                    : isWarn
                    ? 'border-l-amber-500'
                    : 'border-l-sky-500/50'
                }`}
              >
                <summary className="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer select-none list-none text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ChevronRight className="size-3 text-muted-foreground group-open:rotate-90 transition-transform shrink-0" />
                    <Badge
                      variant={severityVariant(event.severity)}
                      className={`text-[10px] px-1.5 h-4.5 shrink-0 ${
                        isWarn ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' : ''
                      }`}
                    >
                      {severityLabel(event.severity)}
                    </Badge>
                    <strong className="text-xs font-semibold text-foreground truncate">
                      {EVENT_LABELS[event.eventType] ?? event.eventType}
                    </strong>
                    <span className="text-[11px] text-muted-foreground font-mono hidden md:inline truncate">
                      {event.method} {event.route} · HTTP {event.statusCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground shrink-0">
                    <span className="text-foreground">{event.ipAddress}</span>
                    <span>{formatTime(event.createdAt)}</span>
                  </div>
                </summary>

                <div className="px-4 pb-3 pt-1 bg-muted/20 border-t border-border/40 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 py-1.5 text-muted-foreground">
                    <div>
                      <span className="text-muted-foreground/70 block text-[10px]">请求 ID</span>
                      <code className="text-foreground font-mono text-xs">{event.requestId}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground/70 block text-[10px]">事件序号</span>
                      <span className="text-foreground font-semibold">#{event.sequence}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground/70 block text-[10px]">目标</span>
                      <span className="text-foreground">{[event.targetType, event.targetId].filter(Boolean).join(' / ') || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground/70 block text-[10px]">响应字节</span>
                      <span className="text-foreground font-mono">{event.responseBytes ?? '—'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground/70 block text-[10px]">User-Agent</span>
                      <span className="text-foreground truncate block font-mono text-[11px]">{event.userAgent || '—'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground/70 block text-[10px]">附加元数据</span>
                      <pre className="text-foreground font-mono text-[11px] bg-muted/50 p-2 rounded-md overflow-x-auto mt-0.5">
                        <code>{JSON.stringify(event.metadata)}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>

        {/* 紧凑分页控制栏 */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-border/60 text-xs text-muted-foreground">
          <span>共 {total} 条 · 第 {page + 1} / {totalPages} 页</span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={page === 0 || loading}
              aria-label="上一页"
              className="h-7 px-2"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
              disabled={page >= totalPages - 1 || loading}
              aria-label="下一页"
              className="h-7 px-2"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
