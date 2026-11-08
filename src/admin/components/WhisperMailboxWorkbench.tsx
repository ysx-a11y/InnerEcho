import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail,
  Send,
  Trash2,
  RefreshCw,
  Sparkles,
  HeartHandshake,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Clock,
  User,
  ShieldCheck,
  Smartphone,
  Phone,
  CornerDownLeft,
} from 'lucide-react';
import { mailboxApi, formatTime, type AdminMailboxMessage } from '../adminApi';
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { adminNotify } from './ui/adminNotify';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '../lib/utils';

interface WhisperMailboxWorkbenchProps {
  refreshTrigger?: number;
  onStatusChanged?: () => void;
}

const CATEGORY_MAP: Record<
  string,
  { label: string; icon: React.ReactNode; colorClass: string; activeClass: string }
> = {
  confession: {
    label: '私密自白',
    icon: <Sparkles className="size-3 text-purple-400 shrink-0" />,
    colorClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-xs font-semibold',
  },
  comfort: {
    label: '寻求慰藉',
    icon: <HeartHandshake className="size-3 text-rose-400 shrink-0" />,
    colorClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    activeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs font-semibold',
  },
  question: {
    label: '深度疑问',
    icon: <HelpCircle className="size-3 text-sky-400 shrink-0" />,
    colorClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    activeClass: 'bg-sky-600 text-white border-sky-600 shadow-xs font-semibold',
  },
  suggestion: {
    label: '主理建议',
    icon: <MessageCircle className="size-3 text-emerald-400 shrink-0" />,
    colorClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold',
  },
};

/**
 * 暗室信箱工作台（基于 shadcn/ui 官方 Mail Client 双栏 Master-Detail 交互重构）
 * 左栏：信件流、即时搜索与多状态过滤；右栏：全景信件阅读器与专属回音编辑器
 */
export const WhisperMailboxWorkbench: React.FC<WhisperMailboxWorkbenchProps> = ({
  refreshTrigger,
  onStatusChanged,
}) => {
  const [messages, setMessages] = useState<AdminMailboxMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<'all' | 'pending' | 'replied'>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [groupMode, setGroupMode] = useState<'user' | 'flat'>('user');
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminMailboxMessage | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mailboxApi.listMessages({
        page,
        pageSize,
        status,
      });
      if (res.success) {
        setMessages(res.items);
        setTotal(res.total);
        // 如果当前没有选中或选中的信件不在列表中，默认选中第一封
        if (res.items.length > 0) {
          setSelectedId((curr) => {
            const exists = res.items.some((m) => m.id === curr);
            return exists ? curr : res.items[0].id;
          });
        } else {
          setSelectedId(null);
        }
      }
    } catch (err: unknown) {
      adminNotify.error(err instanceof Error ? err.message : '加载暗室密信失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshTrigger]);

  // 客户端辅助搜索过滤（模糊搜索昵称、自白内容或设备号）
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        m.nickname?.toLowerCase().includes(s) ||
        m.content?.toLowerCase().includes(s) ||
        m.deviceId?.toLowerCase().includes(s) ||
        m.contactInfo?.toLowerCase().includes(s)
      );
    });
  }, [messages, search, categoryFilter]);

  // 按访客 / 设备聚合信件，解决不同人混在一起的痛点
  const groupedBySender = useMemo(() => {
    const map = new Map<
      string,
      {
        senderKey: string;
        nickname: string;
        deviceId: string;
        userId: string | null;
        contactInfo?: string | null;
        items: AdminMailboxMessage[];
        unrepliedCount: number;
        latestTime: string;
      }
    >();

    for (const msg of filteredMessages) {
      const key = msg.userId
        ? `usr_${msg.userId}`
        : msg.deviceId
        ? `dev_${msg.deviceId}`
        : msg.nickname?.trim() || 'anon';
      const existing = map.get(key);
      const isReplied = Boolean(msg.replyContent);
      if (existing) {
        existing.items.push(msg);
        if (!isReplied) existing.unrepliedCount += 1;
        if (!existing.contactInfo && msg.contactInfo) existing.contactInfo = msg.contactInfo;
      } else {
        map.set(key, {
          senderKey: key,
          nickname: msg.nickname || '神秘探索者',
          deviceId: msg.deviceId || '',
          userId: msg.userId ?? null,
          contactInfo: msg.contactInfo,
          items: [msg],
          unrepliedCount: isReplied ? 0 : 1,
          latestTime: msg.createdAt,
        });
      }
    }
    return Array.from(map.values());
  }, [filteredMessages]);

  const selectedMessage = useMemo(() => {
    return messages.find((m) => m.id === selectedId) || null;
  }, [messages, selectedId]);

  // 当切换选中信件时，自动同步回复输入框初始状态
  useEffect(() => {
    if (selectedMessage) {
      setReplyText(selectedMessage.replyContent || '');
    } else {
      setReplyText('');
    }
  }, [selectedMessage]);

  const handleSendReply = async () => {
    if (!selectedMessage) return;
    const content = replyText.trim();
    if (!content) {
      adminNotify.info('回音内容不能为空');
      return;
    }

    setReplying(true);
    try {
      const res = await mailboxApi.replyMessage(selectedMessage.id, content);
      if (res.success) {
        adminNotify.success('专属回音已推送到对方设备信箱');
        await loadData();
        onStatusChanged?.();
      }
    } catch (err: unknown) {
      adminNotify.error(err instanceof Error ? err.message : '发送回音失败');
    } finally {
      setReplying(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await mailboxApi.deleteMessage(deleteTarget.id);
      if (res.success) {
        adminNotify.success('已物理删除该封密信');
        setDeleteTarget(null);
        await loadData();
        onStatusChanged?.();
      }
    } catch (err: unknown) {
      adminNotify.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col gap-3 w-full h-[calc(100vh-100px)] min-h-[580px]">
      {/* 顶部紧凑控制栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
            <Mail className="size-3.5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>暗室私密信箱</span>
              <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                共 {total} 封
              </Badge>
            </h1>
          </div>
        </div>

        {/* 状态过滤选项 */}
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/60 rounded-lg p-0.5 border border-border/60">
            {(['all', 'pending', 'replied'] as const).map((s) => (
              <Button
                key={s}
                variant={status === s ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className="h-7 text-xs px-2.5"
              >
                {s === 'all' ? '全部密信' : s === 'pending' ? '待回复' : '已回复'}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="h-7 text-xs gap-1.5"
          >
            <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
            <span>刷新</span>
          </Button>
        </div>
      </div>

      {/* shadcn 官方 Mail 风格双栏 Master-Detail 容器 */}
      <div className="flex-1 rounded-xl border border-border/80 bg-card overflow-hidden flex flex-col md:flex-row shadow-xs">
        {/* 左栏：信件列表检索器 */}
        <div className="w-full md:w-[360px] lg:w-[400px] border-r border-border/80 flex flex-col bg-background/50 shrink-0">
          {/* 搜索与多维度分类筛选条 */}
          <div className="p-2.5 border-b border-border/80 flex flex-col gap-2 bg-card">
            <div className="relative w-full">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="搜索称呼、自白关键词、设备号..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
            {/* 色彩鲜明的分类过滤 Pill 栏 */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={cn(
                  'text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer shrink-0 font-medium',
                  categoryFilter === 'all'
                    ? 'bg-foreground text-background border-foreground shadow-xs'
                    : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:border-border'
                )}
              >
                全部类别
              </button>
              {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategoryFilter(key)}
                  className={cn(
                    'text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer shrink-0 flex items-center gap-1 font-medium',
                    categoryFilter === key
                      ? info.activeClass
                      : cn('bg-muted/30 hover:bg-muted/60', info.colorClass)
                  )}
                >
                  {info.icon}
                  <span>{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 会话归集 / 流水视图切换条（明确区分不同人） */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/20 border-b border-border/60 text-xs">
            <span className="text-[11px] text-muted-foreground font-medium">
              {groupMode === 'user'
                ? `共 ${groupedBySender.length} 位访客 · ${filteredMessages.length} 封信件`
                : `共 ${filteredMessages.length} 封信件流水`}
            </span>
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border/60">
              <button
                type="button"
                onClick={() => setGroupMode('user')}
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded transition-all cursor-pointer font-medium',
                  groupMode === 'user'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="按受测者/设备归集不同人的信件"
              >
                按受测者归集
              </button>
              <button
                type="button"
                onClick={() => setGroupMode('flat')}
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded transition-all cursor-pointer font-medium',
                  groupMode === 'flat'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="平铺全部信件流水"
              >
                时间流水
              </button>
            </div>
          </div>

          {/* 滚动邮件列表 */}
          <div className="flex-1 overflow-y-auto">
            {loading && messages.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>检索暗室信件...</span>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
                <Mail className="size-6 text-muted-foreground/30" />
                <span>暂无符合条件的密信</span>
              </div>
            ) : groupMode === 'user' ? (
              /* 按受测者/访客明确分块排布 */
              <div className="p-2 space-y-2.5">
                {groupedBySender.map((group) => {
                  const isCurrentGroup = group.items.some((m) => m.id === selectedId);
                  return (
                    <div
                      key={group.senderKey}
                      className={cn(
                        'rounded-xl border transition-all overflow-hidden bg-card shadow-xs',
                        isCurrentGroup ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/80'
                      )}
                    >
                      {/* 访客专属卡片头 - 明确标示不同人 */}
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border/60">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="size-6 text-[10px] border border-border/80 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {group.nickname.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs font-bold text-foreground truncate max-w-[110px]">
                                {group.nickname}
                              </strong>
                              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[80px]">
                                {group.deviceId ? group.deviceId.slice(0, 8) : '匿名'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {group.unrepliedCount > 0 && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                              {group.unrepliedCount} 待回
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono text-muted-foreground">
                            {group.items.length} 封
                          </Badge>
                        </div>
                      </div>

                      {/* 该访客旗下的各条来信 */}
                      <div className="divide-y divide-border/40">
                        {group.items.map((item) => {
                          const isSelected = item.id === selectedId;
                          const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.suggestion;
                          const isReplied = Boolean(item.replyContent);

                          return (
                            <div
                              key={item.id}
                              onClick={() => setSelectedId(item.id)}
                              className={cn(
                                'p-2.5 flex flex-col gap-1 cursor-pointer transition-all border-l-2',
                                isSelected
                                  ? 'bg-primary/10 border-primary shadow-xs'
                                  : 'border-transparent hover:bg-muted/40'
                              )}
                            >
                              <div className="flex items-center justify-between gap-1.5 text-xs">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.25 rounded-md border font-medium',
                                    catInfo.colorClass
                                  )}
                                >
                                  {catInfo.icon}
                                  <span>{catInfo.label}</span>
                                </span>
                                <div className="flex items-center gap-1">
                                  {isReplied ? (
                                    <CheckCircle2 className="size-2.5 text-emerald-500" />
                                  ) : (
                                    <span className="size-1.5 rounded-full bg-rose-500" />
                                  )}
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {formatTime(item.createdAt).slice(5)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed mt-0.5">
                                {item.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* 平铺时间流水视图 */
              <div className="divide-y divide-border/60">
                {filteredMessages.map((item) => {
                  const isSelected = item.id === selectedId;
                  const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.suggestion;
                  const isReplied = Boolean(item.replyContent);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        'p-3 flex flex-col gap-1.5 cursor-pointer transition-all border-l-2',
                        isSelected
                          ? 'bg-muted/80 border-primary shadow-xs'
                          : 'border-transparent hover:bg-muted/40'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {!isReplied ? (
                            <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                          ) : (
                            <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                          )}
                          <span className="font-semibold text-xs text-foreground truncate">
                            {item.nickname || '神秘探索者'}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {formatTime(item.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.25 rounded-md border font-medium',
                            catInfo.colorClass
                          )}
                        >
                          {catInfo.icon}
                          <span>{catInfo.label}</span>
                        </span>
                        {item.contactInfo && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono truncate max-w-[120px]">
                            {item.contactInfo}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 列表底部紧凑分页 */}
          {totalPages > 1 && (
            <div className="p-2 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground bg-background">
              <span>
                第 {page} / {totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 右栏：信件阅读与专属回信面板 */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
          {selectedMessage ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* 信件顶部操作栏 */}
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-3 bg-card/40">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-8 rounded-full border border-border">
                    <AvatarFallback className="text-xs font-bold uppercase bg-primary/10 text-primary">
                      {selectedMessage.nickname?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {selectedMessage.nickname}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {CATEGORY_MAP[selectedMessage.category]?.label || '私密信件'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Smartphone className="size-2.5" />
                        {selectedMessage.deviceId ? `${selectedMessage.deviceId.slice(0, 16)}...` : '未知设备'}
                      </span>
                      {selectedMessage.contactInfo && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono">
                          <Phone className="size-2.5" />
                          {selectedMessage.contactInfo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                    {formatTime(selectedMessage.createdAt)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(selectedMessage)}
                    className="size-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="物理删除此密信"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* 信件正文与已回复记录阅读区 */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-4">
                {/* 访客来信自白气泡 */}
                <div className="rounded-lg border border-border/80 bg-muted/20 p-4 shadow-xs">
                  <div className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <User className="size-3 text-primary" />
                    <span>访客自白原文</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-normal">
                    {selectedMessage.content}
                  </p>
                </div>

                {/* 主理人历史回音气泡（已回复时展示） */}
                {selectedMessage.replyContent && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-xs">
                    <div className="text-[11px] font-semibold text-primary mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5" />
                        <span>已发送专属回音（直达用户设备暗室信箱）</span>
                      </span>
                      {selectedMessage.repliedAt && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatTime(selectedMessage.repliedAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedMessage.replyContent}
                    </p>
                  </div>
                )}
              </div>

              {/* 专属回音回复编辑器（锚定在底部） */}
              <div className="p-3.5 border-t border-border/80 bg-card/60 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground text-[11px] flex items-center gap-1">
                    <CornerDownLeft className="size-3 text-primary" />
                    <span>回复访客专属回音</span>
                  </span>
                  <span className="text-[10px] hidden sm:inline">
                    按 <kbd className="px-1 py-0.5 bg-muted rounded border border-border text-[9px]">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded border border-border text-[9px]">Enter</kbd> 快捷发送
                  </span>
                </div>

                <div className="relative">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        void handleSendReply();
                      }
                    }}
                    placeholder={
                      selectedMessage.replyContent
                        ? '输入新内容以覆盖并重新推送专属回音...'
                        : '输入主理人专属回音（发送后将立即加密推送到对方设备暗室信箱）...'
                    }
                    rows={3}
                    className="w-full bg-background p-3 text-xs resize-none leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  {replyText && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyText('')}
                      className="h-7 text-xs text-muted-foreground"
                    >
                      清空
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={replying || !replyText.trim()}
                    onClick={() => void handleSendReply()}
                    className="h-7 text-xs gap-1.5"
                  >
                    {replying ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        <span>推送中...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-3" />
                        <span>发送专属回音</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2 p-8">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted/50 border border-border/80">
                <Mail className="size-5 text-muted-foreground/50" />
              </div>
              <span className="font-medium text-foreground">未选中信件</span>
              <span className="text-[11px] text-muted-foreground">
                请在左侧列表中点击选择一封暗室密信以阅读全文或发送专属回音
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 删除二次确认弹窗 */}
      <AdminConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="确认物理删除该封密信？"
        description={`您即将永久删除访客 [${deleteTarget?.nickname || '神秘探索者'}] 的投递信件。此操作不可逆。`}
        confirmText="确认物理删除"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
};

export default WhisperMailboxWorkbench;
