import React, { useState } from 'react';
import { Bot, Save, Loader2 } from 'lucide-react';
import { aiHubApi } from '../../adminApi';
import { adminNotify } from '../ui/adminNotify';
import type { AiAgentContract } from '../../adminTypes';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface AiAgentStudioProps {
  agents: AiAgentContract[];
  onReload: () => void;
}

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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {agents.map((agent) => {
        const state = getAgentState(agent);
        const isEditing = editingId === agent.id;

        return (
          <Card
            key={agent.id}
            className="flex flex-col justify-between border border-border shadow-xs"
          >
            <div>
              <CardHeader className="gap-1 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bot className="size-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {MODE_LABEL[agent.interactionMode] || agent.interactionMode}
                  </Badge>
                </div>
                <p className="min-h-[32px] text-xs text-muted-foreground line-clamp-2 pt-1">
                  {agent.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">默认推荐模型</label>
                  <Select
                    value={state.defaultModel}
                    onValueChange={(val) => {
                      setEditingId(agent.id);
                      updateState(agent.id, { defaultModel: val });
                    }}
                  >
                    <SelectTrigger size="sm" className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (深层高智力)</SelectItem>
                      <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (极速经济)</SelectItem>
                      <SelectItem value="deepseek-chat">DeepSeek Chat (国产高性价比)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">发散温度 (Temperature):</span>
                    <span className="font-mono font-bold text-primary">{state.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={state.temperature}
                    onChange={(e) => {
                      setEditingId(agent.id);
                      updateState(agent.id, { temperature: parseFloat(e.target.value) });
                    }}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="text-[10px] text-muted-foreground">
                    {state.temperature! > 0.8
                      ? '文学性与想象力丰富'
                      : state.temperature! < 0.6
                      ? '冷峻严密、逻辑收敛'
                      : '平衡输出'}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">业务属性说明 (Remark)</label>
                  <Input
                    className="h-8 text-xs"
                    value={state.remark || ''}
                    onChange={(e) => {
                      setEditingId(agent.id);
                      updateState(agent.id, { remark: e.target.value });
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">管理员运维备忘 (Admin Notes)</label>
                  <Textarea
                    rows={2}
                    className="min-h-[60px] bg-background text-xs"
                    value={state.adminNotes || ''}
                    onChange={(e) => {
                      setEditingId(agent.id);
                      updateState(agent.id, { adminNotes: e.target.value });
                    }}
                  />
                </div>
              </CardContent>
            </div>

            <div className="flex justify-end p-4 pt-2 border-t border-border">
              <Button
                size="sm"
                variant={isEditing ? 'default' : 'secondary'}
                onClick={() => handleSave(agent)}
                disabled={saving && editingId === agent.id}
                className="gap-1.5"
              >
                {saving && editingId === agent.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                <span>保存该角色配置</span>
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default AiAgentStudio;
