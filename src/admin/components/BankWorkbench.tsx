import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Edit3,
  Eye,
  FileEdit,
  FileText,
  HelpCircle,
  Layers,
  Library,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import { adminApi, formatTime } from '../adminApi';
import type {
  AdminBankDetail,
  AdminBankListParams,
  AdminBankStats,
  AdminBankSummary,
} from '../adminTypes';
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { AdminToast, type ToastMessage } from './ui/AdminToast';
import { BankEditorHeader } from './banks/BankEditorHeader';
import { BankEditorTabs } from './banks/BankEditorTabs';
import { DictBadge } from './ui/DictBadge';
import { adminNotify } from './ui/adminNotify';

const CATEGORY_MAP: Record<string, { label: string; desc: string; badgeColor: string }> = {
  scenario: { label: '情境切片', desc: '沉浸场景剧情与角色代入', badgeColor: '#ec4899' },
  direct: { label: '真实自白', desc: '原始倾诉与社死自白', badgeColor: '#ff3377' },
  preference: { label: '权责谱系', desc: 'BDSM / 权责与属性量表', badgeColor: '#ff70a6' },
  scientific: { label: '心相镜像', desc: '心理学机制与客观镜像', badgeColor: '#80f3ff' },
};

interface BankWorkbenchProps {
  onStatusChanged?: () => void;
  refreshTrigger?: number;
}

export const BankWorkbench: React.FC<BankWorkbenchProps> = ({ onStatusChanged, refreshTrigger }) => {
  // 列表与分页状态
  const [banks, setBanks] = useState<AdminBankSummary[]>([]);
  const [stats, setStats] = useState<AdminBankStats>({
    totalBanks: 0,
    publishedCount: 0,
    draftCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    presetCount: 0,
    customCount: 0,
    totalQuestions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 搜索与过滤
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'scientific' | 'direct' | 'scenario' | 'preference' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'draft' | 'pending' | 'approved' | 'rejected' | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'preset' | 'custom' | 'all'>('all');

  // 当前选中与编辑的题库
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentBank, setCurrentBank] = useState<AdminBankDetail | null>(null);
  const [originalBank, setOriginalBank] = useState<AdminBankDetail | null>(null);
  const [saving, setSaving] = useState(false);

  // 编辑 Tab: 'basic' | 'questions' | 'preview' | 'json'
  const [activeTab, setActiveTab] = useState<'basic' | 'questions' | 'preview' | 'json'>('basic');

  // 展开的题目索引集合
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({ 0: true });

  // 统一通用确认对话框状态
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // 统一 Toast 状态
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (type: 'success' | 'error' | 'info', content: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, content }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // JSON 导入弹窗
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // 仿真预览状态
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);

  // 计算脏状态（是否有未保存修改）
  const isDirty = useMemo(() => {
    if (!currentBank || !originalBank) return false;
    return JSON.stringify(currentBank) !== JSON.stringify(originalBank);
  }, [currentBank, originalBank]);

  // 加载题库列表
  const loadBankList = useCallback(async (preferredSelectId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: AdminBankListParams = {
        search: search.trim() || undefined,
        category: categoryFilter,
        status: statusFilter,
        source: sourceFilter,
        limit: 100,
      };
      const res = await adminApi.listBanks(params);
      setBanks(res.items);
      setStats(res.stats);

      const targetId = preferredSelectId || selectedId || res.items[0]?.id;
      if (targetId) {
        await loadBankDetail(targetId);
      } else {
        setCurrentBank(null);
        setOriginalBank(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载题库列表失败');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, sourceFilter, selectedId]);

  // 加载单个题库详情
  const loadBankDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await adminApi.getBank(id);
      setSelectedId(res.bank.id);
      setCurrentBank(JSON.parse(JSON.stringify(res.bank)));
      setOriginalBank(JSON.parse(JSON.stringify(res.bank)));
      setPreviewAnswers({});
      setPreviewQuestionIndex(0);
      setNotice(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载题库详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadBankList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, statusFilter, sourceFilter, refreshTrigger]);

  // 切换选中题库
  const handleSelectBank = (id: string) => {
    if (id === selectedId) return;
    if (isDirty) {
      setConfirmConfig({
        isOpen: true,
        title: '放弃未保存修改',
        description: '当前题库有未保存的修改，确定切换到其他题库吗？未保存的内容将丢失。',
        confirmText: '确定切换',
        danger: false,
        onConfirm: () => {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          void loadBankDetail(id);
        },
      });
      return;
    }
    void loadBankDetail(id);
  };

  // 保存题库修改
  const handleSave = async () => {
    if (!currentBank) return;
    if (currentBank.isBuiltin) {
      addToast('error', '内置预设题库受系统保护，请点击“克隆为新题库”后再进行定制修改。');
      return;
    }
    if (!currentBank.title.trim()) {
      addToast('error', '题库名称不能为空');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await adminApi.updateBank(currentBank.id, {
        title: currentBank.title.trim(),
        subtitle: currentBank.subtitle,
        description: currentBank.description,
        category: currentBank.category,
        badgeColor: currentBank.badgeColor,
        estimatedMinutes: currentBank.estimatedMinutes,
        questions: currentBank.questions,
        isPublished: currentBank.isPublished,
      });
      setCurrentBank(JSON.parse(JSON.stringify(res.bank)));
      setOriginalBank(JSON.parse(JSON.stringify(res.bank)));
      addToast('success', '题库已成功保存');
      // 同步更新列表中的概要信息
      setBanks((prev) =>
        prev.map((b) => (b.id === res.bank.id ? { ...b, ...res.bank, questionCount: res.bank.questions.length } : b))
      );
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 新建题库
  const handleCreateBank = async () => {
    const doCreate = async () => {
      setSaving(true);
      setError(null);
      try {
        const sampleQuestion = {
          id: `q_${Date.now()}_1`,
          bankId: '',
          title: '你内心中最强烈的隐秘渴望是？',
          type: 'single_choice',
          options: [
            { id: 'opt_1', text: '完全主导与掌控一切', scores: { dominance: 50, disparity: 30 }, tags: ['主导'] },
            { id: 'opt_2', text: '彻底放弃思考与臣服', scores: { submission: 50, disparity: 40 }, tags: ['臣服'] },
            { id: 'opt_3', text: '体验未知的冒险与反差', scores: { disparity: 60, chaos: 30 }, tags: ['反差'] },
          ],
          isRequired: true,
        };

        const res = await adminApi.createBank({
          title: '新建自定义题库',
          subtitle: '点击编辑副标题与描述',
          description: '请输入本题库的测评目标与适用人群说明。',
          category: 'direct',
          badgeColor: '#9333ea',
          estimatedMinutes: 5,
          questions: [sampleQuestion as any],
          isPublished: false,
        });
        addToast('success', '已成功创建新题库');
        await loadBankList();
        void loadBankDetail(res.bank.id);
        onStatusChanged?.();
      } catch (err) {
        addToast('error', err instanceof Error ? err.message : '新建题库失败');
      } finally {
        setSaving(false);
      }
    };

    if (isDirty) {
      setConfirmConfig({
        isOpen: true,
        title: '未保存内容提醒',
        description: '当前题库有未保存的修改，确定新建题库吗？未保存的内容将丢失。',
        confirmText: '确定新建',
        danger: false,
        onConfirm: () => {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          void doCreate();
        },
      });
      return;
    }
    void doCreate();
  };

  // 克隆为新题库
  const handleCloneBank = async () => {
    if (!currentBank) return;
    setSaving(true);
    setError(null);
    try {
      const clonedQuestions = (currentBank.questions || []).map((q: any, idx: number) => ({
        ...q,
        id: `q_clone_${Date.now()}_${idx + 1}`,
      }));

      const res = await adminApi.createBank({
        title: `${currentBank.title} (副本)`,
        subtitle: currentBank.subtitle,
        description: currentBank.description,
        category: currentBank.category,
        badgeColor: currentBank.badgeColor,
        estimatedMinutes: currentBank.estimatedMinutes,
        isPublished: false,
        questions: clonedQuestions,
      });

      setNotice('已成功克隆为新题库，当前处于草稿状态');
      await loadBankList(res.bank.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '克隆题库失败');
    } finally {
      setSaving(false);
    }
  };

  // 切换发布状态
  const handleTogglePublish = async () => {
    if (!currentBank) return;
    if (currentBank.isBuiltin) {
      setError('内置预设题库默认常驻发布状态');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await adminApi.togglePublishBank(currentBank.id);
      setCurrentBank((prev) => (prev ? { ...prev, isPublished: res.bank.isPublished, auditStatus: res.bank.auditStatus } : null));
      setOriginalBank((prev) => (prev ? { ...prev, isPublished: res.bank.isPublished, auditStatus: res.bank.auditStatus } : null));
      setBanks((prev) =>
        prev.map((b) => (b.id === res.bank.id ? { ...b, isPublished: res.bank.isPublished, auditStatus: res.bank.auditStatus } : b))
      );
      setNotice(res.bank.isPublished ? '题库已发布上线' : '题库已下架为草稿');
      onStatusChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换发布状态失败');
    } finally {
      setSaving(false);
    }
  };

  // 审核通过 / 驳回
  const handleAudit = async (action: 'approve' | 'reject') => {
    if (!currentBank) return;
    setSaving(true);
    setError(null);
    try {
      const res = action === 'approve'
        ? await adminApi.approveBank(currentBank.id)
        : await adminApi.rejectBank(currentBank.id);
      setCurrentBank(JSON.parse(JSON.stringify(res.bank)));
      setOriginalBank(JSON.parse(JSON.stringify(res.bank)));
      setBanks((prev) =>
        prev.map((b) => (b.id === res.bank.id ? { ...b, ...res.bank, questionCount: res.bank.questions.length } : b))
      );
      setNotice(res.message ?? (action === 'approve' ? '题库已通过审核并自动上架' : '题库已驳回'));
      onStatusChanged?.();
      void loadBankList();
    } catch (err) {
      setError(err instanceof Error ? err.message : '审核操作失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除题库
  const handleDeleteBank = async () => {
    if (!currentBank) return;
    if (currentBank.isBuiltin) {
      addToast('error', '内置预设题库受保护，不可删除');
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: '永久删除题库',
      description: `确定要永久物理删除题库《${currentBank.title}》吗？该题库下的所有题目与配置将永久清空，此操作不可恢复！`,
      confirmText: '确认删除题库',
      danger: true,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setSaving(true);
        setError(null);
        try {
          await adminApi.deleteBank(currentBank.id);
          addToast('success', '题库已成功物理删除');
          setSelectedId(null);
          onStatusChanged?.();
          await loadBankList();
        } catch (err) {
          addToast('error', err instanceof Error ? err.message : '删除题库失败');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // 题目列表操作
  const handleAddQuestion = (type: 'single_choice' | 'multiple_choice' | 'open_text' | 'media_upload') => {
    if (!currentBank) return;
    const newQId = `q_${Date.now()}_${(currentBank.questions?.length || 0) + 1}`;
    let newQuestion: any = {
      id: newQId,
      bankId: currentBank.id,
      title: '新题目描述…',
      type,
      isRequired: true,
    };

    if (type === 'single_choice' || type === 'multiple_choice') {
      newQuestion.options = [
        { id: 'opt_1', text: '选项 A', scores: { dominance: 10 }, tags: [] },
        { id: 'opt_2', text: '选项 B', scores: { submission: 10 }, tags: [] },
      ];
      if (type === 'multiple_choice') newQuestion.maxSelectCount = 2;
    } else if (type === 'open_text') {
      newQuestion.placeholder = '请输入你的自白或想法…';
      newQuestion.sparks = ['隐秘渴望', '反差体验'];
    } else if (type === 'media_upload') {
      newQuestion.mediaConfig = {
        allowedTypes: ['image', 'audio', 'video'],
        maxSizeBytes: 30 * 1024 * 1024,
        maxTotalSizeBytes: 30 * 1024 * 1024,
        maxFileCount: 3,
      };
    }

    const updatedQuestions = [...(currentBank.questions || []), newQuestion];
    setCurrentBank({ ...currentBank, questions: updatedQuestions });
    setExpandedQuestions((prev) => ({ ...prev, [updatedQuestions.length - 1]: true }));
  };

  const handleUpdateQuestion = (index: number, updated: any) => {
    if (!currentBank) return;
    const list = [...(currentBank.questions || [])];
    list[index] = updated;
    setCurrentBank({ ...currentBank, questions: list });
  };

  const handleDeleteQuestion = (index: number) => {
    if (!currentBank) return;
    const questionTitle = currentBank.questions?.[index]?.title || `第 ${index + 1} 题`;
    setConfirmConfig({
      isOpen: true,
      title: '删除测试题目',
      description: `确定要删除题目「${questionTitle}」吗？`,
      confirmText: '确认删除',
      danger: true,
      onConfirm: () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        const list = (currentBank.questions || []).filter((_, i) => i !== index);
        setCurrentBank({ ...currentBank, questions: list });
        addToast('info', '题目已从当前编辑列表移除');
      },
    });
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (!currentBank) return;
    const list = [...(currentBank.questions || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setCurrentBank({ ...currentBank, questions: list });
  };

  const handleDuplicateQuestion = (index: number) => {
    if (!currentBank) return;
    const list = [...(currentBank.questions || [])];
    const source = list[index];
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = `q_${Date.now()}_${index + 1}`;
    copy.title = `${copy.title} (复制)`;
    list.splice(index + 1, 0, copy);
    setCurrentBank({ ...currentBank, questions: list });
    setExpandedQuestions((prev) => ({ ...prev, [index + 1]: true }));
  };

  // 选项编辑方法
  const handleAddOption = (qIndex: number) => {
    if (!currentBank) return;
    const q = currentBank.questions[qIndex];
    const opts = q.options || [];
    const newOpt = {
      id: `opt_${Date.now()}_${opts.length + 1}`,
      text: `新选项 ${opts.length + 1}`,
      scores: {},
      tags: [],
    };
    handleUpdateQuestion(qIndex, { ...q, options: [...opts, newOpt] });
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, updatedOpt: any) => {
    if (!currentBank) return;
    const q = currentBank.questions[qIndex];
    const opts = [...(q.options || [])];
    opts[optIndex] = updatedOpt;
    handleUpdateQuestion(qIndex, { ...q, options: opts });
  };

  const handleDeleteOption = (qIndex: number, optIndex: number) => {
    if (!currentBank) return;
    const q = currentBank.questions[qIndex];
    const opts = (q.options || []).filter((_: any, i: number) => i !== optIndex);
    handleUpdateQuestion(qIndex, { ...q, options: opts });
  };

  // 导入 JSON
  const handleExecuteImport = async () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importJsonText);
      if (!parsed.title || !Array.isArray(parsed.questions)) {
        throw new Error('JSON 格式必须包含 title (题库名称) 和 questions (题目数组)');
      }
      setSaving(true);
      const res = await adminApi.createBank({
        title: parsed.title,
        subtitle: parsed.subtitle || '',
        description: parsed.description || '',
        category: parsed.category || 'direct',
        badgeColor: parsed.badgeColor || '#9333ea',
        estimatedMinutes: parsed.estimatedMinutes || 5,
        questions: parsed.questions,
        isPublished: Boolean(parsed.isPublished),
      });
      setImportModalOpen(false);
      setImportJsonText('');
      setNotice(`已成功导入题库《${res.bank.title}》`);
      await loadBankList(res.bank.id);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'JSON 格式解析失败，请检查语法');
    } finally {
      setSaving(false);
    }
  };

  // 导出 JSON
  const handleExportJson = () => {
    if (!currentBank) return;
    const exportData = {
      title: currentBank.title,
      subtitle: currentBank.subtitle,
      description: currentBank.description,
      category: currentBank.category,
      badgeColor: currentBank.badgeColor,
      estimatedMinutes: currentBank.estimatedMinutes,
      dimensions: currentBank.dimensions,
      questions: currentBank.questions,
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentBank.id}_${currentBank.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice('题库 JSON 文件已导出');
  };

  return (
    <div className="admin-workbench-page animate-fade-in">
      {/* 1. 顶部统计指标卡片栏 */}
      <section className="admin-stats-grid bank-stats-grid">
        <div
          className={`admin-stat-card is-clickable ${statusFilter === 'all' && sourceFilter === 'all' ? 'is-active-filter' : ''}`}
          onClick={() => { setStatusFilter('all'); setSourceFilter('all'); }}
          title="点击查看全部题库"
        >
          <span className="admin-stat-label">
            <Library size={14} color="#ff70a6" />
            <span>题库总数</span>
          </span>
          <strong className="admin-stat-value">{stats.totalBanks}</strong>
          <small className="admin-stat-sub">
            内置 <span>{stats.presetCount}</span> / 自建 <span>{stats.customCount}</span>
          </small>
        </div>

        <div
          className={`admin-stat-card is-clickable ${statusFilter === 'approved' ? 'is-active-filter' : ''}`}
          onClick={() => setStatusFilter('approved')}
          title="点击筛选已发布题库"
        >
          <span className="admin-stat-label">
            <CheckCircle2 size={14} color="var(--admin-success)" />
            <span>已发布题包</span>
          </span>
          <strong className="admin-stat-value" style={{ color: 'var(--admin-success)' }}>
            {stats.publishedCount}
          </strong>
          <small className="admin-stat-sub">可供用户端加载答题</small>
        </div>

        <div
          className={`admin-stat-card is-clickable ${statusFilter === 'pending' ? 'is-active-filter' : ''}`}
          onClick={() => setStatusFilter('pending')}
          title="点击筛选待审核题库"
        >
          <span className="admin-stat-label">
            <ShieldAlert size={14} color="#ffd180" />
            <span>待审核</span>
          </span>
          <strong className="admin-stat-value" style={{ color: '#ffd180' }}>
            {stats.pendingCount}
          </strong>
          <small className="admin-stat-sub">已驳回 <span>{stats.rejectedCount}</span> 个</small>
        </div>

        <div
          className={`admin-stat-card is-clickable ${statusFilter === 'draft' ? 'is-active-filter' : ''}`}
          onClick={() => setStatusFilter('draft')}
          title="点击筛选草稿题库"
        >
          <span className="admin-stat-label">
            <FileEdit size={14} color="var(--admin-warning)" />
            <span>草稿题包</span>
          </span>
          <strong className="admin-stat-value" style={{ color: 'var(--admin-warning)' }}>
            {stats.draftCount}
          </strong>
          <small className="admin-stat-sub">编排调试中，未公开</small>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-label">
            <Layers size={14} color="#c084fc" />
            <span>题目总题量</span>
          </span>
          <strong className="admin-stat-value" style={{ color: '#c084fc' }}>
            {stats.totalQuestions}
          </strong>
          <small className="admin-stat-sub">包含单选、多选与手填</small>
        </div>
      </section>

      {/* 2. 状态提示条 */}
      {error && (
        <div className="admin-alert admin-alert-error animate-slide-down">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button className="admin-alert-close" onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}
      {notice && (
        <div className="admin-alert admin-alert-success animate-slide-down">
          <Check size={16} />
          <span>{notice}</span>
          <button className="admin-alert-close" onClick={() => setNotice(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 3. 搜索与操作过滤栏 */}
      <section className="bank-toolbar admin-panel">
        <div className="bank-search-box">
          <Search size={16} className="bank-search-icon" />
          <input
            type="text"
            placeholder="搜索题库标题、副标题、ID 或创作者…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void loadBankList()}
          />
          {search && (
            <button className="bank-search-clear" onClick={() => { setSearch(''); void loadBankList(); }}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="bank-filter-group">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            aria-label="按分类筛选"
          >
            <option value="all">全部分类</option>
            <option value="scenario">情境切片</option>
            <option value="direct">真实自白</option>
            <option value="preference">权责谱系</option>
            <option value="scientific">心相镜像</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            aria-label="按审核状态筛选"
          >
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">未通过</option>
            <option value="draft">草稿</option>
            <option value="all">全部状态</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            aria-label="按题库来源筛选"
          >
            <option value="all">全部来源</option>
            <option value="preset">官方内置</option>
            <option value="custom">自建题库</option>
          </select>
        </div>

        <div className="bank-action-buttons">
          <button
            className="admin-button admin-button-quiet"
            onClick={() => void loadBankList(selectedId || undefined)}
            disabled={loading}
            title="刷新列表"
          >
            <RefreshCw size={15} className={loading ? 'admin-spin' : ''} />
            <span>刷新</span>
          </button>
          <button
            className="admin-button admin-button-quiet"
            onClick={() => setImportModalOpen(true)}
            title="导入 JSON 题包"
          >
            <Upload size={15} />
            <span>导入 JSON</span>
          </button>
          <button
            className="admin-button admin-button-primary"
            onClick={handleCreateBank}
            disabled={saving}
          >
            <Plus size={15} />
            <span>新建题库</span>
          </button>
        </div>
      </section>

      {/* 4. 主工作区：左侧题库列表 + 右侧详情编排区 */}
      <div className="bank-workspace-grid">
        {/* 左侧：题库列表卡片 */}
        <aside className="bank-list-sidebar admin-panel">
          <div className="admin-panel-header">
            <span className="admin-panel-title">题库清单 ({banks.length})</span>
          </div>

          <div className="bank-card-scroll-list">
            {banks.length === 0 ? (
              <div className="admin-empty-state">
                <Library size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <span>暂无符合条件的题库</span>
              </div>
            ) : (
              banks.map((bank) => {
                const isSelected = bank.id === selectedId;
                const cat = CATEGORY_MAP[bank.category] || CATEGORY_MAP.direct;
                return (
                  <div
                    key={bank.id}
                    className={`bank-list-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelectBank(bank.id)}
                  >
                    <div className="bank-item-top">
                      <span
                        className="bank-category-pill"
                        style={{ borderColor: bank.badgeColor || cat.badgeColor, color: bank.badgeColor || cat.badgeColor }}
                      >
                        {cat.label}
                      </span>
                      <div className="bank-item-tags">
                        {bank.isBuiltin ? (
                          <span className="bank-badge-preset"><Lock size={10} /> 官方内置</span>
                        ) : (
                          <DictBadge dictCode="bank_audit_status" value={bank.auditStatus || (bank.isPublished ? 'active' : 'draft')} size="xs" />
                        )}
                      </div>
                    </div>

                    <strong className="bank-item-title">{bank.title}</strong>
                    {bank.subtitle && <p className="bank-item-sub">{bank.subtitle}</p>}

                    <div className="bank-item-meta">
                      <span><strong>{bank.questionCount}</strong> 题</span>
                      {bank.estimatedMinutes && <span>约 <strong>{bank.estimatedMinutes}</strong> 分钟</span>}
                      <span>{formatTime(bank.updatedAt).slice(5, 16)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* 右侧：题库详情编辑工作区 */}
        <main className="bank-editor-main admin-panel">
          {detailLoading ? (
            <div className="admin-empty-state" style={{ minHeight: 400 }}>
              <Loader2 className="admin-spin" size={24} />
              <span>正在读取题库详细数据…</span>
            </div>
          ) : !currentBank ? (
            <div className="admin-empty-state" style={{ minHeight: 400 }}>
              <BookOpen size={36} style={{ opacity: 0.3, marginBottom: '0.8rem' }} />
              <span>请从左侧选择题库，或点击上方“新建题库”</span>
            </div>
          ) : (
            <div className="bank-editor-container">
              <BankEditorHeader
                bank={currentBank}
                isDirty={isDirty}
                saving={saving}
                onExportJson={handleExportJson}
                onCloneBank={handleCloneBank}
                onAudit={handleAudit}
                onTogglePublish={handleTogglePublish}
                onSave={handleSave}
                onDelete={handleDeleteBank}
              />
              <BankEditorTabs
                bank={currentBank}
                onBankChange={setCurrentBank}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                expandedQuestions={expandedQuestions}
                onExpandedQuestionsChange={setExpandedQuestions}
                onAddQuestion={handleAddQuestion}
                onUpdateQuestion={handleUpdateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
                onMoveQuestion={handleMoveQuestion}
                onDuplicateQuestion={handleDuplicateQuestion}
                onAddOption={handleAddOption}
                onUpdateOption={handleUpdateOption}
                onDeleteOption={handleDeleteOption}
                previewAnswers={previewAnswers}
                onPreviewAnswersChange={setPreviewAnswers}
                previewQuestionIndex={previewQuestionIndex}
                onPreviewQuestionIndexChange={setPreviewQuestionIndex}
                onNotice={setNotice}
              />
            </div>
          )}
        </main>
      </div>

      {/* 5. 导入 JSON 模态弹窗 */}
      {importModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setImportModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="admin-modal-header">
              <div className="admin-modal-title">
                <Upload size={18} />
                <span>批量导入题库 (JSON)</span>
              </div>
              <button className="admin-modal-close" onClick={() => setImportModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.86rem', marginBottom: '0.75rem' }}>
                请将包含 <code>title</code> 与 <code>questions</code> 数组的合法题库 JSON 粘贴到下方：
              </p>

              {importError && (
                <div className="admin-alert admin-alert-error" style={{ marginBottom: '0.75rem' }}>
                  <AlertTriangle size={15} />
                  <span>{importError}</span>
                </div>
              )}

              <textarea
                className="admin-import-textarea"
                rows={12}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder={`{\n  "title": "新测试题库",\n  "subtitle": "副标题",\n  "category": "direct",\n  "questions": [\n    {\n      "id": "q1",\n      "title": "问题文本",\n      "type": "single_choice",\n      "options": [\n        { "id": "opt1", "text": "选项A", "scores": { "dominance": 10 } }\n      ]\n    }\n  ]\n}`}
              />
            </div>

            <div className="admin-modal-footer">
              <button className="admin-button admin-button-quiet" onClick={() => setImportModalOpen(false)}>
                取消
              </button>
              <button
                className="admin-button admin-button-primary"
                onClick={handleExecuteImport}
                disabled={saving || !importJsonText.trim()}
              >
                {saving ? <Loader2 className="admin-spin" size={14} /> : <Upload size={14} />}
                <span>确认导入</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 统一确认对话框 */}
      <AdminConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        danger={confirmConfig.danger}
        loading={saving}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 7. 统一 Toast 提示 */}
      <AdminToast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};

export default BankWorkbench;
