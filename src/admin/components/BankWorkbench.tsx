import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  FileEdit,
  Layers,
  Library,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';

const CATEGORY_MAP: Record<string, { label: string; desc: string }> = {
  scenario: { label: '情境切片', desc: '沉浸场景剧情与角色代入' },
  direct: { label: '真实自白', desc: '原始倾诉与社死自白' },
  preference: { label: '权责谱系', desc: 'BDSM / 权责与属性量表' },
  scientific: { label: '心相镜像', desc: '心理学机制与客观镜像' },
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
  }, [search, categoryFilter, sourceFilter, selectedId]);

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
  }, [categoryFilter, sourceFilter, refreshTrigger]);

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

  // 题目操作
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

  // 导出 JSON
  const handleExportJson = () => {
    if (!currentBank) return;
    const blob = new Blob([JSON.stringify(currentBank, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank_${currentBank.id}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', '题库 JSON 导出成功');
  };

  // 执行 JSON 导入
  const handleExecuteImport = async () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importJsonText);
      if (!parsed.title || !Array.isArray(parsed.questions)) {
        throw new Error('JSON 格式不符：必须包含 title 字符串与 questions 数组');
      }

      setSaving(true);
      const res = await adminApi.createBank({
        title: parsed.title,
        subtitle: parsed.subtitle,
        description: parsed.description,
        category: parsed.category || 'direct',
        badgeColor: parsed.badgeColor || '#ec4899',
        estimatedMinutes: parsed.estimatedMinutes || 8,
        questions: parsed.questions,
        isPublished: false,
      });

      addToast('success', `成功导入题库《${res.bank.title}》`);
      setImportModalOpen(false);
      setImportJsonText('');
      await loadBankList(res.bank.id);
      onStatusChanged?.();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'JSON 解析或导入失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-7xl mx-auto h-[calc(100vh-100px)] min-h-[580px]">
      {/* 1. 状态提示 */}
      {error && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="size-6 p-0">
            <X className="size-3.5" />
          </Button>
        </div>
      )}
      {notice && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs">
          <div className="flex items-center gap-2">
            <Check className="size-4 shrink-0" />
            <span>{notice}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setNotice(null)} className="size-6 p-0">
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {/* 2. 紧凑操作与检索工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-0.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">题库管理</span>
          <Badge variant="outline" className="text-xs">
            共 {banks.length} 个题库
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 搜索框 */}
          <div className="relative w-44 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索标题、ID、标签..."
              className="flex h-8 w-full rounded-md border border-input bg-background pl-8 pr-7 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void loadBankList()}
            />
            {search && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => { setSearch(''); void loadBankList(); }}
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* 分类筛选 (标准 shadcn Select) */}
          <Select
            value={categoryFilter}
            onValueChange={(val) => setCategoryFilter(val as any)}
          >
            <SelectTrigger size="sm" className="h-8 w-[120px] text-xs bg-background">
              <SelectValue placeholder="全部分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              <SelectItem value="scenario">情境切片</SelectItem>
              <SelectItem value="direct">真实自白</SelectItem>
              <SelectItem value="preference">权责谱系</SelectItem>
              <SelectItem value="scientific">心相镜像</SelectItem>
            </SelectContent>
          </Select>

          {/* 来源筛选 (标准 shadcn Select) */}
          <Select
            value={sourceFilter}
            onValueChange={(val) => setSourceFilter(val as any)}
          >
            <SelectTrigger size="sm" className="h-8 w-[110px] text-xs bg-background">
              <SelectValue placeholder="全部来源" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部来源</SelectItem>
              <SelectItem value="preset">官方内置</SelectItem>
              <SelectItem value="custom">自建题库</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadBankList(selectedId || undefined)}
            disabled={loading}
            title="刷新列表"
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            title="导入 JSON 题包"
            className="h-8 gap-1.5 text-xs"
          >
            <Upload className="size-3.5" />
            <span>导入 JSON</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleCreateBank}
            disabled={saving}
            className="h-8 gap-1.5 text-xs"
          >
            <Plus className="size-3.5" />
            <span>新建题库</span>
          </Button>
        </div>
      </div>

      {/* 3. 主工作区：左侧题库列表 + 右侧详情编排区 */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 items-start w-full overflow-hidden">
        {/* 左侧：题库列表卡片 */}
        <Card className="w-full lg:w-80 shrink-0 border-border/80 shadow-xs flex flex-col h-full overflow-hidden">
          <CardHeader className="p-3 border-b border-border/80 bg-muted/20">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
              <span>题库清单</span>
              <Badge variant="secondary" className="font-mono text-[11px] h-4.5 px-1.5">
                {banks.length}
              </Badge>
            </CardTitle>
          </CardHeader>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-2">
            {banks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs gap-2">
                <Library className="size-6 text-muted-foreground/30" />
                <span>暂无符合条件的题库</span>
              </div>
            ) : (
              banks.map((bank) => {
                const isSelected = bank.id === selectedId;
                const cat = CATEGORY_MAP[bank.category] || CATEGORY_MAP.direct;
                return (
                  <div
                    key={bank.id}
                    className={`p-3 rounded-lg border cursor-pointer select-none transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30'
                        : 'border-border/60 hover:border-border hover:bg-muted/30 bg-card'
                    }`}
                    onClick={() => handleSelectBank(bank.id)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground"
                      >
                        {cat.label}
                      </Badge>
                      <div>
                        {bank.isBuiltin ? (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-1">
                            <Lock className="size-2.5" /> 官方内置
                          </Badge>
                        ) : bank.isPublished ? (
                          <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                            已上架
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 text-muted-foreground">
                            未上架
                          </Badge>
                        )}
                      </div>
                    </div>

                    <strong className="text-xs font-bold text-foreground block line-clamp-1 mb-1">
                      {bank.title}
                    </strong>
                    {bank.subtitle && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mb-1.5">
                        {bank.subtitle}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-mono pt-1 border-t border-border/40">
                      <span>{bank.questionCount} 题{bank.estimatedMinutes ? ` · 约 ${bank.estimatedMinutes} 分钟` : ''}</span>
                      <span>{formatTime(bank.updatedAt).slice(5, 16)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* 右侧：题库详情编辑工作区 */}
        <Card className="flex-1 w-full border-border/80 shadow-xs flex flex-col h-full overflow-hidden">
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-2 text-sm">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span>正在读取题库详细数据…</span>
            </div>
          ) : !currentBank ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-2 text-sm">
              <BookOpen className="size-8 text-muted-foreground/30" />
              <span>请从左侧选择题库，或点击上方“新建题库”</span>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
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
        </Card>
      </div>

      {/* 5. 导入 JSON 模态弹窗 */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setImportModalOpen(false)}>
          <Card className="w-full max-w-xl shadow-xl border-border bg-card" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Upload className="size-4" />
                <span>批量导入题库 (JSON)</span>
              </CardTitle>
              <Button variant="ghost" size="sm" className="size-7 p-0" onClick={() => setImportModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                请将包含 <code>title</code> 与 <code>questions</code> 数组的合法题库 JSON 粘贴到下方：
              </p>

              {importError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <Textarea
                className="w-full bg-background p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={10}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder={`{\n  "title": "新测试题库",\n  "subtitle": "副标题",\n  "category": "direct",\n  "questions": [\n    {\n      "id": "q1",\n      "title": "问题文本",\n      "type": "single_choice",\n      "options": [\n        { "id": "opt1", "text": "选项A", "scores": { "dominance": 10 } }\n      ]\n    }\n  ]\n}`}
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setImportModalOpen(false)}>
                  取消
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExecuteImport}
                  disabled={saving || !importJsonText.trim()}
                  className="gap-1.5"
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  <span>确认导入</span>
                </Button>
              </div>
            </CardContent>
          </Card>
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
