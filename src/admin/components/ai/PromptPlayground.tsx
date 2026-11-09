import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, Clock, Zap, Cpu, Loader2 } from 'lucide-react';
import { aiHubApi } from '../../adminApi';
import type {
  AiAgentContract,
  PromptTemplate,
  PlaygroundRunResponse,
} from '../../adminTypes';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

interface PromptPlaygroundProps {
  agents: AiAgentContract[];
  templates: PromptTemplate[];
  selectedTemplateId?: string | null;
  currentDraftPrompt?: string;
}

export const PromptPlayground: React.FC<PromptPlaygroundProps> = ({
  agents,
  templates: _templates,
  selectedTemplateId,
  currentDraftPrompt,
}) => {
  const [targetAgentId, setTargetAgentId] = useState<string>(
    agents[0]?.id ?? 'agent_dossier_analyst'
  );
  const [mockSource, setMockSource] = useState<'preset_mock' | 'real_dossier'>('preset_mock');
  const [dossierId, setDossierId] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PlaygroundRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <Card className="border border-border shadow-xs">
      <CardHeader className="gap-2 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Play className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">沙盒演练场 (Prompt Playground)</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              免做题实时 Dry-Run 测试当前编辑的提示词。支持变量自动替换、防注入包装、输出契约与耗时评估。
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleRun}
            disabled={running}
            className="gap-1.5"
          >
            {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            <span>即时运行演练 (Dry-Run)</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">目标智能体 (Agent)</label>
            <Select value={targetAgentId} onValueChange={setTargetAgentId}>
              <SelectTrigger size="sm" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.interactionMode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">模拟测试数据源</label>
            <Select
              value={mockSource}
              onValueChange={(val) => setMockSource(val as 'preset_mock' | 'real_dossier')}
            >
              <SelectTrigger size="sm" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preset_mock">内置标准模拟画像 (法务精英反差自白)</SelectItem>
                <SelectItem value="real_dossier">加载线上真实卷宗 (按卷宗ID)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {mockSource === 'real_dossier' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">真实卷宗 ID</label>
            <Input
              type="text"
              placeholder="输入 dos_ 开头的卷宗 ID"
              value={dossierId}
              onChange={(e) => setDossierId(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-3 pt-2">
            {/* 性能与契约指标栏 */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 text-foreground">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>耗时: {result.metrics.durationMs} ms</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground">
                  <Zap className="size-3.5 text-amber-500" />
                  <span>
                    预估 Token: ~{result.metrics.estimatedPromptTokens + result.metrics.estimatedCompletionTokens}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground">
                  <Cpu className="size-3.5 text-muted-foreground" />
                  <span>模型: {result.metrics.model}</span>
                </div>
              </div>

              <div>
                {result.validation.isValid ? (
                  <Badge variant="outline" className="gap-1 border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    契约校验通过
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" />
                    契约缺失: {result.validation.missingFields.join(', ') || result.validation.issues.join(', ')}
                  </Badge>
                )}
              </div>
            </div>

            {/* 渲染结果视图 */}
            <Tabs defaultValue="response" className="w-full">
              <TabsList>
                <TabsTrigger value="response">LLM 实际生成结果</TabsTrigger>
                <TabsTrigger value="prompt">变量替换后的完整 Prompt</TabsTrigger>
                {result.parsedJson && <TabsTrigger value="json">解析后的 JSON 结构</TabsTrigger>}
              </TabsList>

              <TabsContent value="response" className="pt-2">
                <div className="rounded-lg border border-border bg-card p-3 font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {result.rawResponse}
                </div>
              </TabsContent>

              <TabsContent value="prompt" className="pt-2">
                <pre className="max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {result.renderedFullPrompt}
                </pre>
              </TabsContent>

              {result.parsedJson && (
                <TabsContent value="json" className="pt-2">
                  <pre className="max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground leading-relaxed">
                    {JSON.stringify(result.parsedJson, null, 2)}
                  </pre>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PromptPlayground;
