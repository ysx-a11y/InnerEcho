import React, { useState } from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  Button,
  Select,
  Textarea,
  Badge,
  Code,
  Tabs,
  Alert,
  Loader,
} from '@mantine/core';
import { Play, CheckCircle2, AlertTriangle, Clock, Zap, Cpu } from 'lucide-react';
import { aiHubApi } from '../../adminApi';
import type {
  AiAgentContract,
  PromptTemplate,
  PlaygroundRunResponse,
} from '../../adminTypes';

interface PromptPlaygroundProps {
  agents: AiAgentContract[];
  templates: PromptTemplate[];
  selectedTemplateId?: string | null;
  currentDraftPrompt?: string;
}

export const PromptPlayground: React.FC<PromptPlaygroundProps> = ({
  agents,
  templates,
  selectedTemplateId,
  currentDraftPrompt,
}) => {
  const [targetAgentId, setTargetAgentId] = useState<string | null>(
    agents[0]?.id ?? 'agent_dossier_analyst'
  );
  const [mockSource, setMockSource] = useState<'preset_mock' | 'real_dossier'>('preset_mock');
  const [dossierId, setDossierId] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PlaygroundRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const agentOptions = agents.map((a) => ({
    value: a.id,
    label: `${a.name} (${a.interactionMode})`,
  }));

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await aiHubApi.runPlayground({
        agentId: targetAgentId || undefined,
        templateId: selectedTemplateId || undefined,
        draftSystemPrompt: currentDraftPrompt || undefined,
        mockSource,
        dossierId: mockSource === 'real_dossier' ? dossierId.trim() : undefined,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '演练执行失败');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Paper p="md" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
      <Group justify="space-between" mb="md">
        <div>
          <Group gap="xs">
            <Play size={18} color="#80f3ff" />
            <Text fw={700} size="md">
              沙盒演练场 (Prompt Playground)
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            免做题实时 Dry-Run 测试当前编辑的提示词。支持变量自动替换、防注入包装、输出契约与耗时评估。
          </Text>
        </div>

        <Button
          color="cyan"
          leftSection={running ? <Loader size={14} color="white" /> : <Play size={14} />}
          onClick={handleRun}
          loading={running}
        >
          即时运行演练 (Dry-Run)
        </Button>
      </Group>

      <Group grow mb="md">
        <Select
          label="目标智能体 (Agent)"
          data={agentOptions}
          value={targetAgentId}
          onChange={setTargetAgentId}
          size="xs"
        />

        <Select
          label="模拟测试数据源"
          data={[
            { value: 'preset_mock', label: '内置标准模拟画像 (法务精英反差自白)' },
            { value: 'real_dossier', label: '加载线上真实卷宗 (按卷宗ID)' },
          ]}
          value={mockSource}
          onChange={(val) => setMockSource((val as 'preset_mock' | 'real_dossier') || 'preset_mock')}
          size="xs"
        />
      </Group>

      {mockSource === 'real_dossier' && (
        <Textarea
          label="真实卷宗 ID"
          placeholder="输入 dos_ 开头的卷宗 ID"
          value={dossierId}
          onChange={(e) => setDossierId(e.currentTarget.value)}
          size="xs"
          mb="md"
        />
      )}

      {error && (
        <Alert icon={<AlertTriangle size={16} />} color="red" mb="md">
          {error}
        </Alert>
      )}

      {result && (
        <Stack gap="sm">
          {/* 性能与契约指标栏 */}
          <Paper p="xs" withBorder style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
            <Group justify="space-between">
              <Group gap="lg">
                <Group gap={4}>
                  <Clock size={14} color="#80f3ff" />
                  <Text size="xs">耗时: {result.metrics.durationMs} ms</Text>
                </Group>
                <Group gap={4}>
                  <Zap size={14} color="#eab308" />
                  <Text size="xs">
                    预估 Token: ~{result.metrics.estimatedPromptTokens + result.metrics.estimatedCompletionTokens}
                  </Text>
                </Group>
                <Group gap={4}>
                  <Cpu size={14} color="#a78bfa" />
                  <Text size="xs">模型: {result.metrics.model}</Text>
                </Group>
              </Group>

              <Group gap="xs">
                {result.validation.isValid ? (
                  <Badge color="teal" variant="light" leftSection={<CheckCircle2 size={12} />}>
                    契约校验通过
                  </Badge>
                ) : (
                  <Badge color="red" variant="light" leftSection={<AlertTriangle size={12} />}>
                    契约缺失: {result.validation.missingFields.join(', ') || result.validation.issues.join(', ')}
                  </Badge>
                )}
              </Group>
            </Group>
          </Paper>

          {/* 渲染结果视图 */}
          <Tabs defaultValue="response">
            <Tabs.List>
              <Tabs.Tab value="response">LLM 实际生成结果</Tabs.Tab>
              <Tabs.Tab value="prompt">变量替换后的完整 Prompt</Tabs.Tab>
              {result.parsedJson && <Tabs.Tab value="json">解析后的 JSON 结构</Tabs.Tab>}
            </Tabs.List>

            <Tabs.Panel value="response" pt="xs">
              <Paper p="sm" withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <Text size="xs" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {result.rawResponse}
                </Text>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="prompt" pt="xs">
              <Code block style={{ maxHeight: '250px', overflowY: 'auto', fontSize: '11px' }}>
                {result.renderedFullPrompt}
              </Code>
            </Tabs.Panel>

            {result.parsedJson && (
              <Tabs.Panel value="json" pt="xs">
                <Code block style={{ maxHeight: '250px', overflowY: 'auto', fontSize: '11px' }}>
                  {JSON.stringify(result.parsedJson, null, 2)}
                </Code>
              </Tabs.Panel>
            )}
          </Tabs>
        </Stack>
      )}
    </Paper>
  );
};

