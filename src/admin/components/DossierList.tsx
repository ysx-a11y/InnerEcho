import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Trash2, Eye, ArrowUpDown, ChevronRight, ChevronDown } from 'lucide-react';
import { adminApi, formatDuration, formatTime } from '../adminApi';
import type { AdminAuditStatus, AdminDossier, DossierListParams } from '../adminTypes';
import { getQuestionnaireName } from '../adminUtils';
import { DossierDetailModal } from './DossierDetailModal';
import { RespondentProfileModal } from './RespondentProfileModal';
import { DossierFilterToolbar } from './dossier/DossierFilterToolbar';
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { AdminToast, type ToastMessage } from './ui/AdminToast';
import { AdminImageLightbox } from './ui/AdminImageLightbox';

function depthLabel(d: Pick<AdminDossier, 'depthRating'>): { text: string; bg: string; fg: string } {
  if (d.depthRating === 'deep') return { text: '深度', bg: 'rgba(255,51,119,0.12)', fg: '#ff3377' };
  if (d.depthRating === 'medium') return { text: '中度', bg: 'rgba(128,243,255,0.1)', fg: '#80f3ff' };
  return { text: '浅层', bg: 'rgba(255,255,255,0.05)', fg: '#8d879e' };
}

const STATUS_LABEL: Record<AdminAuditStatus, string> = {
  pending: '待核准',
  approved: '已核准',
  flagged: '已作废',
};

export interface UserGroupData {
  userKey: string;
  userId?: string;
  nickname: string;
  avatarUrl?: string;
  email?: string;
  deviceId?: string;
  gender?: string;
  occupation?: string;
  personaTrait?: string;
  age?: string;
  maritalStatus?: string;
  hasBoyfriend?: string;
  dossiers: AdminDossier[];
  guestDossierCount: number;
  userDossierCount: number;
  isPureGuest: boolean;
}

interface DossierListProps {
  refreshTrigger?: number;
  onNavigateToUsers?: () => void;
}

export const DossierList: React.FC<DossierListProps> = ({ refreshTrigger, onNavigateToUsers }) => {
  const [dossiers, setDossiers] = useState<AdminDossier[]>([]);
  const [bankNames, setBankNames] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [deviceUserMap, setDeviceUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toast messages
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (type: 'success' | 'error' | 'info', content: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, content }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCredibility, setFilterCredibility] = useState('all');
  const [filterDepth, setFilterDepth] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState<'submitTime' | 'credibilityScore' | 'durationSeconds'>('submitTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<AdminDossier | null>(null);
  const [selectedUserGroup, setSelectedUserGroup] = useState<UserGroupData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  // Delete confirm dialogs
  const [deleteConfirmDossierId, setDeleteConfirmDossierId] = useState<string | null>(null);
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
  const [deleteActionLoading, setDeleteActionLoading] = useState(false);

  // Group expand/collapse states
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  const load = useCallback(async (isManual = false) => {
    setLoading(true);
    setError(null);
    const params: DossierListParams = {
      search: searchTerm,
      depth: filterDepth,
      credibility: filterCredibility,
      status: filterStatus,
      sort: sortField,
      order: sortOrder,
      limit: pageSize,
      offset: page * pageSize,
    };
    try {
      const res = await adminApi.listDossiers(params);
      setDossiers(res.items);
      setTotal(res.total);
      setDeviceUserMap(res.deviceUserMap ?? {});
      if (res.bankNames) setBankNames(res.bankNames);
      setSelectedIds((prev) => prev.filter((id) => res.items.some((d) => d.id === id)));
      if (isManual) {
        addToast('success', '卷宗列表已刷新');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败';
      setError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterDepth, filterCredibility, filterStatus, sortField, sortOrder, page, pageSize]);

  // 搜索输入防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  const openDossier = async (id: string) => {
    setModalLoading(true);
    try {
      const res = await adminApi.getDossier(id);
      setSelectedDossier(res.dossier);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '加载卷宗失败');
    } finally {
      setModalLoading(false);
    }
  };

  const refreshDetail = async (id: string) => {
    if (selectedDossier?.id === id) {
      const res = await adminApi.getDossier(id);
      setSelectedDossier(res.dossier);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(0);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? dossiers.map((d) => d.id) : []);
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  const handleSelectGroup = (groupDossiers: AdminDossier[], checked: boolean) => {
    const ids = groupDossiers.map((d) => d.id);
    setSelectedIds((prev) => {
      if (checked) {
        return [...prev, ...ids.filter((id) => !prev.includes(id))];
      } else {
        return prev.filter((id) => !ids.includes(id));
      }
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setBatchDeleteConfirmOpen(true);
  };

  const executeBatchDelete = async () => {
    setDeleteActionLoading(true);
    try {
      await adminApi.batchDelete(selectedIds);
      addToast('success', `已成功物理删除 ${selectedIds.length} 份卷宗`);
      setSelectedIds([]);
      setBatchDeleteConfirmOpen(false);
      await load();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '批量删除失败');
    } finally {
      setDeleteActionLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setDeleteConfirmDossierId(id);
  };

  const executeSingleDelete = async () => {
    if (!deleteConfirmDossierId) return;
    setDeleteActionLoading(true);
    try {
      await adminApi.deleteDossier(deleteConfirmDossierId);
      addToast('success', '已成功物理删除该测评卷宗');
      setSelectedDossier(null);
      setDeleteConfirmDossierId(null);
      await load();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleteActionLoading(false);
    }
  };

  const handleUpdateDossierParams = async (id: string, updates: Partial<Pick<AdminDossier, 'auditStatus' | 'adminNotes'>>) => {
    try {
      await adminApi.updateDossier(id, updates);
      addToast('success', '卷宗信息已更新');
      await refreshDetail(id);
      await load();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '更新失败');
    }
  };

  const handleReanalyze = async (id: string) => {
    setReanalyzing(id);
    try {
      await adminApi.reanalyze(id);
      await refreshDetail(id);
      await load();
      addToast('success', 'LLM 深度心理重新评估完成');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '重新评估失败');
    } finally {
      setReanalyzing(null);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await adminApi.listDossiers({
        search: searchTerm,
        depth: filterDepth,
        credibility: filterCredibility,
        status: filterStatus,
        sort: sortField,
        order: sortOrder,
        limit: 2000,
        offset: 0,
      });
      const headers = ['提交ID', '时间', '答题用时(秒)', '称呼/姓名', '注册邮箱', '绑定设备ID', '心理深度', '可信度分', '审核状态', '真实职业', '面具特质', '隐秘渴望', '管理者备注'];
      const rows = res.items.map((d) => [
        d.id,
        formatTime(d.createdAt),
        d.durationSeconds,
        d.nickname,
        d.email ?? '',
        d.deviceId ?? '',
        d.depthRating,
        d.credibilityScore,
        d.auditStatus,
        d.q_occupation,
        d.personaTrait,
        d.q_innerDesire,
        d.adminNotes,
      ]);
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `镜界自白_卷宗表_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('success', `已成功导出 ${res.items.length} 份卷宗为 CSV`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '导出失败');
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // User Grouping logic: coalesce(user_id, device_id)
  const userGroups = React.useMemo(() => {
    // 1. Build device-to-user mappings across ALL dossiers (server-provided, 跨页生效),
    //    再以当前页数据补充兜底（例如历史数据未出现在服务端映射中）
    const deviceToUserKey = new Map<string, string>();
    for (const [deviceId, userId] of Object.entries(deviceUserMap)) {
      if (deviceId && userId) deviceToUserKey.set(deviceId, `user-${userId}`);
    }

    dossiers.forEach((d) => {
      if (d.userId && d.deviceId) {
        deviceToUserKey.set(d.deviceId, `user-${d.userId}`);
      } else if (d.email && d.deviceId && !deviceToUserKey.has(d.deviceId)) {
        deviceToUserKey.set(d.deviceId, `email-${d.email}`);
      }
    });

    const groupsMap = new Map<string, UserGroupData>();

    dossiers.forEach((d) => {
      // Group key: coalesce(user_id, device_id)
      let groupKey = '';
      if (d.userId) {
        groupKey = `user-${d.userId}`;
      } else if (d.email) {
        groupKey = `email-${d.email}`;
      } else if (d.deviceId) {
        // Coalesce: if this device is associated with a logged in user, merge into user group; otherwise group by device
        groupKey = deviceToUserKey.get(d.deviceId) || `device-${d.deviceId}`;
      } else {
        groupKey = `guest-${d.nickname || 'anonymous'}-${d.id}`;
      }

      let existing = groupsMap.get(groupKey);
      if (!existing) {
        existing = {
          userKey: groupKey,
          userId: d.userId || undefined,
          nickname: d.nickname || '匿名访客',
          avatarUrl: d.avatarUrls?.[0],
          email: d.email || undefined,
          deviceId: d.deviceId || undefined,
          gender: d.gender || undefined,
          occupation: d.occupation || undefined,
          personaTrait: d.personaTrait || undefined,
          age: d.age || undefined,
          maritalStatus: d.maritalStatus || undefined,
          hasBoyfriend: d.hasBoyfriend || undefined,
          dossiers: [],
          guestDossierCount: 0,
          userDossierCount: 0,
          isPureGuest: !d.userId && !d.email,
        };
        groupsMap.set(groupKey, existing);
      }

      // Upgrade group display info if a subsequent dossier has richer profile info
      if (d.userId && !existing.userId) existing.userId = d.userId;
      if (d.email && !existing.email) existing.email = d.email;
      if (d.avatarUrls?.[0] && !existing.avatarUrl) existing.avatarUrl = d.avatarUrls[0];
      if (d.nickname && (existing.nickname === '匿名访客' || !existing.nickname)) existing.nickname = d.nickname;
      if (d.occupation && !existing.occupation) existing.occupation = d.occupation;
      if (d.personaTrait && !existing.personaTrait) existing.personaTrait = d.personaTrait;
      if (d.gender && !existing.gender) existing.gender = d.gender;
      if (d.age && !existing.age) existing.age = d.age;
      if (d.maritalStatus && !existing.maritalStatus) existing.maritalStatus = d.maritalStatus;
      if (d.hasBoyfriend && !existing.hasBoyfriend) existing.hasBoyfriend = d.hasBoyfriend;

      const isGuest = !d.userId && !d.email;
      if (isGuest) {
        existing.guestDossierCount += 1;
      } else {
        existing.userDossierCount += 1;
        existing.isPureGuest = false;
      }

      existing.dossiers.push(d);
    });

    return Array.from(groupsMap.values());
  }, [dossiers, deviceUserMap]);

  const isExpanded = (userKey: string) => {
    if (expandedKeys[userKey] !== undefined) {
      return expandedKeys[userKey];
    }
    return isAllExpanded;
  };

  const toggleExpand = (userKey: string) => {
    setExpandedKeys((prev) => ({
      ...prev,
      [userKey]: !isExpanded(userKey),
    }));
  };

  const handleExpandAll = () => {
    setIsAllExpanded(true);
    setExpandedKeys({});
  };

  const handleCollapseAll = () => {
    setIsAllExpanded(false);
    setExpandedKeys({});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>
      {/* 顶部工具栏与过滤器 */}
      <DossierFilterToolbar
        total={total}
        selectedIdsCount={selectedIds.length}
        loading={loading}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        filterCredibility={filterCredibility}
        onFilterCredibilityChange={(val) => {
          setFilterCredibility(val);
          setPage(0);
        }}
        filterDepth={filterDepth}
        onFilterDepthChange={(val) => {
          setFilterDepth(val);
          setPage(0);
        }}
        filterStatus={filterStatus}
        onFilterStatusChange={(val) => {
          setFilterStatus(val);
          setPage(0);
        }}
        onBatchDelete={handleBatchDelete}
        onExportCSV={handleExportCSV}
        onRefresh={() => void load(true)}
        onNavigateToUsers={onNavigateToUsers}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
      />

      {/* 卷宗表格 */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          borderRadius: 16,
          overflow: 'hidden',
          overflowX: 'auto',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 112, 166, 0.15)', color: 'var(--admin-text-secondary)', background: 'rgba(255, 255, 255, 0.02)' }}>
              <th style={{ padding: '10px 8px', width: '38px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={dossiers.length > 0 && selectedIds.length === dossiers.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th style={{ padding: '8px 6px', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('submitTime')}>
                提交时间 <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </th>
              <th style={{ padding: '8px 6px', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('durationSeconds')}>
                用时 <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </th>
              <th style={{ padding: '8px 6px', fontWeight: 600 }}>卷轴名称</th>
              <th style={{ padding: '8px 6px', fontWeight: 600 }}>称呼</th>
              <th style={{ padding: '8px 6px', fontWeight: 600 }}>职业</th>
              <th style={{ padding: '8px 6px', fontWeight: 600 }}>设备ID</th>
              <th style={{ padding: '8px 6px', fontWeight: 600 }}>深度</th>
              <th style={{ padding: '8px 6px', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('credibilityScore')}>
                可信度 <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </th>
              <th style={{ padding: '8px 6px', fontWeight: 600 }}>审核</th>
              <th style={{ padding: '8px 6px', fontWeight: 600, textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: '#6e677c' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                  加载中...
                </td>
              </tr>
            ) : userGroups.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: '#6e677c' }}>
                  无匹配的卷宗数据
                </td>
              </tr>
            ) : (
              userGroups.map((g) => {
                const isGroupExpanded = isExpanded(g.userKey);
                const isGroupSelected = g.dossiers.length > 0 && g.dossiers.every((d) => selectedIds.includes(d.id));

                return (
                  <React.Fragment key={g.userKey}>
                    {/* 父级行：用户分组栏 */}
                    <tr
                      style={{
                        background: 'linear-gradient(90deg, rgba(255,112,166,0.06) 0%, rgba(170,38,218,0.04) 100%)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <input
                          type="checkbox"
                          checked={isGroupSelected}
                          onChange={(e) => handleSelectGroup(g.dossiers, e.target.checked)}
                        />
                      </td>
                      <td colSpan={5} style={{ padding: '10px 6px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <button
                            onClick={() => toggleExpand(g.userKey)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#8d879e',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {isGroupExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>

                          {/* 用户头像 (点击可打开基础信息画像) */}
                          <div
                            onClick={() => setSelectedUserGroup(g)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #ff70a6, #aa26da)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              flexShrink: 0,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: '1px solid rgba(255,112,166,0.3)',
                            }}
                            title="点击查看此填写人完整基础信息"
                          >
                            {g.avatarUrl ? (
                              <img src={g.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              g.nickname.slice(0, 1) || '匿'
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <strong
                                onClick={() => setSelectedUserGroup(g)}
                                style={{ color: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
                                title="点击查看此填写人完整基础信息"
                              >
                                {g.nickname}
                              </strong>
                              {g.email && (
                                <span style={{ color: '#ffd180', fontSize: '0.72rem', background: 'rgba(255,209,128,0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                                  {g.email}
                                </span>
                              )}
                              {g.isPureGuest ? (
                                <span style={{ color: '#ffd180', fontSize: '0.64rem', background: 'rgba(255,209,128,0.14)', border: '1px solid rgba(255,209,128,0.35)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  游客组
                                </span>
                              ) : g.guestDossierCount > 0 ? (
                                <span style={{ color: '#80f3ff', fontSize: '0.64rem', background: 'rgba(128,243,255,0.12)', border: '1px solid rgba(128,243,255,0.3)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  含同设备游客卷轴 {g.guestDossierCount} 份
                                </span>
                              ) : null}
                            </div>
                            <span style={{ color: '#6e677c', fontSize: '0.68rem', fontFamily: 'monospace' }}>
                              设备ID: {g.deviceId || '未知设备'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td colSpan={3} style={{ padding: '10px 6px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {g.gender && (
                            <span style={{ background: 'rgba(255,51,119,0.08)', color: '#ff70a6', border: '1px solid rgba(255,51,119,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem' }}>
                              性别: {g.gender}
                            </span>
                          )}
                          {g.occupation && (
                            <span style={{ background: 'rgba(128,243,255,0.06)', color: '#80f3ff', border: '1px solid rgba(128,243,255,0.12)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem' }}>
                              职业: {g.occupation}
                            </span>
                          )}
                          {g.personaTrait && (
                            <span style={{ background: 'rgba(225,0,255,0.04)', color: '#e100ff', border: '1px solid rgba(225,0,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem' }}>
                              社交形象: {g.personaTrait}
                            </span>
                          )}
                          {g.age && (
                            <span style={{ background: 'rgba(255,255,255,0.03)', color: '#8d879e', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem' }}>
                              {g.age}岁
                            </span>
                          )}
                          {g.maritalStatus && (
                            <span style={{ background: 'rgba(255,255,255,0.03)', color: '#8d879e', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem' }}>
                              婚姻: {g.maritalStatus}
                            </span>
                          )}
                          {g.hasBoyfriend && (
                            <span style={{ background: 'rgba(255,255,255,0.03)', color: '#8d879e', border: '1px solid rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem' }}>
                              伴侣: {g.hasBoyfriend}
                            </span>
                          )}
                        </div>
                      </td>
                      <td colSpan={2} style={{ padding: '10px 6px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserGroup(g);
                            }}
                            style={{
                              background: 'rgba(128, 243, 255, 0.08)',
                              color: '#80f3ff',
                              border: '1px solid rgba(128, 243, 255, 0.25)',
                              padding: '3px 9px',
                              borderRadius: '8px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                            }}
                            title="查看该填写人的第一阶段基础信息与表里自白档案"
                          >
                            <Eye size={11} />
                            <span>基础信息</span>
                          </button>
                          <span
                            onClick={() => toggleExpand(g.userKey)}
                            style={{
                              background: 'rgba(255,51,119,0.08)',
                              color: '#ff70a6',
                              border: '1px solid rgba(255,51,119,0.2)',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            共 {g.dossiers.length} 份卷轴
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* 子级行：具体测评卷轴 */}
                    {isGroupExpanded && g.dossiers.map((d) => {
                      const dl = depthLabel(d);
                      return (
                        <tr
                          key={d.id}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.02)',
                            background: 'rgba(10,8,18,0.2)',
                          }}
                        >
                          <td style={{ padding: '8px 6px', paddingLeft: '1.25rem', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#4a4458', fontSize: '0.85rem', fontFamily: 'monospace', userSelect: 'none' }}>└─</span>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(d.id)}
                                onChange={(e) => handleSelectItem(d.id, e.target.checked)}
                              />
                            </div>
                          </td>
                          <td style={{ padding: '8px 6px', color: '#ffffff', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            {formatTime(d.createdAt)}
                          </td>
                          <td style={{ padding: '8px 6px', color: '#8d879e', verticalAlign: 'middle' }}>
                            {formatDuration(d.durationSeconds)}
                          </td>
                          <td style={{ padding: '8px 6px', color: '#80f3ff', fontWeight: 600, verticalAlign: 'middle', maxWidth: '190px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={getQuestionnaireName(d, bankNames)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              {(!d.userId && !d.email) ? (
                                <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(255, 209, 128, 0.15)', color: '#ffd180', border: '1px solid rgba(255, 209, 128, 0.35)', fontWeight: 700, flexShrink: 0 }}>
                                  游客
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(79, 209, 161, 0.12)', color: '#70dcb4', border: '1px solid rgba(79, 209, 161, 0.3)', fontWeight: 700, flexShrink: 0 }}>
                                  已登录
                                </span>
                              )}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{getQuestionnaireName(d, bankNames)}</span>
                            </div>
                          </td>
                          <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ color: '#ffd180', fontWeight: 600 }}>{d.nickname || '未填'}</span>
                              {d.resonanceLevel && (
                                <span style={{ fontSize: '0.62rem', color: '#ff70a6', background: 'rgba(255,51,119,0.12)', padding: '1px 4px', borderRadius: '3px', width: 'fit-content' }}>
                                  {d.resonanceLevel === 'exact' ? '💎 90%共鸣' : d.resonanceLevel === 'partial' ? '🪞 60%契合' : d.resonanceLevel === 'guarded' ? '🛡️ 理性防备' : '✍️ 手写心声'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '8px 6px', color: '#8d879e', verticalAlign: 'middle' }}>
                            {d.occupation || '-'}
                          </td>
                          <td style={{ padding: '8px 6px', color: '#6e677c', fontFamily: 'monospace', verticalAlign: 'middle' }}>
                            {d.deviceId ? d.deviceId.slice(0, 10) + '...' : '-'}
                          </td>
                          <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', background: dl.bg, color: dl.fg }}>
                              {dl.text}
                            </span>
                          </td>
                          <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                            <span style={{ color: d.credibilityScore >= 70 ? '#4fd1a1' : d.credibilityScore >= 40 ? '#ffd180' : '#f07178', fontWeight: 600 }}>
                              {d.credibilityScore}分
                            </span>
                          </td>
                          <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: d.auditStatus === 'approved' ? 'rgba(79,209,161,0.1)' : d.auditStatus === 'flagged' ? 'rgba(240,113,120,0.1)' : 'rgba(255,209,128,0.1)',
                              color: d.auditStatus === 'approved' ? '#4fd1a1' : d.auditStatus === 'flagged' ? '#f07178' : '#ffd180',
                            }}>
                              {STATUS_LABEL[d.auditStatus]}
                            </span>
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              <button
                                onClick={() => openDossier(d.id)}
                                style={{ background: 'rgba(128,243,255,0.1)', border: '1px solid rgba(128,243,255,0.3)', color: '#80f3ff', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem' }}
                                title="查看全景卷宗详情"
                              >
                                <Eye size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                                查看
                              </button>
                              <button
                                onClick={() => handleDeleteItem(d.id)}
                                style={{ background: 'rgba(255,51,119,0.1)', border: '1px solid rgba(255,51,119,0.3)', color: '#ff3377', padding: '4px 6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem' }}
                                title="物理删除该卷宗"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页与页码 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
        <span style={{ fontSize: '0.76rem', color: '#6e677c' }}>
          共 {total} 份测评卷宗 · 当前第 {page + 1} / {pageCount} 页
        </span>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: page === 0 ? '#444' : '#9e97ad',
              padding: '5px 12px',
              borderRadius: '8px',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.76rem',
            }}
          >
            上一页
          </button>
          <span style={{ color: '#fff', fontSize: '0.76rem', padding: '0 4px' }}>
            {page + 1}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: page >= pageCount - 1 ? '#444' : '#9e97ad',
              padding: '5px 12px',
              borderRadius: '8px',
              cursor: page >= pageCount - 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.76rem',
            }}
          >
            下一页
          </button>
        </div>

        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          style={{
            background: 'rgba(10,8,18,0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '5px 10px',
            color: '#fff',
            fontSize: '0.8rem',
            outline: 'none',
            cursor: 'pointer',
            marginLeft: '0.6rem',
          }}
        >
          <option value={20}>20 条/页</option>
          <option value={50}>50 条/页</option>
          <option value={100}>100 条/页</option>
        </select>
      </div>

      {/* 填写人基础信息全景画像弹窗 */}
      <RespondentProfileModal
        userGroup={selectedUserGroup}
        bankNames={bankNames}
        onClose={() => setSelectedUserGroup(null)}
        onSelectDossier={(d) => {
          setSelectedUserGroup(null);
          openDossier(d.id);
        }}
        onZoomImage={(url: string) => setZoomedImg(url)}
      />

      {/* 用户全景审计多标签报告 Modal */}
      {selectedDossier && (
        <DossierDetailModal
          dossier={selectedDossier}
          onClose={() => setSelectedDossier(null)}
          onUpdateParams={handleUpdateDossierParams}
          onReanalyze={handleReanalyze}
          onDelete={handleDeleteItem}
          reanalyzingId={reanalyzing}
          onZoomImage={(url: string) => setZoomedImg(url)}
        />
      )}

      {/* 单个卷宗物理删除确认弹窗 */}
      <AdminConfirmDialog
        isOpen={Boolean(deleteConfirmDossierId)}
        title="物理删除卷宗记录"
        description="确认物理删除该测评卷宗吗？删除后相关深度心理倾向数据及答案记录将永久清空。"
        confirmText="确认删除"
        cancelText="取消"
        danger={true}
        loading={deleteActionLoading}
        onConfirm={executeSingleDelete}
        onCancel={() => setDeleteConfirmDossierId(null)}
      />

      {/* 批量物理删除确认弹窗 */}
      <AdminConfirmDialog
        isOpen={batchDeleteConfirmOpen}
        title="批量物理删除卷宗"
        description={`确定要永久删除选中的 ${selectedIds.length} 个卷宗吗？该操作不可逆！`}
        confirmText={`确认批量删除 (${selectedIds.length})`}
        cancelText="取消"
        danger={true}
        loading={deleteActionLoading}
        onConfirm={executeBatchDelete}
        onCancel={() => setBatchDeleteConfirmOpen(false)}
      />

      {/* 统一 Toast 提示 */}
      <AdminToast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <AdminImageLightbox imageUrl={zoomedImg} onClose={() => setZoomedImg(null)} />
    </div>
  );
};
