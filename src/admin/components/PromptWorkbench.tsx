import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Sparkles,
  Play,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  Layers,
  Check,
} from 'lucide-react';
import { aiHubApi, formatTime } from '../adminApi';
import type {
  AiAgentContract,
  PromptTemplate,
  PromptVariableContract,
  PromptVersionContract,
} from '../adminTypes';
import { AdminWorkbenchShell } from './ui/AdminWorkbenchShell';
import { adminNotify } from './ui/adminNotify';
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { PromptVariableBar } from './ai/PromptVariableBar';
import { PromptVersionModal } from './ai/PromptVersionModal';
import { PromptRollbackModal } from './ai/PromptRollbackModal';
import { PromptPlayground } from './ai/PromptPlayground';
import { AiAgentStudio } from './ai/AiAgentStudio';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

export const PROMPT_CATEGORY_OPTIONS: { key: string; label: string; badgeColor: string; desc: string }[] = [
  { key: 'all', label: '通用全部', badgeColor: '#a78bfa', desc: '全部分类默认兜底' },
  { key: 'scenario', label: '情境切片', badgeColor: '#ec4899', desc: '沉浸场景剧情与代入' },
  { key: 'direct', label: '真实自白', badgeColor: '#ff3377', desc: '原始倾诉与社死自白' },
  { key: 'preference', label: '权责谱系', badgeColor: '#ff70a6', desc: 'BDSM / 权责与属性量表' },
  { key: 'scientific', label: '心相镜像', badgeColor: '#80f3ff', desc: '心理学机制与客观镜像' },
];

export const PromptWorkbench: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'playground' | 'agents'>('studio');
  const [agents, setAgents] = useState<AiAgentContract[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [variables, setVariables] = useState<PromptVariableContract[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 编辑区状态
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [categories, setCategories] = useState<string[]>(['all']);
  const [versions, setVersions] = useState<PromptVersionContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 模态弹窗状态
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsRes, tmplRes, varsRes] = await Promise.all([
        aiHubApi.listAgents(),
        aiHubApi.listTemplates(),
        aiHubApi.listVariables(),
      ]);

      if (agentsRes.success) setAgents(agentsRes.items);
      if (tmplRes.success) {
        setTemplates(tmplRes.items);
        if (!selectedId && tmplRes.items.length > 0) {
          const activeFirst = tmplRes.items.find((t) => t.isActive) || tmplRes.items[0];
          setSelectedId(activeFirst.id);
        }
      }
      if (varsRes.success) setVariables(varsRes.variables);
    } catch {
      adminNotify.error('加载 AI 智能体与提示词中台数据失败');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // 当选择不同模板时，同步加载表单与版本历史
  useEffect(() => {
    if (!selectedId) return;
    const current = templates.find((t) => t.id === selectedId);
    if (current) {
      setName(current.name);
      setDescription(current.description || '');
      setContent(current.content);
      setCategories(current.categories || ['all']);

      void aiHubApi.listVersions(selectedId).then((res) => {
        if (res.success) setVersions(res.versions);
      });
    }
  }, [selectedId, templates]);

  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [templates, selectedId]
  );

  const handleInsertVariable = (placeholder: string) => {
    setContent((prev) => `${prev} ${placeholder} `);
    adminNotify.info(`已插入变量 ${placeholder}`);
  };

  const handleDraftSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await aiHubApi.updateTemplate(selectedId, {
        name: name.trim(),
        description: description.trim(),
        content,
        agentId: 'agent_dossier_analyst',
        categories,
      });
      if (res.success) {
        adminNotify.success('模板草稿保存成功');
        await loadData();
      }
    } catch {
      adminNotify.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSnapshot = async (data: { changeSummary: string; remark: string; adminNotes: string }) => {
    if (!selectedId) return;
    const res = await aiHubApi.createVersion(selectedId, {
      systemPrompt: content,
      changeSummary: data.changeSummary,
      remark: data.remark,
      adminNotes: data.adminNotes,
    });
    if (res.success) {
      adminNotify.success(`成功生成版本 v${res.version.versionNum} 快照`);
      await loadData();
    }
  };

  const handleRollback = async (data: { targetVersionId: string; adminNotes: string; remark: string }) => {
    if (!selectedId) return;
    const res = await aiHubApi.rollbackVersion(selectedId, data);
    if (res.success) {
      adminNotify.success(res.message || '回滚完成');
      await loadData();
    }
  };

  const handleDuplicate = async () => {
    if (!selected) return;
    try {
      const res = await aiHubApi.createTemplate({
        name: `${selected.name} (副本)`,
        description: selected.description,
        content,
        agentId: 'agent_dossier_analyst',
        categories: selected.categories,
        changeSummary: `复制自 ${selected.name}`,
      });
      if (res.success) {
        adminNotify.success('成功创建副本模板');
        setSelectedId(res.template.id);
        await loadData();
      }
    } catch {
      adminNotify.error('复制模板失败');
    }
  };

  const handleActivate = async () => {
    if (!selectedId) return;
    try {
      const res = await aiHubApi.activateTemplate(selectedId);
      if (res.success) {
        adminNotify.success('模板已设为当前生效');
        await loadData();
      }
    } catch {
      adminNotify.error('激活模板失败');
    }
  };

  const handleDelete = () => {
    if (!selectedId || !selected) return;
    setConfirmConfig({
      isOpen: true,
      title: '确认删除提示词模板',
      description: `确定要彻底删除模板【${selected.name}】及其所有历史快照吗？此操作不可逆。`,
      danger: true,
      onConfirm: async () => {
        try {
          const res = await aiHubApi.deleteTemplate(selectedId);
          if (res.success) {
            adminNotify.success('模板删除成功');
            setSelectedId(null);
            await loadData();
          }
        } catch (err: unknown) {
          adminNotify.error(err instanceof Error ? err.message : '删除失败');
        }
      },
    });
  };

  return (
    <AdminWorkbenchShell
      title="AI 智能体与提示词中台 (AI Agent & Prompt Hub)"
      description="深层卷宗解构导师提示词工程、不可变版本快照、秒级回滚与沙盒演练场"
      icon={<Bot className="size-5" />}
      loading={loading}
      onRefresh={loadData}
    >
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'studio' | 'playground' | 'agents')}
        className="w-full gap-2.5"
      >
        {/* 标准 shadcn TabsList 导航 */}
        <TabsList className="h-8 p-0.5 bg-muted/80 self-start">
          <TabsTrigger value="studio" className="h-7 text-xs gap-1.5 px-3 data-[state=active]:shadow-xs">
            <Sparkles className="size-3.5" />
            <span>提示词版本工坊</span>
          </TabsTrigger>
          <TabsTrigger value="playground" className="h-7 text-xs gap-1.5 px-3 data-[state=active]:shadow-xs">
            <Play className="size-3.5" />
            <span>沙盒演练场 (Playground)</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="h-7 text-xs gap-1.5 px-3 data-[state=active]:shadow-xs">
            <Bot className="size-3.5" />
            <span>智能体超参数配置</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: 提示词工坊 */}
        <TabsContent value="studio" className="mt-0">
          <div className="flex flex-col lg:flex-row gap-3 items-start">
            {/* 左侧：卷宗解构模板列表 */}
            <Card className="w-full lg:w-80 shrink-0 border-border/80 shadow-xs flex flex-col h-[calc(100vh-125px)] min-h-[560px] overflow-hidden">
              <CardHeader className="p-3 border-b border-border/80 flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">卷宗解构模板库</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2 gap-1 shrink-0"
                  onClick={async () => {
                    const res = await aiHubApi.createTemplate({
                      name: '新提示词模板',
                      description: '自定义心理学解构模板',
                      content: '你是一位极具同理心的深层解构导师...',
                      agentId: 'agent_dossier_analyst',
                    });
                    if (res.success) {
                      adminNotify.success('新建模板成功');
                      setSelectedId(res.template.id);
                      await loadData();
                    }
                  }}
                >
                  <Plus className="size-3" /> 新建模板
                </Button>
              </CardHeader>

              <div className="flex-1 p-2.5 overflow-y-auto space-y-2">
                {templates.map((t) => {
                  const isCurrent = t.id === selectedId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                        isCurrent
                          ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30'
                          : 'border-border/60 hover:border-border hover:bg-muted/30 bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <strong className="text-xs font-bold text-foreground truncate max-w-[170px]">
                          {t.name}
                        </strong>
                        <div className="flex items-center gap-1 shrink-0">
                          {t.isActive && (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] h-4.5 px-1 font-medium">
                              生效中
                            </Badge>
                          )}
                          <Badge variant="secondary" className="font-mono text-[10px] h-4.5 px-1">
                            v{t.activeVersionNum ?? 1}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{t.description || '卷宗深度心理解构与报告生成'}</p>
                    </div>
                  );
                })}
              </div>

              {/* 侧面版本回滚与辅助操作：按用户明确要求置于侧面，为右侧主提示词腾出全部空间 */}
              {selected && (
                <div className="p-2.5 border-t border-border/80 bg-muted/20 shrink-0 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground truncate max-w-[170px]" title={selected.name}>
                      当前：<strong className="text-foreground">{selected.name}</strong>
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px] h-4.5 px-1.5 shrink-0">
                      v{selected.activeVersionNum ?? 1}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRollbackModalOpen(true)}
                      className="h-7 text-xs px-2 gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 flex-1 justify-center"
                      title="查看不可变历史快照并秒级回滚"
                    >
                      <RotateCcw className="size-3 shrink-0" />
                      <span>版本回滚 ({versions.length})</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDuplicate}
                      className="h-7 text-xs px-2 gap-1 border-border/70 hover:bg-muted shrink-0"
                      title="克隆当前模板副本"
                    >
                      <Copy className="size-3 shrink-0" />
                      <span>副本</span>
                    </Button>
                    {!selected.isBuiltin && !selected.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        className="h-7 px-1.5 text-destructive hover:bg-destructive/10 shrink-0"
                        title="删除该模板"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* 右侧：代码编辑器、变量芯片，单行紧凑头部，绝不折行 */}
            {selected ? (
              <Card className="flex-1 w-full border-border/80 shadow-xs flex flex-col h-[calc(100vh-125px)] min-h-[560px] overflow-hidden">
                <CardHeader className="h-12 px-3.5 border-b border-border/80 flex flex-row items-center justify-between gap-3 bg-card shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="模板名称"
                      className="h-7.5 w-44 text-xs font-bold shrink-0"
                    />

                    {selected.isActive ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] h-6 px-2 shrink-0 font-medium">
                        生效中 v{selected.activeVersionNum ?? 1}
                      </Badge>
                    ) : (
                      <Button variant="outline" size="sm" className="h-6 text-[11px] px-2 text-primary shrink-0" onClick={handleActivate}>
                        设为生效
                      </Button>
                    )}
                    <span className="text-[11px] text-muted-foreground shrink-0 hidden md:inline">
                      更新于 {formatTime(selected.updatedAt).slice(5, 16)}
                    </span>
                  </div>

                  {/* 顶部右侧核心保存与升版按钮：单行稳固排列在右上角，绝不折行 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDraftSave}
                      disabled={saving}
                      className="h-7.5 px-3 gap-1.5 text-xs shrink-0"
                    >
                      <Save className="size-3.5" />
                      <span>保存草稿</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setVersionModalOpen(true)}
                      className="h-7.5 px-3 gap-1.5 text-xs shrink-0"
                    >
                      <Sparkles className="size-3.5" />
                      <span>固化为新版本 (v{(selected.activeVersionNum ?? 1) + 1})</span>
                    </Button>
                  </div>
                </CardHeader>

                <div className="flex-1 p-3 sm:p-3.5 flex flex-col gap-2 overflow-hidden min-h-0">
                  {/* 极简插桩变量栏 */}
                  <PromptVariableBar variables={variables} onSelectVariable={handleInsertVariable} />

                  {/* 核心系统提示词主体：绝对重点，完全撑满容器，无需任何下滑 */}
                  <div className="flex-1 flex flex-col gap-1 min-h-0">
                    <div className="flex items-center justify-between text-xs px-0.5 shrink-0">
                      <label className="font-bold text-foreground flex items-center gap-1.5">
                        <span>系统提示词主体 (System Prompt)</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground font-normal">
                          核心中枢
                        </Badge>
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        支持使用 {"{{user.occupation}}"} 等动态变量插桩
                      </span>
                    </div>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      spellCheck={false}
                      className="flex-1 w-full rounded-lg border border-input bg-muted/10 p-3.5 text-xs leading-relaxed font-mono shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground resize-none"
                      placeholder="在此输入大模型系统级 Prompt 设定..."
                    />
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="flex-1 border-border/80 shadow-xs flex items-center justify-center p-12 text-muted-foreground text-sm">
                请从左侧选择一个提示词模板进行编辑
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: 沙盒演练场 */}
        <TabsContent value="playground" className="mt-0">
          <PromptPlayground
            agents={agents}
            templates={templates}
            selectedTemplateId={selectedId}
            currentDraftPrompt={content}
          />
        </TabsContent>

        {/* Tab 3: 智能体超参数配置 */}
        <TabsContent value="agents" className="mt-0">
          <AiAgentStudio agents={agents} onReload={loadData} />
        </TabsContent>
      </Tabs>

      {/* 升版快照弹窗 */}
      {selected && (
        <PromptVersionModal
          opened={versionModalOpen}
          templateName={selected.name}
          onClose={() => setVersionModalOpen(false)}
          onSubmit={handleCreateSnapshot}
        />
      )}

      {/* 版本回滚弹窗 */}
      {selected && (
        <PromptRollbackModal
          opened={rollbackModalOpen}
          templateName={selected.name}
          versions={versions}
          currentVersionId={selected.activeVersionId ?? null}
          onClose={() => setRollbackModalOpen(false)}
          onRollback={handleRollback}
        />
      )}

      {/* 确认删除对话框 */}
      <AdminConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        danger={confirmConfig.danger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </AdminWorkbenchShell>
  );
};

export default PromptWorkbench;
