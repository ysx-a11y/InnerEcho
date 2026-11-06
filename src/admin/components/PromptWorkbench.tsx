import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  FileCode2,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { adminApi, formatTime } from '../adminApi';
import type { PromptTemplate } from '../adminTypes';
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { AdminToast, type ToastMessage } from './ui/AdminToast';

export const PROMPT_CATEGORY_OPTIONS: { key: string; label: string; badgeColor: string; desc: string }[] = [
  { key: 'all', label: '通用全部', badgeColor: '#a78bfa', desc: '全部分类默认兜底' },
  { key: 'scenario', label: '情境切片', badgeColor: '#ec4899', desc: '沉浸场景剧情与代入' },
  { key: 'direct', label: '真实自白', badgeColor: '#ff3377', desc: '原始倾诉与社死自白' },
  { key: 'preference', label: '权责谱系', badgeColor: '#ff70a6', desc: 'BDSM / 权责与属性量表' },
  { key: 'scientific', label: '心相镜像', badgeColor: '#80f3ff', desc: '心理学机制与客观镜像' },
];

const REQUIRED_OUTPUT_FIELDS = [
  'archetypeTitle',
  'archetypeSubtitle',
  'disparityScore',
  'personaDeconstruction',
  'shadowDeconstruction',
  'psychologicalSublimation',
  'resonanceKeywords',
];

export const PromptWorkbench: React.FC = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [categories, setCategories] = useState<string[]>(['all']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingActivate, setConfirmingActivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 统一确认对话框状态
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

  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [templates, selectedId]
  );
  const activeList = useMemo(() => templates.filter((item) => item.isActive), [templates]);
  const active = useMemo(() => activeList[0] ?? null, [activeList]);
  const missingFields = REQUIRED_OUTPUT_FIELDS.filter((field) => !content.includes(field));

  // 校验其他生效模板占用的分类（防止重复覆盖）
  const otherActiveTemplates = useMemo(() => {
    return templates.filter((item) => item.isActive && item.id !== selectedId);
  }, [templates, selectedId]);

  const categoryOccupancyMap = useMemo(() => {
    const map = new Map<string, { templateId: string; templateName: string }>();
    for (const t of otherActiveTemplates) {
      const cats = t.categories ?? ['all'];
      for (const cat of cats) {
        map.set(cat, { templateId: t.id, templateName: t.name });
      }
    }
    return map;
  }, [otherActiveTemplates]);

  // 计算当前选择是否存在与其他生效模板的冲突
  const activeConflicts = useMemo(() => {
    const conflicts: { key: string; label: string; templateName: string }[] = [];
    const isTargetAll = categories.includes('all');

    for (const opt of PROMPT_CATEGORY_OPTIONS) {
      if (!isTargetAll && !categories.includes(opt.key)) continue;

      if (categoryOccupancyMap.has('all')) {
        const occ = categoryOccupancyMap.get('all')!;
        conflicts.push({ key: opt.key, label: opt.label, templateName: occ.templateName });
      } else if (categoryOccupancyMap.has(opt.key)) {
        const occ = categoryOccupancyMap.get(opt.key)!;
        conflicts.push({ key: opt.key, label: opt.label, templateName: occ.templateName });
      }
    }
    return conflicts;
  }, [categories, categoryOccupancyMap]);

  const isDirty = useMemo(() => {
    if (!selected) return false;
    const baseCats = (selected.categories ?? ['all']).slice().sort().join(',');
    const currCats = categories.slice().sort().join(',');
    return (
      selected.name !== name ||
      selected.description !== description ||
      selected.content !== content ||
      baseCats !== currCats
    );
  }, [selected, name, description, content, categories]);

  const applyTemplate = (template: PromptTemplate) => {
    setSelectedId(template.id);
    setName(template.name);
    setDescription(template.description);
    setContent(template.content);
    setCategories(Array.isArray(template.categories) && template.categories.length > 0 ? template.categories : ['all']);
    setConfirmingActivate(false);
    setNotice(null);
  };

  const toggleCategory = (key: string) => {
    if (key === 'all') {
      setCategories((prev) => (prev.includes('all') ? [] : ['all']));
      return;
    }

    setCategories((prev) => {
      const withoutAll = prev.filter((c) => c !== 'all');
      if (withoutAll.includes(key)) {
        return withoutAll.filter((c) => c !== key);
      }
      return [...withoutAll, key];
    });
  };

  const load = useCallback(async (preferredId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.promptTemplates();
      setTemplates(response.items);
      const next = response.items.find((item) => item.id === preferredId)
        ?? response.items.find((item) => item.id === selectedId)
        ?? response.items.find((item) => item.isActive)
        ?? response.items[0];
      if (next) applyTemplate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提示词模板加载失败');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
    // Initial fetch only; later refreshes are explicit so unsaved edits are not overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (template: PromptTemplate) => {
    if (isDirty) {
      setConfirmConfig({
        isOpen: true,
        title: '放弃未保存修改',
        description: '当前模板有未保存的修改，确定切换到其他模板吗？未保存的内容将丢失。',
        confirmText: '确定切换',
        danger: false,
        onConfirm: () => {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          applyTemplate(template);
        },
      });
      return;
    }
    applyTemplate(template);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const response = await adminApi.updatePromptTemplate(selected.id, {
        name,
        description,
        content,
        categories,
      });
      setTemplates((items) => items.map((item) => (item.id === response.template.id ? response.template : item)));
      applyTemplate(response.template);
      addToast('success', '模板与分类绑定已成功保存');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await adminApi.createPromptTemplate({
        name: `${name || '未命名模板'} · 副本`,
        description,
        content,
        categories,
      });
      addToast('success', '已创建新模板，当前仍未生效');
      await load(response.template.id);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '创建模板失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const base = active ?? selected;
    if (!base) return;
    setSaving(true);
    setError(null);
    try {
      const response = await adminApi.createPromptTemplate({
        name: '新提示词模板',
        description: '未绑定分类（仅存盘备用），可选择分类绑定并手动启用。',
        content: base.content,
        categories: [],
      });
      await load(response.template.id);
      addToast('success', '新模板已创建（未绑定分类）');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '创建模板失败');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!selected) return;
    if (categories.length === 0) {
      addToast('error', '未绑定分类的模板不能启用，请先选择至少一个应用分类。');
      return;
    }
    if (isDirty) {
      addToast('error', '请先保存当前修改与分类选择，再启用模板。');
      return;
    }
    if (!confirmingActivate) {
      setConfirmingActivate(true);
      setNotice(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await adminApi.activatePromptTemplate(selected.id);
      setTemplates((items) =>
        items.map((item) => ({
          ...item,
          isActive: item.id === response.template.id,
          updatedAt: item.id === response.template.id ? response.template.updatedAt : item.updatedAt,
        }))
      );
      addToast('success', '模板已启用，测评该分类题库时将立即生效');
      setConfirmingActivate(false);
      await load(selected.id);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '启用失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || selected.isActive || selected.isBuiltin) return;
    setConfirmConfig({
      isOpen: true,
      title: '删除提示词模板',
      description: `确定删除模板“${selected.name}”吗？此操作不可恢复。`,
      confirmText: '确认删除',
      danger: true,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setSaving(true);
        try {
          await adminApi.deletePromptTemplate(selected.id);
          addToast('success', '模板已成功删除');
          setSelectedId(null);
          await load(active?.id);
        } catch (err) {
          addToast('error', err instanceof Error ? err.message : '删除失败');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  if (loading && templates.length === 0) {
    return <div className="admin-empty-state"><Loader2 className="admin-spin" size={22} />正在读取提示词配置…</div>;
  }

  return (
    <div className="prompt-workbench">
      <div className="prompt-top-banner">
        <div className="prompt-active-summary-bar">
          <div className="prompt-active-indicator">
            <span className="admin-status-dot" />
            <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-secondary)' }}>生效中模板调度 ({activeList.length})：</span>
            <strong style={{ fontSize: '0.82rem', color: '#fff' }}>{active ? active.name : '未设置'}</strong>
          </div>
          <div className="prompt-active-categories-flow">
            {activeList.map((a) => {
              const catLabels = (a.categories && a.categories.length > 0)
                ? a.categories.map((k) => PROMPT_CATEGORY_OPTIONS.find((o) => o.key === k)?.label ?? k).join('、')
                : '通用全部';
              return (
                <span key={a.id} className="prompt-active-flow-chip">
                  <em style={{ fontStyle: 'normal', color: 'var(--admin-accent)' }}>{catLabels}</em>
                  <span>: {a.name}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error"><AlertTriangle size={16} />{error}</div>}
      {notice && <div className="admin-alert admin-alert-success"><Check size={16} />{notice}</div>}

      <div className="prompt-layout">
        <aside className="prompt-library admin-panel">
          <div className="admin-panel-header">
            <div>
              <span className="admin-panel-title">模板库</span>
              <small>{templates.length} 个版本</small>
            </div>
            <button className="admin-icon-button" onClick={handleCreate} disabled={saving} title="新建模板">
              <Plus size={17} />
            </button>
          </div>

          <div className="prompt-template-list">
            {templates.map((template) => (
              <button
                key={template.id}
                className={`prompt-template-item ${selectedId === template.id ? 'is-selected' : ''}`}
                onClick={() => handleSelect(template)}
              >
                <span className="prompt-template-icon"><FileCode2 size={16} /></span>
                <span className="prompt-template-copy">
                  <strong>{template.name}</strong>
                  <small>{template.description || '没有说明'}</small>
                  <div className="prompt-template-categories">
                    {(template.categories && template.categories.length > 0) ? (
                      template.categories.map((catKey) => {
                        const opt = PROMPT_CATEGORY_OPTIONS.find((c) => c.key === catKey) ?? {
                          label: catKey,
                          badgeColor: '#999',
                        };
                        return (
                          <span
                            key={catKey}
                            className="prompt-category-badge"
                            style={{
                              color: opt.badgeColor,
                              borderColor: `${opt.badgeColor}44`,
                              backgroundColor: `${opt.badgeColor}15`,
                            }}
                          >
                            {opt.label}
                          </span>
                        );
                      })
                    ) : (
                      <span
                        className="prompt-category-badge is-unassigned"
                        style={{
                          color: 'var(--admin-text-muted)',
                          borderColor: 'rgba(255, 255, 255, 0.12)',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        }}
                      >
                        未绑定分类
                      </span>
                    )}
                  </div>
                  <span>
                    {template.isActive && <em>生效中</em>}
                    {template.isBuiltin && <em className="is-muted">内置</em>}
                    <time>{formatTime(template.updatedAt).slice(0, 10)}</time>
                  </span>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </aside>

        <main className="prompt-editor admin-panel">
          {selected ? (
            <>
              {/* 顶部主操作栏：标题状态与所有核心按钮（删除、另存副本、保存、启用）一字排开 */}
              <div className="prompt-editor-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <span className="admin-panel-title">编辑模板</span>
                  {selected.isActive ? (
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#70dcb4', background: 'rgba(79, 209, 161, 0.15)', border: '1px solid rgba(79, 209, 161, 0.35)', padding: '0.18rem 0.55rem', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Check size={12} strokeWidth={3} /> 生效运行中
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '0.18rem 0.55rem', borderRadius: 6 }}>
                      草稿未启用
                    </span>
                  )}
                  {isDirty && (
                    <small style={{ color: '#ffb300', fontSize: '0.72rem', fontWeight: 700 }}>• 有未保存修改</small>
                  )}
                </div>

                <div className="admin-button-row" style={{ flexWrap: 'wrap' }}>
                  {/* 刷新 */}
                  <button className="admin-button admin-button-quiet" onClick={() => void load(selected.id)} disabled={saving || isDirty} title="刷新">
                    <RefreshCw size={14} />刷新
                  </button>

                  {/* 另存副本 */}
                  <button className="admin-button admin-button-quiet" onClick={handleDuplicate} disabled={saving} title="另存副本">
                    <Copy size={14} />另存副本
                  </button>

                  {/* 删除模板 */}
                  <button
                    className="admin-button admin-button-danger"
                    onClick={handleDelete}
                    disabled={saving || selected.isActive || selected.isBuiltin}
                    title={selected.isActive ? '生效中的模板不能删除' : selected.isBuiltin ? '内置模板不能删除' : '删除模板'}
                  >
                    <Trash2 size={14} />删除
                  </button>

                  {/* 保存 */}
                  <button
                    className="admin-button admin-button-primary"
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                  >
                    {saving ? <Loader2 className="admin-spin" size={14} /> : <Save size={14} />}保存
                  </button>

                  {/* 启用按钮 */}
                  {confirmingActivate && (
                    <button
                      className="admin-button admin-button-quiet"
                      onClick={() => setConfirmingActivate(false)}
                      disabled={saving}
                    >
                      取消
                    </button>
                  )}
                  <button
                    className="admin-button admin-button-activate"
                    onClick={handleActivate}
                    disabled={saving || selected.isActive || categories.length === 0}
                    title={categories.length === 0 ? '未绑定分类的模板不能启用，请先选择至少一个应用分类' : undefined}
                    style={{ fontWeight: 800 }}
                  >
                    {selected.isActive ? <Check size={14} strokeWidth={2.5} /> : <Play size={14} />}
                    {selected.isActive ? '已生效' : confirmingActivate ? '确认启用' : '启用此模板'}
                  </button>
                </div>
              </div>

              {/* 紧凑配置栏：单行名称与说明 + 简洁分类标签 */}
              <div style={{ padding: '0.75rem 1rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 0.9fr) minmax(240px, 1.4fr)', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      模板名称:
                    </span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="输入提示词模板名称..."
                      maxLength={80}
                      style={{
                        width: '100%',
                        padding: '0.38rem 0.65rem',
                        fontSize: '0.78rem',
                        borderRadius: 6,
                        background: 'rgba(10, 5, 18, 0.85)',
                        border: '1px solid var(--admin-border)',
                        color: '#f3e8ff',
                        outline: 'none',
                      }}
                    />
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      用途说明:
                    </span>
                    <input
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="说明适用场景..."
                      maxLength={300}
                      style={{
                        width: '100%',
                        padding: '0.38rem 0.65rem',
                        fontSize: '0.78rem',
                        borderRadius: 6,
                        background: 'rgba(10, 5, 18, 0.85)',
                        border: '1px solid var(--admin-border)',
                        color: '#f3e8ff',
                        outline: 'none',
                      }}
                    />
                  </label>
                </div>

                {/* 生效分类标签 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    生效分类:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {PROMPT_CATEGORY_OPTIONS.map((opt) => {
                      const isSelected = categories.includes(opt.key);
                      const occupied = categoryOccupancyMap.get(opt.key);
                      const isLocked = Boolean(occupied && selected.isActive);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          className={`prompt-category-chip ${isSelected ? 'is-selected' : ''} ${isLocked ? 'is-locked' : ''}`}
                          style={{
                            borderColor: isSelected ? opt.badgeColor : undefined,
                            backgroundColor: isSelected ? `${opt.badgeColor}22` : undefined,
                            color: isSelected ? opt.badgeColor : undefined,
                            padding: '0.24rem 0.55rem',
                            fontSize: '0.72rem',
                            borderRadius: 6,
                          }}
                          onClick={() => {
                            if (isLocked && occupied) {
                              addToast('error', `该分类已由生效模板「${occupied.templateName}」覆盖，生效中的模板不能直接占用；请先调整该模板的分类绑定。`);
                              return;
                            }
                            toggleCategory(opt.key);
                          }}
                          title={occupied ? `已被「${occupied.templateName}」覆盖` : undefined}
                        >
                          <span className="prompt-category-chip-dot" style={{ backgroundColor: opt.badgeColor }} />
                          <span>{opt.label}</span>
                          {isSelected && <Check size={11} strokeWidth={2.5} />}
                          {occupied && (
                            <span className="prompt-category-occupied" style={{ fontSize: '0.58rem', padding: '0.02rem 0.3rem' }}>
                              被占用
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* 都不选 / 仅存盘备用 */}
                    <button
                      type="button"
                      className={`prompt-category-chip ${selected.isActive ? 'is-locked' : ''}`}
                      style={{
                        borderColor: categories.length === 0 ? '#aaa' : undefined,
                        backgroundColor: categories.length === 0 ? 'rgba(255, 255, 255, 0.12)' : undefined,
                        color: categories.length === 0 ? '#ffffff' : 'var(--admin-text-muted)',
                        padding: '0.24rem 0.55rem',
                        fontSize: '0.72rem',
                        borderRadius: 6,
                      }}
                      onClick={() => {
                        if (selected.isActive) {
                          addToast('error', '生效中的模板不能清空分类，请先调整分类绑定或停用后再清空。');
                          return;
                        }
                        setCategories([]);
                      }}
                      title={selected.isActive ? '生效中的模板不能清空分类' : '清空绑定分类（仅存盘备用，不接管测评）'}
                    >
                      <span>都不选 / 仅存盘</span>
                      {categories.length === 0 && <Check size={11} strokeWidth={2.5} />}
                    </button>
                  </div>
                </div>

                {activeConflicts.length > 0 && !selected.isActive && (
                  <div
                    style={{
                      padding: '0.25rem 0.55rem',
                      borderRadius: 6,
                      background: 'rgba(255, 170, 0, 0.08)',
                      border: '1px solid rgba(255, 170, 0, 0.25)',
                      color: '#ffd180',
                      fontSize: '0.68rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                    <span>
                      所选分类已被使用（{activeConflicts.map((c) => `「${c.label}」由「${c.templateName}」`).join('、')}），启用将自动接管覆盖。
                    </span>
                  </div>
                )}
              </div>

              {/* 报告生成指令 Editor 区域：全高度通透展开 */}
              <div style={{ padding: '0.55rem 1rem 0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>报告生成指令</span>
                  {missingFields.length === 0 ? (
                    <span style={{ fontSize: '0.65rem', color: '#70dcb4', background: 'rgba(79, 209, 161, 0.12)', padding: '0.1rem 0.4rem', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Check size={10} strokeWidth={2.5} /> 结构完整
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: '#ffb300', background: 'rgba(255, 179, 0, 0.12)', padding: '0.1rem 0.4rem', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} title={`缺少：${missingFields.join('、')}`}>
                      <AlertTriangle size={10} /> 缺少 {missingFields.length} 个字段
                    </span>
                  )}
                </div>
                <code style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>{content.length.toLocaleString()} 字符</code>
              </div>

              <div style={{ flex: 1, padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <textarea
                  className="prompt-code-editor"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  spellCheck={false}
                  aria-label="报告生成指令"
                  style={{
                    flex: 1,
                    minHeight: 520,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          ) : (
            <div className="admin-empty-state">请选择一个模板</div>
          )}
        </main>
      </div>

      {/* 统一确认对话框 */}
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

      {/* 统一 Toast 提示 */}
      <AdminToast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
