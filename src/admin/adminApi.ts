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
  reanchorSecurityEvents: () => {
    return adminFetch<{ success: boolean; chainValid: boolean }>(
      '/api/admin/security-events/reanchor',
      { method: 'POST' }
    );
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
  updateStatus: (
    id: string,
    auditStatus: 'pending' | 'approved' | 'rejected' | 'flagged',
    options?: { adminNotes?: string; remark?: string }
  ) =>
    adminFetch<{ success: boolean; message: string }>(
      `/api/admin/echoes/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify({ auditStatus, ...options }) }
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

export const aiHubApi = {
  listAgents: () =>
    adminFetch<{ success: boolean; items: import('./adminTypes').AiAgentContract[] }>('/api/admin/ai/agents'),
  updateAgent: (
    id: string,
    patch: Partial<
      Pick<
        import('./adminTypes').AiAgentContract,
        'name' | 'description' | 'defaultModel' | 'temperature' | 'topP' | 'maxOutputTokens' | 'outputSchema' | 'status' | 'remark' | 'adminNotes'
      >
    >
  ) =>
    adminFetch<{ success: boolean; agent: import('./adminTypes').AiAgentContract }>(
      `/api/admin/ai/agents/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(patch) }
    ),
  listTemplates: (agentId?: string) => {
    const qs = agentId ? `?agentId=${encodeURIComponent(agentId)}` : '';
    return adminFetch<{ success: boolean; items: PromptTemplate[] }>(`/api/admin/ai/templates${qs}`);
  },
  getTemplate: (id: string) =>
    adminFetch<{ success: boolean; template: PromptTemplate }>(`/api/admin/ai/templates/${encodeURIComponent(id)}`),
  createTemplate: (input: {
    name: string;
    description: string;
    content: string;
    agentId?: string;
    categories?: string[];
    changeSummary?: string;
    remark?: string;
    adminNotes?: string;
  }) =>
    adminFetch<{ success: boolean; template: PromptTemplate }>('/api/admin/ai/templates', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateTemplate: (
    id: string,
    patch: { name?: string; description?: string; content?: string; categories?: string[]; remark?: string; adminNotes?: string }
  ) =>
    adminFetch<{ success: boolean; template: PromptTemplate }>(`/api/admin/ai/templates/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  createVersion: (
    templateId: string,
    input: {
      systemPrompt: string;
      userPromptTemplate?: string;
      modelParams?: Record<string, unknown>;
      changeSummary: string;
      remark?: string;
      adminNotes?: string;
    }
  ) =>
    adminFetch<{ success: boolean; version: import('./adminTypes').PromptVersionContract }>(
      `/api/admin/ai/templates/${encodeURIComponent(templateId)}/versions`,
      { method: 'POST', body: JSON.stringify(input) }
    ),
  listVersions: (templateId: string) =>
    adminFetch<{ success: boolean; versions: import('./adminTypes').PromptVersionContract[] }>(
      `/api/admin/ai/templates/${encodeURIComponent(templateId)}/versions`
    ),
  rollbackVersion: (
    templateId: string,
    input: { targetVersionId: string; adminNotes?: string; remark?: string }
  ) =>
    adminFetch<{ success: boolean; template: PromptTemplate; message: string }>(
      `/api/admin/ai/templates/${encodeURIComponent(templateId)}/rollback`,
      { method: 'POST', body: JSON.stringify(input) }
    ),
  activateTemplate: (id: string) =>
    adminFetch<{ success: boolean; template: PromptTemplate }>(
      `/api/admin/ai/templates/${encodeURIComponent(id)}/activate`,
      { method: 'POST', body: JSON.stringify({}) }
    ),
  deleteTemplate: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/ai/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  listVariables: (namespace?: string) => {
    const qs = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    return adminFetch<{ success: boolean; variables: import('./adminTypes').PromptVariableContract[] }>(
      `/api/admin/ai/variables${qs}`
    );
  },
  runPlayground: (data: import('./adminTypes').PlaygroundRunRequest) =>
    adminFetch<import('./adminTypes').PlaygroundRunResponse>('/api/admin/ai/playground/run', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const dictApi = {
  listTypes: () =>
    adminFetch<{ success: boolean; types: import('./adminTypes').SysDictType[] }>('/api/admin/dict/types'),
  upsertType: (input: { code: string; name: string; description?: string; remark?: string }) =>
    adminFetch<{ success: boolean; type: import('./adminTypes').SysDictType }>('/api/admin/dict/types', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteType: (code: string) =>
    adminFetch<{ success: boolean; deleted: boolean }>(`/api/admin/dict/types/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    }),
  listItems: (typeCode: string, all = false) =>
    adminFetch<{ success: boolean; items: import('./adminTypes').SysDictItem[] }>(
      `/api/admin/dict/items/${encodeURIComponent(typeCode)}${all ? '?all=1' : ''}`
    ),
  upsertItem: (input: {
    typeCode: string;
    value: string;
    label: string;
    badgeColor?: string;
    badgeVariant?: string;
    sortOrder?: number;
    isDefault?: number;
    isActive?: number;
    remark?: string;
  }) =>
    adminFetch<{ success: boolean; item: import('./adminTypes').SysDictItem }>('/api/admin/dict/items', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteItem: (typeCode: string, value: string) =>
    adminFetch<{ success: boolean; deleted: boolean }>(
      `/api/admin/dict/items/${encodeURIComponent(typeCode)}/${encodeURIComponent(value)}`,
      { method: 'DELETE' }
    ),
  listTransitions: (typeCode: string, fromValue?: string) => {
    const qs = fromValue ? `?fromValue=${encodeURIComponent(fromValue)}` : '';
    return adminFetch<{ success: boolean; transitions: import('./adminTypes').SysStateTransition[] }>(
      `/api/admin/dict/transitions/${encodeURIComponent(typeCode)}${qs}`
    );
  },
  checkTransition: (data: { typeCode: string; fromValue: string; toValue: string; role?: string }) =>
    adminFetch<{ success: boolean; isAllowed: boolean }>('/api/admin/dict/check-transition', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  upsertTransition: (data: {
    typeCode: string;
    fromValue: string;
    toValue: string;
    actionName: string;
    requiredRole?: 'user' | 'admin' | 'system';
    isAllowed?: number;
    remark?: string;
  }) =>
    adminFetch<{ success: boolean; transition: import('./adminTypes').SysStateTransition }>('/api/admin/dict/transitions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteTransition: (id: string) =>
    adminFetch<{ success: boolean; deleted: boolean }>(`/api/admin/dict/transitions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

export const lineageApi = {
  getLineage: (lineageId: string) =>
    adminFetch<{
      success: boolean;
      lineage: import('./adminTypes').AccountLineageSummary;
      generations: Array<{
        id: string;
        email: string;
        generation: number;
        accountStatus: string;
        createdAt: string;
        deletedAt: string | null;
        adminNotes: string | null;
        remark: string | null;
      }>;
    }>(`/api/admin/users/lineage/${encodeURIComponent(lineageId)}`),
  getLineageByEmail: (email: string) =>
    adminFetch<{
      success: boolean;
      lineage: import('./adminTypes').AccountLineageSummary;
      generations: Array<{
        id: string;
        email: string;
        generation: number;
        accountStatus: string;
        createdAt: string;
        deletedAt: string | null;
        adminNotes: string | null;
        remark: string | null;
      }>;
    }>(`/api/admin/users/lineage/by-email/${encodeURIComponent(email)}`),
  updateRisk: (
    lineageId: string,
    data: { riskLevel?: string; isBlocked?: number; adminNotes?: string; remark?: string }
  ) =>
    adminFetch<{ success: boolean; lineage: import('./adminTypes').AccountLineageSummary }>(
      `/api/admin/users/lineage/${encodeURIComponent(lineageId)}/risk`,
      { method: 'PUT', body: JSON.stringify(data) }
    ),
};
