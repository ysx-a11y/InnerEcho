import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Sliders,
  Database,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  GitFork,
  CheckCircle2,
  Lock,
  ArrowRight,
  Shield,
  Tag,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { SysDictType, SysDictItem, SysStateTransition } from '../adminTypes';
import { dictApi } from '../adminApi';
import { DictBadge } from './ui/DictBadge';
import { adminNotify } from './ui/adminNotify';
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { DictTypeModal } from './dict/DictTypeModal';
import { DictItemModal } from './dict/DictItemModal';
import { DictTransitionModal } from './dict/DictTransitionModal';

export const DictWorkbench: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'transitions'>('items');
  const [types, setTypes] = useState<SysDictType[]>([]);
  const [selectedTypeCode, setSelectedTypeCode] = useState<string>('echo_audit_status');
  const [items, setItems] = useState<SysDictItem[]>([]);
  const [transitions, setTransitions] = useState<SysStateTransition[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter state
  const [typeSearch, setTypeSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Add / Edit Type Modal State
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeEditing, setTypeEditing] = useState<{
    code: string;
    name: string;
    description: string;
    remark: string;
    isEdit: boolean;
  }>({
    code: '',
    name: '',
    description: '',
    remark: '',
    isEdit: false,
  });

  // Edit / Add Item Modal State
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemEditing, setItemEditing] = useState<{
    value: string;
    label: string;
    badgeColor: string;
    badgeVariant: string;
    sortOrder: number;
    isDefault: number;
    isActive: number;
    remark: string;
    isEdit: boolean;
  }>({
    value: '',
    label: '',
    badgeColor: 'teal',
    badgeVariant: 'light',
    sortOrder: 10,
    isDefault: 0,
    isActive: 1,
    remark: '',
    isEdit: false,
  });

  // Edit / Add Transition Modal State
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [transitionEditing, setTransitionEditing] = useState<{
    fromValue: string;
    toValue: string;
    actionName: string;
    requiredRole: 'user' | 'admin' | 'system';
    remark: string;
  }>({
    fromValue: '',
    toValue: '',
    actionName: '',
    requiredRole: 'admin',
    remark: '',
  });

  // Delete Confirm Dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  const loadData = useCallback(async (preferredCode?: string) => {
    setLoading(true);
    try {
      const typeRes = await dictApi.listTypes();
      const typeList = typeRes.types || [];
      setTypes(typeList);

      const targetCode = preferredCode || selectedTypeCode || typeList[0]?.code;
      if (targetCode) {
        setSelectedTypeCode(targetCode);
        const [itemListRes, transitionListRes] = await Promise.all([
          dictApi.listItems(targetCode, true),
          dictApi.listTransitions(targetCode),
        ]);
        setItems(itemListRes.items || []);
        setTransitions(transitionListRes.transitions || []);
      }
    } catch {
      adminNotify.error('加载系统字典与状态机数据失败');
    } finally {
      setLoading(false);
    }
  }, [selectedTypeCode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSelectType = async (code: string) => {
    setSelectedTypeCode(code);
    setItemSearch('');
    setStatusFilter('all');
    setLoading(true);
    try {
      const [itemListRes, transitionListRes] = await Promise.all([
        dictApi.listItems(code, true),
        dictApi.listTransitions(code),
      ]);
      setItems(itemListRes.items || []);
      setTransitions(transitionListRes.transitions || []);
    } catch {
      adminNotify.error('加载字典数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveType = async () => {
    if (!typeEditing.code.trim() || !typeEditing.name.trim()) {
      adminNotify.error('字典编码 (code) 与字典名称 (name) 不能为空');
      return;
    }
    try {
      await dictApi.upsertType({
        code: typeEditing.code.trim(),
        name: typeEditing.name.trim(),
        description: typeEditing.description.trim() || undefined,
        remark: typeEditing.remark.trim() || undefined,
      });
      adminNotify.success('字典大类保存成功');
      setTypeModalOpen(false);
      void loadData(typeEditing.code.trim());
    } catch {
      adminNotify.error('保存字典大类失败');
    }
  };

  const handleDeleteType = (type: SysDictType) => {
    if (type.isSystem) {
      adminNotify.error('系统核心预设字典受保护，禁止删除');
      return;
    }
    setDeleteConfirm({
      isOpen: true,
      title: '删除字典大类',
      description: `确定要删除字典大类「${type.name} (${type.code})」吗？该操作将连带清空其下的所有枚举数据项与流转规则！`,
      onConfirm: async () => {
        try {
          await dictApi.deleteType(type.code);
          adminNotify.success('字典大类已删除');
          void loadData(types.find((t) => t.code !== type.code)?.code);
        } catch {
          adminNotify.error('删除字典大类失败');
        }
      },
    });
  };

  const handleSaveItem = async () => {
    if (!itemEditing.value.trim() || !itemEditing.label.trim()) {
      adminNotify.error('状态枚举值 (value) 与展示标签 (label) 不能为空');
      return;
    }

    try {
      await dictApi.upsertItem({
        typeCode: selectedTypeCode,
        ...itemEditing,
      });
      adminNotify.success('字典项保存成功');
      setItemModalOpen(false);
      const res = await dictApi.listItems(selectedTypeCode, true);
      setItems(res.items || []);
    } catch {
      adminNotify.error('保存字典项失败');
    }
  };

  const handleToggleItemActive = async (item: SysDictItem) => {
    try {
      const nextActive = item.isActive ? 0 : 1;
      await dictApi.upsertItem({
        typeCode: selectedTypeCode,
        value: item.value,
        label: item.label,
        badgeColor: item.badgeColor,
        badgeVariant: item.badgeVariant,
        sortOrder: item.sortOrder,
        isDefault: item.isDefault,
        isActive: nextActive,
        remark: item.remark || undefined,
      });
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isActive: nextActive } : it))
      );
      adminNotify.success(nextActive ? `已启用「${item.label}」` : `已停用「${item.label}」`);
    } catch {
      adminNotify.error('修改状态失败');
    }
  };

  const handleDeleteItem = (item: SysDictItem) => {
    setDeleteConfirm({
      isOpen: true,
      title: '删除字典数据项',
      description: `确定要删除枚举项「${item.label} (${item.value})」吗？删除后相关业务数据若引用此键值可能降级为纯文本显示。`,
      onConfirm: async () => {
        try {
          await dictApi.deleteItem(selectedTypeCode, item.value);
          adminNotify.success('字典项已删除');
          const res = await dictApi.listItems(selectedTypeCode, true);
          setItems(res.items || []);
        } catch {
          adminNotify.error('删除字典项失败');
        }
      },
    });
  };

  const handleSaveTransition = async () => {
    if (!transitionEditing.actionName.trim()) {
      adminNotify.error('流转动作名称不能为空');
      return;
    }

    try {
      await dictApi.upsertTransition({
        typeCode: selectedTypeCode,
        ...transitionEditing,
        isAllowed: 1,
      });
      adminNotify.success('状态机流转规则新增成功');
      setTransitionModalOpen(false);
      const res = await dictApi.listTransitions(selectedTypeCode);
      setTransitions(res.transitions || []);
    } catch {
      adminNotify.error('保存状态机规则失败');
    }
  };

  const handleDeleteTransition = (t: SysStateTransition) => {
    setDeleteConfirm({
      isOpen: true,
      title: '删除流转规则',
      description: `确定要删除流转规则「${t.fromValue} -> ${t.toValue} (${t.actionName})」吗？`,
      onConfirm: async () => {
        try {
          await dictApi.deleteTransition(t.id);
          adminNotify.success('流转规则已删除');
          const res = await dictApi.listTransitions(selectedTypeCode);
          setTransitions(res.transitions || []);
        } catch {
          adminNotify.error('删除规则失败');
        }
      },
    });
  };

  // Filtered types on left
  const filteredTypes = useMemo(() => {
    if (!typeSearch.trim()) return types;
    const q = typeSearch.toLowerCase();
    return types.filter(
      (t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
    );
  }, [types, typeSearch]);

  // Filtered items on right
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (statusFilter === 'active' && !it.isActive) return false;
      if (statusFilter === 'inactive' && it.isActive) return false;
      if (itemSearch.trim()) {
        const q = itemSearch.toLowerCase();
        return (
          it.label.toLowerCase().includes(q) ||
          it.value.toLowerCase().includes(q) ||
          (it.remark && it.remark.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [items, itemSearch, statusFilter]);

  const currentType = types.find((t) => t.code === selectedTypeCode);

  return (
    <div className="flex flex-col md:flex-row gap-3 w-full h-[calc(100vh-80px)] min-h-[580px] overflow-hidden">
      {/* ================= 左侧：标准字典类型列表 (Master) ================= */}
      <Card className="w-full md:w-72 lg:w-80 shrink-0 border-border/80 shadow-xs flex flex-col h-full overflow-hidden">
        {/* 左侧头部：标题、新增按钮、检索框 */}
        <div className="p-3 border-b border-border/80 flex flex-col gap-2.5 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Database className="size-4 text-primary" />
              <span className="font-semibold text-xs tracking-tight text-foreground">字典类型</span>
              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4">
                {types.length}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2 gap-1"
              onClick={() => {
                setTypeEditing({
                  code: '',
                  name: '',
                  description: '',
                  remark: '',
                  isEdit: false,
                });
                setTypeModalOpen(true);
              }}
            >
              <Plus className="size-3" />
              <span>新增类型</span>
            </Button>
          </div>

          <div className="relative w-full">
            <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="搜索字典名称或编码..."
              value={typeSearch}
              onChange={(e) => setTypeSearch(e.target.value)}
              className="h-7.5 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* 左侧列表项 */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-1.5 space-y-1">
          {filteredTypes.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">未找到匹配的字典类型</div>
          ) : (
            filteredTypes.map((t) => {
              const isSelected = t.code === selectedTypeCode;
              return (
                <div
                  key={t.code}
                  onClick={() => handleSelectType(t.code)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg border transition-all cursor-pointer group select-none flex flex-col gap-0.5',
                    isSelected
                      ? 'border-l-4 border-l-primary border-t-transparent border-r-transparent border-b-transparent bg-primary/10 shadow-xs'
                      : 'border-l-4 border-transparent hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={cn('text-xs truncate max-w-[170px]', isSelected ? 'font-bold text-primary' : 'font-semibold text-foreground')}>
                      {t.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {t.isSystem ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground border-border/80">
                          系统
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteType(t);
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                    <span className="truncate max-w-[180px]">{t.code}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* ================= 右侧：标准字典数据与流转规则 (Detail) ================= */}
      <Card className="flex-1 border-border/80 shadow-xs flex flex-col h-full overflow-hidden">
        {/* 右侧顶部工作台工具栏 */}
        <div className="p-3 sm:p-3.5 border-b border-border/80 flex flex-wrap items-center justify-between gap-2.5 bg-card">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-foreground truncate">
                {currentType?.name || selectedTypeCode}
              </h2>
              <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground px-1.5 py-0">
                {selectedTypeCode}
              </Badge>
              {currentType?.isSystem ? (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 flex items-center gap-1">
                  <Lock className="size-2.5" /> 核心预设
                </Badge>
              ) : null}
            </div>
            {currentType?.description && (
              <p className="text-[11px] text-muted-foreground truncate max-w-xl">
                {currentType.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 子 Tab 切换 */}
            <div className="flex items-center p-0.5 bg-muted/60 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5',
                  activeTab === 'items'
                    ? 'bg-background text-foreground font-medium shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Layers className="size-3.5" />
                <span>字典数据 ({items.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('transitions')}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5',
                  activeTab === 'transitions'
                    ? 'bg-background text-foreground font-medium shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <GitFork className="size-3.5" />
                <span>流转规则 ({transitions.length})</span>
              </button>
            </div>

            {/* 新增按钮 */}
            {activeTab === 'items' ? (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5 gap-1"
                onClick={() => {
                  setItemEditing({
                    value: '',
                    label: '',
                    badgeColor: 'teal',
                    badgeVariant: 'light',
                    sortOrder: (items.length + 1) * 10,
                    isDefault: 0,
                    isActive: 1,
                    remark: '',
                    isEdit: false,
                  });
                  setItemModalOpen(true);
                }}
              >
                <Plus className="size-3.5" />
                <span>新增字典项</span>
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5 gap-1"
                onClick={() => {
                  setTransitionEditing({
                    fromValue: items[0]?.value || '',
                    toValue: items[1]?.value || items[0]?.value || '',
                    actionName: '',
                    requiredRole: 'admin',
                    remark: '',
                  });
                  setTransitionModalOpen(true);
                }}
              >
                <Plus className="size-3.5" />
                <span>新增流转规则</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData(selectedTypeCode)}
              disabled={loading}
              className="h-7 text-xs px-2.5 gap-1"
            >
              <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
              <span>刷新</span>
            </Button>
          </div>
        </div>

        {/* Tab 1: 字典数据项列表 (标准表格展示) */}
        {activeTab === 'items' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 列表快捷搜索与状态过滤条 */}
            <div className="p-2.5 border-b border-border/60 flex flex-wrap items-center justify-between gap-2 bg-muted/10">
              <div className="flex items-center gap-2">
                <div className="relative w-56">
                  <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="按标签、键值、说明检索..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="h-7.5 pl-8 text-xs bg-background"
                  />
                </div>

                <div className="flex bg-muted/60 rounded-md p-0.5 border border-border/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={cn(
                      'px-2 py-0.5 rounded transition-colors cursor-pointer',
                      statusFilter === 'all'
                        ? 'bg-background text-foreground font-medium shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    全部
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={cn(
                      'px-2 py-0.5 rounded transition-colors cursor-pointer',
                      statusFilter === 'active'
                        ? 'bg-background text-foreground font-medium shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    启用中
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('inactive')}
                    className={cn(
                      'px-2 py-0.5 rounded transition-colors cursor-pointer',
                      statusFilter === 'inactive'
                        ? 'bg-background text-foreground font-medium shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    已停用
                  </button>
                </div>
              </div>

              <span className="text-[11px] text-muted-foreground">
                显示 {filteredItems.length} / 共 {items.length} 项
              </span>
            </div>

            {/* 表格容器 */}
            <div className="flex-1 overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="py-20 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <Layers className="size-6 text-muted-foreground/30" />
                  <span>暂无符合条件的字典项</span>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-xs z-10">
                    <TableRow className="text-xs">
                      <TableHead className="w-16 text-center">字典排序</TableHead>
                      <TableHead className="w-40">字典标签</TableHead>
                      <TableHead className="w-40">字典键值</TableHead>
                      <TableHead className="w-32">回显样式</TableHead>
                      <TableHead className="w-24 text-center">状态</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead className="w-28 text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id} className="text-xs hover:bg-muted/40 transition-colors">
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {item.sortOrder}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {item.label}
                          {item.isDefault ? (
                            <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 text-primary border-primary/40">
                              默认
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 text-foreground">
                            {item.value}
                          </code>
                        </TableCell>
                        <TableCell>
                          <DictBadge
                            dictCode={selectedTypeCode}
                            value={item.value}
                            fallbackLabel={item.label}
                            size="xs"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => void handleToggleItemActive(item)}
                            className="cursor-pointer transition-transform hover:scale-105"
                            title="点击切换启用/停用状态"
                          >
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[11px] px-2 py-0.5 font-medium',
                                item.isActive
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-muted text-muted-foreground border-border'
                              )}
                            >
                              {item.isActive ? '正常' : '停用'}
                            </Badge>
                          </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground truncate max-w-xs">
                          {item.remark || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              className="text-primary hover:underline text-xs font-medium cursor-pointer"
                              onClick={() => {
                                setItemEditing({
                                  value: item.value,
                                  label: item.label,
                                  badgeColor: item.badgeColor,
                                  badgeVariant: item.badgeVariant,
                                  sortOrder: item.sortOrder,
                                  isDefault: item.isDefault,
                                  isActive: item.isActive,
                                  remark: item.remark || '',
                                  isEdit: true,
                                });
                                setItemModalOpen(true);
                              }}
                            >
                              修改
                            </button>
                            <span className="text-border/80">|</span>
                            <button
                              type="button"
                              className="text-destructive hover:underline text-xs font-medium cursor-pointer"
                              onClick={() => handleDeleteItem(item)}
                            >
                              删除
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: 状态机流转规则矩阵 (标准表格展示) */}
        {activeTab === 'transitions' && (
          <div className="flex-1 overflow-y-auto">
            {transitions.length === 0 ? (
              <div className="py-20 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <GitFork className="size-6 text-muted-foreground/30" />
                <span>当前字典尚未定义状态流转规则</span>
                <span className="text-[11px] text-muted-foreground/60">可点击右上角「新增流转规则」设定允许的状态迁移矩阵</span>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-xs z-10">
                  <TableRow className="text-xs">
                    <TableHead className="w-36">起始状态 (From)</TableHead>
                    <TableHead className="w-12 text-center">→</TableHead>
                    <TableHead className="w-36">目标状态 (To)</TableHead>
                    <TableHead className="w-40">触发动作 (actionName)</TableHead>
                    <TableHead className="w-28">所需权限角色</TableHead>
                    <TableHead>说明约束 (remark)</TableHead>
                    <TableHead className="w-20 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transitions.map((t) => (
                    <TableRow key={t.id} className="text-xs">
                      <TableCell>
                        <DictBadge dictCode={selectedTypeCode} value={t.fromValue} size="xs" />
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        <ArrowRight className="size-3 mx-auto" />
                      </TableCell>
                      <TableCell>
                        <DictBadge dictCode={selectedTypeCode} value={t.toValue} size="xs" />
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {t.actionName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-mono">
                          {t.requiredRole}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-sm">
                        {t.remark || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          title="删除流转规则"
                          onClick={() => handleDeleteTransition(t)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </Card>

      {/* ================= 字典大类 新增/编辑 模态框 ================= */}
      <DictTypeModal
        isOpen={typeModalOpen}
        typeEditing={typeEditing}
        onChange={(patch) => setTypeEditing((prev) => ({ ...prev, ...patch }))}
        onClose={() => setTypeModalOpen(false)}
        onSave={handleSaveType}
      />

      {/* ================= 字典数据项 新增/编辑 模态框 ================= */}
      <DictItemModal
        isOpen={itemModalOpen}
        itemEditing={itemEditing}
        onChange={(patch) => setItemEditing((prev) => ({ ...prev, ...patch }))}
        onClose={() => setItemModalOpen(false)}
        onSave={handleSaveItem}
      />

      {/* ================= 状态机规则 新增 模态框 ================= */}
      <DictTransitionModal
        isOpen={transitionModalOpen}
        items={items}
        transitionEditing={transitionEditing}
        onChange={(patch) => setTransitionEditing((prev) => ({ ...prev, ...patch }))}
        onClose={() => setTransitionModalOpen(false)}
        onSave={handleSaveTransition}
      />

      {/* 删除确认弹窗 */}
      <AdminConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
        confirmText="确认删除"
        danger
        onConfirm={async () => {
          await deleteConfirm.onConfirm();
          setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default DictWorkbench;
