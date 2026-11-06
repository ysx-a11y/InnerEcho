import React, { useCallback, useEffect, useState } from 'react';
import {
  Siren,
  Save,
  MessageSquare,
  Clock,
  User,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Table, Badge, Paper, Text, Group, Button, Loader } from '@mantine/core';
import { interrogationApi, formatTime } from '../adminApi';
import type { AdminInterrogationConfig, AdminInterrogationSession } from '../adminTypes';
import { adminNotify } from './ui/adminNotify';
import { AdminWorkbenchShell } from './ui/AdminWorkbenchShell';

const TURN_RANGE = { min: 1, max: 20 };
const INPUT_RANGE = { min: 64, max: 8000 };
const OUTPUT_RANGE = { min: 32, max: 2000 };
const PROMPT_LIMITS = { interrogatorPrompt: 4000, summaryPrompt: 1600 } as const;

const STATUS_LABEL: Record<string, string> = {
  active: '审讯中',
  exhausted: '已问完',
  summarized: '已总结',
};

const STATUS_COLOR: Record<string, string> = {
  active: 'pink',
  exhausted: 'yellow',
  summarized: 'teal',
};

export const InterrogationWorkbench: React.FC = () => {
  const [config, setConfig] = useState<AdminInterrogationConfig | null>(null);
  const [sessions, setSessions] = useState<AdminInterrogationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, sessionsRes] = await Promise.all([
        interrogationApi.getConfig(),
        interrogationApi.listSessions(30),
      ]);
      if (configRes.success) setConfig(configRes.config);
      if (sessionsRes.success) setSessions(sessionsRes.items);
    } catch {
      adminNotify.error('加载审讯室配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateField = (key: 'maxTurns' | 'maxInputTokens' | 'maxOutputTokens', raw: string) => {
    if (!config) return;
    const value = Number(raw);
    setConfig({ ...config, [key]: Number.isFinite(value) ? value : 0 });
  };

  const updatePrompt = (key: 'interrogatorPrompt' | 'summaryPrompt', raw: string) => {
    if (!config) return;
    setConfig({ ...config, [key]: raw });
  };

  const validate = (): string | null => {
    if (!config) return '配置未加载';
    if (config.maxTurns < TURN_RANGE.min || config.maxTurns > TURN_RANGE.max) {
      return `对话轮数需在 ${TURN_RANGE.min}-${TURN_RANGE.max} 之间`;
    }
    if (config.maxInputTokens < INPUT_RANGE.min || config.maxInputTokens > INPUT_RANGE.max) {
      return `输入 token 需在 ${INPUT_RANGE.min}-${INPUT_RANGE.max} 之间`;
    }
    if (config.maxOutputTokens < OUTPUT_RANGE.min || config.maxOutputTokens > OUTPUT_RANGE.max) {
      return `输出 token 需在 ${OUTPUT_RANGE.min}-${OUTPUT_RANGE.max} 之间`;
    }
    if (config.interrogatorPrompt.length > PROMPT_LIMITS.interrogatorPrompt) {
      return `审讯者提示词不能超过 ${PROMPT_LIMITS.interrogatorPrompt} 个字符`;
    }
    if (config.summaryPrompt.length > PROMPT_LIMITS.summaryPrompt) {
      return `总结提示词不能超过 ${PROMPT_LIMITS.summaryPrompt} 个字符`;
    }
    return null;
  };

  const handleSave = async () => {
    if (!config) return;
    const error = validate();
    if (error) {
      adminNotify.error(error);
      return;
    }
    try {
      setSaving(true);
      const res = await interrogationApi.updateConfig({
        maxTurns: config.maxTurns,
        maxInputTokens: config.maxInputTokens,
        maxOutputTokens: config.maxOutputTokens,
        interrogatorPrompt: config.interrogatorPrompt,
        summaryPrompt: config.summaryPrompt,
      });
      if (res.success) {
        setConfig(res.config);
        adminNotify.success('审讯室参数已保存，下一轮对话即刻生效');
      } else {
        adminNotify.error('保存失败，请稍后重试');
      }
    } catch {
      adminNotify.error('网络异常，保存失败');
    } finally {
      setSaving(false);
    }
  };

  /** 传空串让服务端回填默认文案，并立刻把返回的实际文本写回表单。 */
  const handleResetPrompt = async (key: 'interrogatorPrompt' | 'summaryPrompt') => {
    if (!config) return;
    try {
      setSaving(true);
      const res = await interrogationApi.updateConfig(
        key === 'interrogatorPrompt' ? { interrogatorPrompt: '' } : { summaryPrompt: '' },
      );
      if (res.success) {
        setConfig(res.config);
        adminNotify.success(key === 'interrogatorPrompt' ? '审讯者提示词已恢复默认' : '总结提示词已恢复默认');
      } else {
        adminNotify.error('恢复默认失败，请稍后重试');
      }
    } catch {
      adminNotify.error('网络异常，恢复失败');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.7rem',
    borderRadius: 10,
    border: '1px solid rgba(255, 112, 166, 0.22)',
    background: 'rgba(8, 3, 12, 0.65)',
    color: '#f5e9f3',
    fontSize: '0.86rem',
    outline: 'none',
  };

  return (
    <AdminWorkbenchShell
      title="审讯室 · 测试功能"
      description={`用户最多交互 ${config?.maxTurns ?? 5} 轮。每轮输入/输出预算为成本护栏，提示词保存后下一轮即刻生效。`}
      icon={<Siren size={20} />}
      loading={loading}
      onRefresh={loadData}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading && !config ? (
          <Paper p="xl" radius="lg" withBorder style={{ textAlign: 'center', background: 'rgba(25, 20, 35, 0.65)' }}>
            <Group justify="center" gap="xs">
              <Loader size="sm" color="pink" />
              <Text size="sm" c="dimmed">正在读取配置…</Text>
            </Group>
          </Paper>
        ) : (
          <Paper
            p="md"
            radius="lg"
            withBorder
            style={{
              background: 'rgba(25, 20, 35, 0.65)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem' }}>
              <Sparkles size={16} color="#ff70a6" />
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>参数与提示词配置</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.8rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'rgba(245, 233, 243, 0.65)', marginBottom: 4 }}>
                  最大交互轮数（{TURN_RANGE.min}-{TURN_RANGE.max}）
                </label>
                <input
                  type="number"
                  min={TURN_RANGE.min}
                  max={TURN_RANGE.max}
                  value={config?.maxTurns ?? 5}
                  onChange={(event) => updateField('maxTurns', event.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'rgba(245, 233, 243, 0.65)', marginBottom: 4 }}>
                  单轮输入 token 上限（{INPUT_RANGE.min}-{INPUT_RANGE.max}）
                </label>
                <input
                  type="number"
                  min={INPUT_RANGE.min}
                  max={INPUT_RANGE.max}
                  step={64}
                  value={config?.maxInputTokens ?? 1200}
                  onChange={(event) => updateField('maxInputTokens', event.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'rgba(245, 233, 243, 0.65)', marginBottom: 4 }}>
                  单轮输出 token 上限（{OUTPUT_RANGE.min}-{OUTPUT_RANGE.max}）
                </label>
                <input
                  type="number"
                  min={OUTPUT_RANGE.min}
                  max={OUTPUT_RANGE.max}
                  step={32}
                  value={config?.maxOutputTokens ?? 300}
                  onChange={(event) => updateField('maxOutputTokens', event.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                {
                  key: 'interrogatorPrompt' as const,
                  title: '审讯者系统提示词',
                  limit: PROMPT_LIMITS.interrogatorPrompt,
                  rows: 9,
                },
                {
                  key: 'summaryPrompt' as const,
                  title: '总结系统提示词',
                  limit: PROMPT_LIMITS.summaryPrompt,
                  rows: 4,
                },
              ].map((item) => (
                <div key={item.key}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.74rem', color: 'rgba(245, 233, 243, 0.75)', fontWeight: 600 }}>
                      {item.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color:
                          (config?.[item.key].length ?? 0) > item.limit
                            ? '#ff6b81'
                            : 'rgba(245, 233, 243, 0.4)',
                      }}
                    >
                      {config?.[item.key].length ?? 0} / {item.limit}
                    </span>
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      color="gray"
                      onClick={() => void handleResetPrompt(item.key)}
                      disabled={saving}
                    >
                      恢复默认
                    </Button>
                  </div>
                  <textarea
                    value={config?.[item.key] ?? ''}
                    onChange={(event) => updatePrompt(item.key, event.target.value)}
                    rows={item.rows}
                    spellCheck={false}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
                  />
                </div>
              ))}
              <Text size="xs" c="dimmed">
                审讯者提示词里的 {'{{dossier}}'} 会被替换成来访者档案；不写这个占位符也会自动把档案追加在末尾。
              </Text>
            </div>

            <Group mt="md" gap="sm">
              <Button
                color="pink"
                size="xs"
                radius="md"
                onClick={handleSave}
                disabled={saving}
                leftSection={saving ? <Loader size={12} color="white" /> : <Save size={13} />}
              >
                {saving ? '保存中…' : '保存参数'}
              </Button>
              {config?.updatedAt && (
                <Text size="xs" c="dimmed">
                  <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  上次保存：{formatTime(config.updatedAt)}
                </Text>
              )}
            </Group>
          </Paper>
        )}

        <Paper
          p="md"
          radius="lg"
          withBorder
          style={{
            background: 'rgba(25, 20, 35, 0.65)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <MessageSquare size={16} color="#ff70a6" />
              <Text size="sm" fw={700}>最近审讯会话</Text>
            </Group>
            <Text size="xs" c="dimmed">只读，最近 30 条</Text>
          </Group>

          {sessions.length === 0 ? (
            <Text py="xl" ta="center" size="sm" c="dimmed">
              <AlertCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
              还没有人进过审讯室
            </Text>
          ) : (
            <Table.ScrollContainer minWidth={500}>
              <Table highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>用户</Table.Th>
                    <Table.Th>状态</Table.Th>
                    <Table.Th>轮次</Table.Th>
                    <Table.Th>开始时间</Table.Th>
                    <Table.Th>总结生成时间</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sessions.map((session) => (
                    <Table.Tr key={session.id}>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          <User size={12} color="rgba(245, 233, 243, 0.5)" />
                          <Text size="xs">{session.email || session.userId}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="xs" variant="light" color={STATUS_COLOR[session.status] || 'gray'}>
                          {STATUS_LABEL[session.status] || session.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">{session.turnCount}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">{formatTime(session.createdAt)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {session.summaryGeneratedAt ? formatTime(session.summaryGeneratedAt) : '—'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Paper>
      </div>
    </AdminWorkbenchShell>
  );
};
