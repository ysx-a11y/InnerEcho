import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { adminApi, formatTime } from '../adminApi';
import type { AdminSecurityEvent, SecurityEventSeverity } from '../adminTypes';
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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listSecurityEvents({
        eventType: eventType === 'all' ? undefined : eventType,
        severity: severity === 'all' ? undefined : severity as SecurityEventSeverity,
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const severityCounts = useMemo(() => ({
    critical: events.filter((event) => event.severity === 'critical').length,
    warning: events.filter((event) => event.severity === 'warning').length,
    info: events.filter((event) => event.severity === 'info').length,
  }), [events]);

  const changeEventType = (value: string) => {
    setEventType(value);
    setPage(0);
  };
  const changeSeverity = (value: string) => {
    setSeverity(value);
    setPage(0);
  };

  return (
    <section className="security-events-page" aria-label="安全事件">
      {!chainValid && (
        <div className="security-chain-alert" role="alert">
          <AlertOctagon size={24} />
          <div>
            <strong>审计链校验失败</strong>
            <p>当前保留区间可能被修改或删除。请保留数据库与日志现场，并立即检查服务器访问记录。</p>
          </div>
        </div>
      )}

      <div className="security-event-toolbar">
        <div className="security-event-filters">
          <div className={`security-chain-status ${chainValid ? 'is-valid' : 'is-invalid'}`}>
            {chainValid ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>{chainValid ? '审计链完整' : '审计链异常'}</span>
          </div>
          <AdminSelect value={eventType} options={EVENT_FILTERS} onChange={changeEventType} labelPrefix="事件:" />
          <AdminSelect value={severity} options={SEVERITY_FILTERS} onChange={changeSeverity} labelPrefix="严重度:" />
        </div>
        <div className="security-event-summary" aria-label="当前页严重度统计">
          <span className="is-critical">严重 {severityCounts.critical}</span>
          <span className="is-warning">警告 {severityCounts.warning}</span>
          <span className="is-info">信息 {severityCounts.info}</span>
          <button type="button" onClick={() => void load()} disabled={loading} title="刷新安全事件">
            <RefreshCw size={14} className={loading ? 'admin-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="security-events-error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => void load()}>重试</button>
        </div>
      )}

      <div className="security-event-list" aria-busy={loading}>
        {loading && events.length === 0 && (
          <div className="security-events-empty"><RefreshCw size={18} className="admin-spin" /> 正在读取安全事件…</div>
        )}
        {!loading && !error && events.length === 0 && (
          <div className="security-events-empty">当前筛选条件下暂无安全事件</div>
        )}
        {events.map((event) => (
          <details key={event.id} className={`security-event-card severity-${event.severity}`}>
            <summary>
              <span className={`security-severity-badge severity-${event.severity}`}>{severityLabel(event.severity)}</span>
              <span className="security-event-main">
                <strong>{EVENT_LABELS[event.eventType] ?? event.eventType}</strong>
                <small>{event.method} {event.route} · HTTP {event.statusCode}</small>
              </span>
              <span className="security-event-source">
                <strong>{event.ipAddress}</strong>
                <small>{formatTime(event.createdAt)}</small>
              </span>
            </summary>
            <div className="security-event-details">
              <dl>
                <div><dt>请求 ID</dt><dd>{event.requestId}</dd></div>
                <div><dt>事件序号</dt><dd>#{event.sequence}</dd></div>
                <div><dt>目标</dt><dd>{[event.targetType, event.targetId].filter(Boolean).join(' / ') || '—'}</dd></div>
                <div><dt>响应字节</dt><dd>{event.responseBytes ?? '—'}</dd></div>
                <div className="is-wide"><dt>User-Agent</dt><dd>{event.userAgent || '—'}</dd></div>
                <div className="is-wide"><dt>附加元数据</dt><dd><code>{JSON.stringify(event.metadata)}</code></dd></div>
              </dl>
            </div>
          </details>
        ))}
      </div>

      <footer className="security-event-pagination">
        <span>共 {total} 条 · 第 {page + 1} / {totalPages} 页</span>
        <div>
          <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0 || loading} aria-label="上一页"><ChevronLeft size={15} /></button>
          <button type="button" onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))} disabled={page >= totalPages - 1 || loading} aria-label="下一页"><ChevronRight size={15} /></button>
        </div>
      </footer>
    </section>
  );
};
