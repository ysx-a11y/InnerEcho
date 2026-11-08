import React, { useCallback, useEffect, useState } from 'react';
import {
  Siren,
  Save,
  MessageSquare,
  Clock,
  User,
  AlertCircle,
  Sparkles,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { interrogationApi, formatTime } from '../adminApi';
import type { AdminInterrogationConfig, AdminInterrogationSession } from '../adminTypes';
import { adminNotify } from './ui/adminNotify';
import { AdminWorkbenchShell } from './ui/AdminWorkbenchShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

const TURN_RANGE = { min: 1, max: 20 };
const INPUT_RANGE = { min: 64, max: 8000 };
const OUTPUT_RANGE = { min: 32, max: 2000 };
const PROMPT_LIMITS = { interrogatorPrompt: 4000, summaryPrompt: 1600 } as const;

const STATUS_LABEL: Record<string, string> = {
  active: '审讯中',
  exhausted: '已问完',
  summarized: '已总结',
};

export const InterrogationWorkbench: React.FC = () => {
  const [config, setConfig] = useState<AdminInterrogationConfig | null>(null);
  const [sessions, setSessions] = useState<AdminInterrogationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSessions, setShowSessions] = useState(false);

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
        adminNotify.success('审讯室配置已保存，下一轮对话即刻生效');
      } else {
        adminNotify.error('保存失败');
      }
    } catch {
      adminNotify.error('保存失败，请检查网络');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPrompt = async (key: 'interrogatorPrompt' | 'summaryPrompt') => {
    if (!config) return;
    try {
      setSaving(true);
      const res = await interrogationApi.updateConfig(
        key === 'interrogatorPrompt' ? { interrogatorPrompt: '' } : { summaryPrompt: '' }
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

  return (
    <AdminWorkbenchShell
      title="审讯室 · 测试功能"
      description={`用户最多交互 ${config?.maxTurns ?? 5} 轮。每轮输入/输出预算为成本护栏，提示词保存后下一轮即刻生效。`}
      icon={<Siren className="size-5" />}
      loading={loading}
      onRefresh={loadData}
    >
      <div className="flex flex-col gap-2.5 w-full">
        {loading && !config ? (
          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-8 flex flex-col items-center justify-center text-muted-foreground gap-2 text-sm">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>正在读取审讯室配置…</span>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="p-3 sm:p-3.5 border-b border-border/80 flex flex-row items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span>参数与提示词配置</span>
                {config?.updatedAt && (
                  <span className="text-[11px] text-muted-foreground font-normal hidden sm:inline-flex items-center gap-1 ml-2">
                    <Clock className="size-3" />
                    上次保存：{formatTime(config.updatedAt)}
                  </span>
                )}
              </CardTitle>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-7 gap-1.5 text-xs px-3"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                <span>{saving ? '保存中…' : '保存配置'}</span>
              </Button>
            </CardHeader>

            <CardContent className="p-3 sm:p-4 space-y-3">
              {/* 紧凑超参数与预算护栏单行化 */}
              <div className="flex flex-wrap items-center gap-4 p-2.5 rounded-lg bg-muted/20 border border-border/60 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground shrink-0">交互轮数:</span>
                  <input
                    type="number"
                    min={TURN_RANGE.min}
                    max={TURN_RANGE.max}
                    value={config?.maxTurns ?? 5}
                    onChange={(event) => updateField('maxTurns', event.target.value)}
                    className="h-7 w-16 rounded border border-input bg-background px-2 text-center text-xs font-mono font-bold"
                  />
                  <span className="text-muted-foreground text-[11px]">轮 (1-20)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground shrink-0">单轮输入上限:</span>
                  <input
                    type="number"
                    min={INPUT_RANGE.min}
                    max={INPUT_RANGE.max}
                    step={64}
                    value={config?.maxInputTokens ?? 1200}
                    onChange={(event) => updateField('maxInputTokens', event.target.value)}
                    className="h-7 w-20 rounded border border-input bg-background px-2 text-center text-xs font-mono font-bold"
                  />
                  <span className="text-muted-foreground text-[11px]">tokens</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground shrink-0">单轮输出上限:</span>
                  <input
                    type="number"
                    min={OUTPUT_RANGE.min}
                    max={OUTPUT_RANGE.max}
                    step={32}
                    value={config?.maxOutputTokens ?? 300}
                    onChange={(event) => updateField('maxOutputTokens', event.target.value)}
                    className="h-7 w-20 rounded border border-input bg-background px-2 text-center text-xs font-mono font-bold"
                  />
                  <span className="text-muted-foreground text-[11px]">tokens</span>
                </div>
              </div>

              {/* 核心提示词双列并排：两栏同时展示，无需下滑即可完整比对与编辑 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {[
                  {
                    key: 'interrogatorPrompt' as const,
                    title: '审讯者系统提示词 (主审官设定)',
                    sub: '{{dossier}} 占位符会自动替换为受访者档案',
                    limit: PROMPT_LIMITS.interrogatorPrompt,
                    rows: 12,
                  },
                  {
                    key: 'summaryPrompt' as const,
                    title: '总结系统提示词 (记录员设定)',
                    sub: '整理本场审讯核心矛盾、回避问题与追问',
                    limit: PROMPT_LIMITS.summaryPrompt,
                    rows: 12,
                  },
                ].map((item) => {
                  const len = config?.[item.key].length ?? 0;
                  const isOver = len > item.limit;
                  return (
                    <div key={item.key} className="flex flex-col gap-1.5 rounded-lg border border-border/70 p-3 bg-card shadow-xs">
                      <div className="flex items-center justify-between text-xs pb-1 border-b border-border/40">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{item.title}</span>
                          <span className="text-[10px] text-muted-foreground">{item.sub}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`font-mono text-[11px] ${isOver ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                            {len} / {item.limit}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleResetPrompt(item.key)}
                            disabled={saving}
                            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1 border border-border/60"
                            title="恢复默认提示词模板"
                          >
                            <RotateCcw className="size-2.5" />
                            <span>恢复默认</span>
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={config?.[item.key] ?? ''}
                        onChange={(event) => updatePrompt(item.key, event.target.value)}
                        rows={item.rows}
                        spellCheck={false}
                        className="flex-1 w-full bg-muted/10 p-2.5 text-xs leading-relaxed font-mono resize-y min-h-[220px]"
                        placeholder="在此配置系统提示词..."
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 最近审讯会话：折叠抽屉模式，默认不挤占上方核心编辑空间 */}
        <Card className="border-border/80 shadow-xs overflow-hidden">
          <CardHeader
            className="p-3 border-b border-border/80 flex flex-row items-center justify-between cursor-pointer select-none hover:bg-muted/30 transition-colors"
            onClick={() => setShowSessions((prev) => !prev)}
          >
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <span>最近审讯会话记录 ({sessions.length})</span>
              <Badge variant="outline" className="text-[10px] font-normal">
                {showSessions ? '点击收起' : '点击展开查阅'}
              </Badge>
            </CardTitle>
            <span className="text-[11px] text-muted-foreground">只读 · 最近 30 条</span>
          </CardHeader>

          {showSessions && (
            <CardContent className="p-0 max-h-60 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <AlertCircle className="size-5 text-muted-foreground/40" />
                <span>还没有人进过审讯室</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>用户</TableHead>
                    <TableHead className="w-24">状态</TableHead>
                    <TableHead className="w-20">轮次</TableHead>
                    <TableHead className="w-40">开始时间</TableHead>
                    <TableHead className="w-40">总结生成时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className="text-xs">
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <User className="size-3.5 text-muted-foreground" />
                          <span>{session.email || session.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={session.status === 'active' ? 'secondary' : session.status === 'summarized' ? 'outline' : 'secondary'}
                          className={`text-[11px] ${
                            session.status === 'summarized'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : session.status === 'active'
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {STATUS_LABEL[session.status] || session.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{session.turnCount}</TableCell>
                      <TableCell className="text-muted-foreground">{formatTime(session.createdAt)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {session.summaryGeneratedAt ? formatTime(session.summaryGeneratedAt) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          )}
        </Card>
      </div>
    </AdminWorkbenchShell>
  );
};

export default InterrogationWorkbench;
