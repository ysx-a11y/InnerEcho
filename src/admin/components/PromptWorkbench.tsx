import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Tabs,
  Paper,
  Group,
  Stack,
  Text,
  Button,
  Badge,
  Textarea,
  TextInput,
  Select,
  Code,
  Tooltip,
  Alert,
} from '@mantine/core';
import {
  Bot,
  Sparkles,
  Play,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  FileCode2,
  Check,
  AlertCircle,
  Variable,
  Layers,
} from 'lucide-react';
import { aiHubApi, adminApi, formatTime } from '../adminApi';
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

export const PROMPT_CATEGORY_OPTIONS: { key: string; label: string; badgeColor: string; desc: string }[] = [
  { key: 'all', label: '通用全部', badgeColor: '#a78bfa', desc: '全部分类默认兜底' },
  { key: 'scenario', label: '情境切片', badgeColor: '#ec4899', desc: '沉浸场景剧情与代入' },
  { key: 'direct', label: '真实自白', badgeColor: '#ff3377', desc: '原始倾诉与社死自白' },
  { key: 'preference', label: '权责谱系', badgeColor: '#ff70a6', desc: 'BDSM / 权责与属性量表' },
  { key: 'scientific', label: '心相镜像', badgeColor: '#80f3ff', desc: '心理学机制与客观镜像' },
];

const REQUIRED_OUTPUT_FIELDS = [
  'archetypeTitle',
  'disparityScore',
  'personaDeconstruction',
  'shadowDeconstruction',
  'psychologicalSublimation',
  'resonanceKeywords',
];

export const PromptWorkbench: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('studio');
  const [agents, setAgents] = useState<AiAgentContract[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [variables, setVariables] = useState<PromptVariableContract[]>([]);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
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

      // 异步加载该模板的版本历史
      void aiHubApi.listVersions(selectedId).then((res) => {
        if (res.success) setVersions(res.versions);
      });
    }
  }, [selectedId, templates]);

  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [templates, selectedId]
  );

  const filteredTemplates = useMemo(() => {
    if (selectedAgentFilter === 'all') return templates;
    return templates.filter((t) => (t.agentId || 'agent_dossier_analyst') === selectedAgentFilter);
  }, [templates, selectedAgentFilter]);

  const missingFields = useMemo(() => {
    if (selected?.agentId && selected.agentId !== 'agent_dossier_analyst') return [];
    return REQUIRED_OUTPUT_FIELDS.filter((field) => !content.includes(field));
  }, [content, selected]);

  // 插入动态变量
  const handleInsertVariable = (placeholder: string) => {
    setContent((prev) => `${prev} ${placeholder} `);
    adminNotify.info(`已插入变量 ${placeholder}`);
  };

  // 保存当前草稿更改
  const handleDraftSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await aiHubApi.updateTemplate(selectedId, {
        name: name.trim(),
        description: description.trim(),
        content,
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

  // 固化新版本快照
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

  // 一键回滚
  const handleRollback = async (data: { targetVersionId: string; adminNotes: string; remark: string }) => {
    if (!selectedId) return;
    const res = await aiHubApi.rollbackVersion(selectedId, data);
    if (res.success) {
      adminNotify.success(res.message || '回滚完成');
      await loadData();
    }
  };

  // 复制为新模板
  const handleDuplicate = async () => {
    if (!selected) return;
    try {
      const res = await aiHubApi.createTemplate({
        name: `${selected.name} (副本)`,
        description: selected.description,
        content,
        agentId: selected.agentId,
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

  // 激活模板
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

  // 删除模板
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
      description="统一管理卷宗解构师、审讯室主审官人设、不可变版本快照、秒级回滚与沙盒演练场"
      icon={<Bot size={22} color="#ff70a6" />}
      loading={loading}
      onRefresh={loadData}
    >
      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'studio')} mb="lg">
        <Tabs.List>
          <Tabs.Tab value="studio" leftSection={<Sparkles size={14} color="#ff70a6" />}>
            提示词版本工坊
          </Tabs.Tab>
          <Tabs.Tab value="playground" leftSection={<Play size={14} color="#80f3ff" />}>
            沙盒演练场 (Playground)
          </Tabs.Tab>
          <Tabs.Tab value="agents" leftSection={<Bot size={14} color="#a78bfa" />}>
            智能体超参数配置
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: 提示词工坊 */}
        <Tabs.Panel value="studio" pt="md">
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.2rem', alignItems: 'start' }}>
            {/* 左侧：模板列表与过滤 */}
            <Paper p="md" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" fw={700} c="dimmed">
                  归属角色过滤
                </Text>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="pink"
                  leftSection={<Plus size={12} />}
                  onClick={async () => {
                    const res = await aiHubApi.createTemplate({
                      name: '新提示词模板',
                      description: '自定义心理学解构模板',
                      content: '你是一位极具同理心的深层解构导师...',
                      agentId: selectedAgentFilter === 'all' ? 'agent_dossier_analyst' : selectedAgentFilter,
                    });
                    if (res.success) {
                      adminNotify.success('新建模板成功');
                      setSelectedId(res.template.id);
                      await loadData();
                    }
                  }}
                >
                  新建模板
                </Button>
              </Group>

              <Select
                size="xs"
                mb="md"
                data={[
                  { value: 'all', label: '全部角色模板' },
                  ...agents.map((a) => ({ value: a.id, label: a.name })),
                ]}
                value={selectedAgentFilter}
                onChange={(val) => setSelectedAgentFilter(val || 'all')}
              />

              <Stack gap="xs">
                {filteredTemplates.map((t) => {
                  const isCurrent = t.id === selectedId;
                  return (
                    <Paper
                      key={t.id}
                      p="xs"
                      withBorder
                      onClick={() => setSelectedId(t.id)}
                      style={{
                        cursor: 'pointer',
                        borderColor: isCurrent ? '#ff70a6' : 'rgba(255, 255, 255, 0.08)',
                        backgroundColor: isCurrent ? 'rgba(255, 112, 166, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                      }}
                    >
                      <Group justify="space-between" mb={2}>
                        <Text size="xs" fw={700} truncate style={{ maxWidth: '180px' }}>
                          {t.name}
                        </Text>
                        <Group gap={4}>
                          {t.isActive && (
                            <Badge color="teal" variant="light" size="xs">
                              生效中
                            </Badge>
                          )}
                          <Badge color="pink" variant="outline" size="xs">
                            v{t.activeVersionNum ?? 1}
                          </Badge>
                        </Group>
                      </Group>
                      <Text size="11px" c="dimmed" truncate>
                        {t.description || '无描述'}
                      </Text>
                    </Paper>
                  );
                })}
              </Stack>
            </Paper>

            {/* 右侧：代码编辑器、变量芯片、版本快照 */}
            {selected ? (
              <Paper p="md" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                {/* 顶栏操作 */}
                <Group justify="space-between" mb="md">
                  <div>
                    <Group gap="xs">
                      <Text fw={700} size="md">
                        {selected.name}
                      </Text>
                      {selected.isActive ? (
                        <Badge color="teal" variant="light">
                          当前生产生效版本 v{selected.activeVersionNum ?? 1}
                        </Badge>
                      ) : (
                        <Button size="compact-xs" color="teal" variant="light" onClick={handleActivate}>
                          设为当前生效
                        </Button>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      最后更新: {formatTime(selected.updatedAt)} | 关联版本 ID: {selected.activeVersionId}
                    </Text>
                  </div>

                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      color="yellow"
                      leftSection={<RotateCcw size={12} />}
                      onClick={() => setRollbackModalOpen(true)}
                    >
                      版本回滚 ({versions.length})
                    </Button>
                    <Button
                      size="xs"
                      variant="default"
                      leftSection={<Copy size={12} />}
                      onClick={handleDuplicate}
                    >
                      创建副本
                    </Button>
                    {!selected.isBuiltin && !selected.isActive && (
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        leftSection={<Trash2 size={12} />}
                        onClick={handleDelete}
                      >
                        删除
                      </Button>
                    )}
                  </Group>
                </Group>

                {/* 动态变量快捷插入芯片栏 */}
                <PromptVariableBar variables={variables} onSelectVariable={handleInsertVariable} />

                {/* 核心系统提示词编辑区 */}
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <Textarea
                    label="系统提示词主体 (System Prompt)"
                    description="支持使用 {{user.occupation}} 等变量占位符，运行时将安全注入并隔离"
                    value={content}
                    onChange={(e) => setContent(e.currentTarget.value)}
                    minRows={16}
                    maxRows={28}
                    styles={{
                      input: {
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        lineHeight: 1.6,
                        backgroundColor: '#0a0d14',
                        color: '#f1f5f9',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  />
                </div>

                {/* 契约缺失告警 */}
                {missingFields.length > 0 && (
                  <Alert icon={<AlertCircle size={16} />} color="yellow" mb="md">
                    <Text size="xs">
                      卷宗解构模型需要输出标准 JSON，当前提示词疑似遗漏必要契约字段：
                      <strong> {missingFields.join(', ')}</strong>。请确保在提示词末尾保留 JSON 输出声明。
                    </Text>
                  </Alert>
                )}

                {/* 底部保存按钮组 */}
                <Group justify="space-between" pt="xs" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <Button
                    variant="default"
                    size="sm"
                    leftSection={<Save size={14} />}
                    onClick={handleDraftSave}
                    loading={saving}
                  >
                    保存临时草稿
                  </Button>

                  <Button
                    color="pink"
                    size="sm"
                    leftSection={<Sparkles size={14} />}
                    onClick={() => setVersionModalOpen(true)}
                  >
                    固化为新版本快照 (v{(selected.activeVersionNum ?? 1) + 1})
                  </Button>
                </Group>
              </Paper>
            ) : (
              <Paper p="xl" withBorder style={{ textAlign: 'center' }}>
                <Text c="dimmed">请从左侧选择一个提示词模板进行编辑</Text>
              </Paper>
            )}
          </div>
        </Tabs.Panel>

        {/* Tab 2: 沙盒演练场 */}
        <Tabs.Panel value="playground" pt="md">
          <PromptPlayground
            agents={agents}
            templates={templates}
            selectedTemplateId={selectedId}
            currentDraftPrompt={content}
          />
        </Tabs.Panel>

        {/* Tab 3: 智能体超参数配置 */}
        <Tabs.Panel value="agents" pt="md">
          <AiAgentStudio agents={agents} onReload={loadData} />
        </Tabs.Panel>
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
