import React, { useState } from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  Badge,
  Slider,
  Select,
  TextInput,
  Textarea,
  Button,
  SimpleGrid,
} from '@mantine/core';
import { Bot, Save, Sparkles } from 'lucide-react';
import { aiHubApi } from '../../adminApi';
import { adminNotify } from '../ui/adminNotify';
import type { AiAgentContract } from '../../adminTypes';

interface AiAgentStudioProps {
  agents: AiAgentContract[];
  onReload: () => void;
}

const MODE_COLOR: Record<string, string> = {
  analysis: 'pink',
  chat: 'red',
  summary: 'cyan',
};

const MODE_LABEL: Record<string, string> = {
  analysis: '结构化分析',
  chat: '多轮对抗交锋',
  summary: '收敛结案总结',
};

export const AiAgentStudio: React.FC<AiAgentStudioProps> = ({ agents, onReload }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, Partial<AiAgentContract>>>({});
  const [saving, setSaving] = useState(false);

  const getAgentState = (agent: AiAgentContract) => {
    return {
      temperature: agent.temperature,
      defaultModel: agent.defaultModel,
      maxOutputTokens: agent.maxOutputTokens,
      remark: agent.remark,
      adminNotes: agent.adminNotes,
      ...(formState[agent.id] || {}),
    };
  };

  const updateState = (agentId: string, patch: Partial<AiAgentContract>) => {
    setFormState((prev) => ({
      ...prev,
      [agentId]: {
        ...(prev[agentId] || {}),
        ...patch,
      },
    }));
  };

  const handleSave = async (agent: AiAgentContract) => {
    setSaving(true);
    try {
      const patch = formState[agent.id] || {};
      await aiHubApi.updateAgent(agent.id, patch);
      adminNotify.success(`智能体【${agent.name}】参数更新成功`);
      setEditingId(null);
      onReload();
    } catch {
      adminNotify.error('保存智能体配置失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
      {agents.map((agent) => {
        const state = getAgentState(agent);
        const isEditing = editingId === agent.id;

        return (
          <Paper
            key={agent.id}
            p="md"
            withBorder
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Bot size={18} color="#ff70a6" />
                  <Text fw={700} size="sm">
                    {agent.name}
                  </Text>
                </Group>
                <Badge
                  color={MODE_COLOR[agent.interactionMode] || 'blue'}
                  variant="light"
                  size="xs"
                >
                  {MODE_LABEL[agent.interactionMode] || agent.interactionMode}
                </Badge>
              </Group>

              <Text size="xs" c="dimmed" mb="md" style={{ minHeight: '36px' }}>
                {agent.description}
              </Text>

              <Stack gap="xs" mb="md">
                <Select
                  label="默认推荐模型"
                  size="xs"
                  data={[
                    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (深层高智力)' },
                    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (极速经济)' },
                    { value: 'deepseek-chat', label: 'DeepSeek Chat (国产高性价比)' },
                  ]}
                  value={state.defaultModel}
                  onChange={(val) => {
                    setEditingId(agent.id);
                    updateState(agent.id, { defaultModel: val || 'gemini-1.5-pro' });
                  }}
                />

                <div>
                  <Group justify="space-between" mb={2}>
                    <Text size="xs">发散温度 (Temperature):</Text>
                    <Text size="xs" fw={700} c="pink">
                      {state.temperature}
                    </Text>
                  </Group>
                  <Slider
                    min={0.1}
                    max={1.5}
                    step={0.05}
                    value={state.temperature}
                    onChange={(val) => {
                      setEditingId(agent.id);
                      updateState(agent.id, { temperature: val });
                    }}
                    color="pink"
                    size="sm"
                  />
                  <Text size="10px" c="dimmed" mt={2}>
                    {state.temperature! > 0.8
                      ? '文学性与想象力丰富'
                      : state.temperature! < 0.6
                      ? '冷峻严密、逻辑收敛'
                      : '平衡输出'}
                  </Text>
                </div>

                <TextInput
                  label="业务属性说明 (Remark)"
                  size="xs"
                  value={state.remark || ''}
                  onChange={(e) => {
                    setEditingId(agent.id);
                    updateState(agent.id, { remark: e.currentTarget.value });
                  }}
                />

                <Textarea
                  label="管理员运维备忘 (Admin Notes)"
                  size="xs"
                  minRows={2}
                  value={state.adminNotes || ''}
                  onChange={(e) => {
                    setEditingId(agent.id);
                    updateState(agent.id, { adminNotes: e.currentTarget.value });
                  }}
                />
              </Stack>
            </div>

            <Group justify="flex-end" pt="xs">
              <Button
                size="xs"
                variant={isEditing ? 'filled' : 'light'}
                color="pink"
                leftSection={<Save size={12} />}
                onClick={() => handleSave(agent)}
                loading={saving && editingId === agent.id}
              >
                保存该角色配置
              </Button>
            </Group>
          </Paper>
        );
      })}
    </SimpleGrid>
  );
};

