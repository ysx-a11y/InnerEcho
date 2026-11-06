import { getAdminToken, clearAdminToken } from './adminToken';
import type {
  AdminAuditStatus,
  AdminDossier,
  AdminOverview,
  AdminTelemetry,
  DossierListParams,
  PromptTemplate,
  AdminTaskSummary,
  AdminBankListParams,
  AdminBankSummary,
  AdminBankDetail,
  AdminBankStats,
  AdminEchoListParams,
  AdminEchoWhisper,
  AdminUserListParams,
  AdminUserSummary,
  AdminUserStats,
  AdminUserDetails,
  AdminSpecialEvaluation,
  AdminSpecialEvaluationStats,
  AdminSecurityEvent,
  AdminSecurityEventListParams,
  AdminInterrogationConfig,
  AdminInterrogationSession,
} from './adminTypes';

function buildQs(params: DossierListParams): string {
  const sp = new URLSearchParams();
  const entries: [string, string | number | undefined][] = [
    ['search', params.search],
    ['depth', params.depth],
    ['credibility', params.credibility],
    ['status', params.status],
    ['sort', params.sort],
    ['order', params.order],
    ['limit', params.limit],
    ['offset', params.offset],
  ];
  for (const [key, value] of entries) {
    if (value !== undefined && value !== '' && value !== 'all') {
      sp.set(key, String(value));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function adminFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  if (!token) {
    clearAdminToken();
    window.location.reload();
    throw new Error('管理会话缺失');
  }
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('x-admin-token', token);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, credentials: 'include' });
  } catch {
    throw new Error('网络请求失败，请检查服务状态');
  }

  if (res.status === 401 || res.status === 403) {
    clearAdminToken();
    window.location.reload();
    throw new Error('管理口令已失效，请重新登录');
  }
  if (!res.ok) {
    let msg = `请求失败 (${res.status})`;
    try {
      const payload = await res.json();
      if (payload?.message) msg = payload.message;
    } catch {
      // 非 JSON 响应，保留默认信息
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const adminApi = {
  listSecurityEvents: (params: AdminSecurityEventListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.eventType) sp.set('eventType', params.eventType);
    if (params.severity) sp.set('severity', params.severity);
    if (params.limit !== undefined) sp.set('limit', String(params.limit));
    if (params.offset !== undefined) sp.set('offset', String(params.offset));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return adminFetch<{
      success: boolean;
      events: AdminSecurityEvent[];
      total: number;
      chainValid: boolean;
    }>(`/api/admin/security-events${qs}`);
  },
  overview: (range?: string, customDate?: string) => {
    const sp = new URLSearchParams();
    if (range) sp.set('range', range);
    if (customDate) sp.set('customDate', customDate);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return adminFetch<{ success: boolean; overview: AdminOverview }>(`/api/admin/overview${qs}`);
  },
  getPendingCounts: () =>
    adminFetch<{ success: boolean; pendingCounts: { banks: number; echoes: number; mailbox?: number } }>(
      '/api/admin/pending-counts'
    ),
  listDossiers: (params: DossierListParams) =>
    adminFetch<{
      success: boolean;
      total: number;
      items: AdminDossier[];
      bankNames?: Record<string, string>;
      deviceUserMap?: Record<string, string>;
    }>(
      `/api/admin/dossiers${buildQs(params)}`
    ),
  getDossier: (id: string) =>
    adminFetch<{ success: boolean; dossier: AdminDossier }>(
      `/api/admin/dossiers/${encodeURIComponent(id)}`
    ),
  updateDossier: (id: string, patch: { auditStatus?: AdminAuditStatus; adminNotes?: string }) =>
    adminFetch<{ success: boolean; dossier: AdminDossier }>(
      `/api/admin/dossiers/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(patch) }
    ),
  deleteDossier: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/dossiers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  batchDelete: (ids: string[]) =>
    adminFetch<{ success: boolean; deleted: number }>('/api/admin/dossiers', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    }),
  reanalyze: (id: string) =>
    adminFetch<{ success: boolean; data: { archetypeTitle?: string; credibilityScore?: number }; isFallback: boolean }>(
      `/api/admin/dossiers/${encodeURIComponent(id)}/reanalyze`,
      { method: 'POST', body: JSON.stringify({}) }
    ),
  telemetry: (range?: string, customDate?: string) => {
    const sp = new URLSearchParams();
    if (range) sp.set('range', range);
    if (customDate) sp.set('customDate', customDate);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return adminFetch<{ success: boolean; telemetry: AdminTelemetry }>(`/api/admin/telemetry${qs}`);
  },
  promptTemplates: () =>
    adminFetch<{ success: boolean; items: PromptTemplate[]; activeId: string | null }>('/api/admin/prompt-templates'),
  createPromptTemplate: (input: { name: string; description: string; content: string; categories?: string[]; activate?: boolean }) =>
    adminFetch<{ success: boolean; template: PromptTemplate }>('/api/admin/prompt-templates', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updatePromptTemplate: (id: string, patch: { name?: string; description?: string; content?: string; categories?: string[] }) =>
    adminFetch<{ success: boolean; template: PromptTemplate }>(
      `/api/admin/prompt-templates/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(patch) }
    ),
  activatePromptTemplate: (id: string) =>
    adminFetch<{ success: boolean; template: PromptTemplate }>(
      `/api/admin/prompt-templates/${encodeURIComponent(id)}/activate`,
      { method: 'POST', body: JSON.stringify({}) }
    ),
  deletePromptTemplate: (id: string) =>
    adminFetch<{ success: boolean }>(
      `/api/admin/prompt-templates/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),
  listTasks: (params: { limit?: number; offset?: number; status?: string; category?: string }) => {
    const sp = new URLSearchParams();
    if (params.limit !== undefined) sp.set('limit', String(params.limit));
    if (params.offset !== undefined) sp.set('offset', String(params.offset));
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    if (params.category && params.category !== 'all') sp.set('category', params.category);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return adminFetch<{ success: boolean; total: number; items: AdminTaskSummary[] }>(`/api/admin/tasks${qs}`);
  },
  listSpecialEvaluations: (params: {
    taskType?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: 'price' | 'createdAt' | 'updatedAt';
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}) => {
    const sp = new URLSearchParams();
    if (params.taskType) sp.set('taskType', params.taskType);
    if (params.search) sp.set('search', params.search);
    if (params.minPrice !== undefined) sp.set('minPrice', String(params.minPrice));
    if (params.maxPrice !== undefined) sp.set('maxPrice', String(params.maxPrice));
    if (params.sort) sp.set('sort', params.sort);
    if (params.order) sp.set('order', params.order);
    if (params.limit !== undefined) sp.set('limit', String(params.limit));
    if (params.offset !== undefined) sp.set('offset', String(params.offset));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return adminFetch<{
      success: boolean;
      total: number;
      items: AdminSpecialEvaluation[];
      stats: AdminSpecialEvaluationStats;
    }>(`/api/admin/tasks/special-evaluations${qs}`);
  },
  listBanks: (params: AdminBankListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.search) sp.set('search', params.search);
    if (params.category && params.category !== 'all') sp.set('category', params.category);
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    if (params.source && params.source !== 'all') sp.set('source', params.source);
    if (params.sort) sp.set('sort', params.sort);
    if (params.order) sp.set('order', params.order);
    if (params.limit !== undefined) sp.set('limit', String(params.limit));
    if (params.offset !== undefined) sp.set('offset', String(params.offset));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return adminFetch<{ success: boolean; total: number; items: AdminBankSummary[]; stats: AdminBankStats }>(
      `/api/admin/banks${qs}`
    );
  },
  getBank: (id: string) =>
    adminFetch<{ success: boolean; bank: AdminBankDetail }>(
      `/api/admin/banks/${encodeURIComponent(id)}`
    ),
  createBank: (data: {
    title: string;
    subtitle?: string;
    description?: string;
    category?: 'scientific' | 'direct' | 'scenario' | 'preference';
    badgeColor?: string | null;
    estimatedMinutes?: number | null;
    questions?: unknown[];
    isPublished?: boolean;
  }) =>
    adminFetch<{ success: boolean; bank: AdminBankDetail }>('/api/admin/banks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBank: (
    id: string,
    patch: {
      title?: string;
      subtitle?: string;
      description?: string;
      category?: 'scientific' | 'direct' | 'scenario' | 'preference';
      badgeColor?: string | null;
      estimatedMinutes?: number | null;
      questions?: unknown[];
      isPublished?: boolean;
    }
  ) =>
    adminFetch<{ success: boolean; bank: AdminBankDetail }>(
      `/api/admin/banks/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(patch) }
    ),
  togglePublishBank: (id: string) =>
    adminFetch<{ success: boolean; bank: AdminBankDetail }>(
      `/api/admin/banks/${encodeURIComponent(id)}/toggle-publish`,
      { method: 'POST', body: JSON.stringify({}) }
    ),
  approveBank: (id: string) =>
    adminFetch<{ success: boolean; bank: AdminBankDetail; message?: string }>(
      `/api/admin/banks/${encodeURIComponent(id)}/approve`,
      { method: 'POST', body: JSON.stringify({}) }
    ),
  rejectBank: (id: string) =>
    adminFetch<{ success: boolean; bank: AdminBankDetail; message?: string }>(
      `/api/admin/banks/${encodeURIComponent(id)}/reject`,
      { method: 'POST', body: JSON.stringify({}) }
    ),
  deleteBank: (id: string) =>
    adminFetch<{ success: boolean; message?: string }>(
      `/api/admin/banks/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),
};

export const echoesApi = {
  listEchoes: (params: AdminEchoListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    if (params.tag && params.tag !== 'all') sp.set('tag', params.tag);
    if (params.search) sp.set('search', params.search);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.offset) sp.set('offset', String(params.offset));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return adminFetch<{ success: boolean; items: AdminEchoWhisper[]; total: number }>(
      `/api/admin/echoes${qs}`
    );
  },
  updateStatus: (id: string, auditStatus: 'pending' | 'approved' | 'rejected' | 'flagged') =>
    adminFetch<{ success: boolean; message: string }>(
      `/api/admin/echoes/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify({ auditStatus }) }
    ),
  deleteEcho: (id: string) =>
    adminFetch<{ success: boolean; message: string }>(
      `/api/admin/echoes/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),
};

export const usersApi = {
  listUsers: (params: AdminUserListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.search) sp.set('search', params.search);
    if (params.hasDossier && params.hasDossier !== 'all') sp.set('hasDossier', params.hasDossier);
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    if (params.sort) sp.set('sort', params.sort);
    if (params.order) sp.set('order', params.order);
    if (params.limit !== undefined) sp.set('limit', String(params.limit));
    if (params.offset !== undefined) sp.set('offset', String(params.offset));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return adminFetch<{
      success: boolean;
      items: AdminUserSummary[];
      total: number;
      stats: AdminUserStats;
    }>(`/api/admin/users${qs}`);
  },
  getUserDetails: (id: string) =>
    adminFetch<{ success: boolean; details: AdminUserDetails }>(
      `/api/admin/users/${encodeURIComponent(id)}`
    ),
  deleteUser: (id: string) =>
    adminFetch<{ success: boolean; deleted: boolean }>(
      `/api/admin/users/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),
};

/** ISO 时间 → 本地 'YYYY-MM-DD HH:mm:ss'。 */
export function formatTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 秒 → 'Xm Ys'。 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export interface AdminMailboxMessage {
  id: string;
  userId: string | null;
  deviceId: string;
  nickname: string;
  contactInfo: string;
  category: string;
  content: string;
  replyContent: string | null;
  repliedAt: string | null;
  userHasReadReply: boolean;
  createdAt: string;
}

export const mailboxApi = {
  listMessages: (params: { page?: number; pageSize?: number; status?: 'all' | 'pending' | 'replied' } = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.pageSize) sp.set('pageSize', String(params.pageSize));
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    const qs = sp.toString() ? '?' + sp.toString() : '';
    return adminFetch<{
      success: boolean;
      items: AdminMailboxMessage[];
      total: number;
      page: number;
      pageSize: number;
    }>('/api/admin/mailbox' + qs);
  },
  replyMessage: (id: string, replyContent: string) =>
    adminFetch<{ success: boolean; message: string }>('/api/admin/mailbox/' + encodeURIComponent(id) + '/reply', {
      method: 'POST',
      body: JSON.stringify({ replyContent }),
    }),
  deleteMessage: (id: string) =>
    adminFetch<{ success: boolean; message: string }>('/api/admin/mailbox/' + encodeURIComponent(id), {
      method: 'DELETE',
    }),
  getPendingCount: () =>
    adminFetch<{ success: boolean; count: number }>('/api/admin/mailbox/pending-count'),
};

export const interrogationApi = {
  getConfig: () =>
    adminFetch<{ success: boolean; config: AdminInterrogationConfig }>('/api/admin/interrogation/config'),
  updateConfig: (
    patch: Partial<
      Pick<
        AdminInterrogationConfig,
        'maxTurns' | 'maxInputTokens' | 'maxOutputTokens' | 'interrogatorPrompt' | 'summaryPrompt'
      >
    >,
  ) =>
    adminFetch<{ success: boolean; config: AdminInterrogationConfig }>('/api/admin/interrogation/config', {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
  listSessions: (limit = 30) =>
    adminFetch<{ success: boolean; items: AdminInterrogationSession[] }>(
      '/api/admin/interrogation/sessions?limit=' + limit
    ),
};
