import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Check,
  CheckCheck,
  Loader2,
  Search,
  Smartphone,
  Phone,
  CornerDownLeft,
  RotateCcw,
} from 'lucide-react';
import { mailboxApi, formatTime, type AdminMailboxMessage } from '../adminApi';
import { AdminConfirmDialog } from './ui/AdminConfirmDialog';
import { adminNotify } from './ui/adminNotify';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '../lib/utils';

interface WhisperMailboxWorkbenchProps {
  refreshTrigger?: number;
  onStatusChanged?: () => void;
}

type MailboxFilterStatus = 'all' | 'pending' | 'read' | 'replied';

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

function getSenderKey(msg: AdminMailboxMessage): string {
  if (msg.userId) return `usr_${msg.userId}`;
  if (msg.deviceId) return `dev_${msg.deviceId}`;
  return msg.nickname?.trim() || 'anon';
}

function isMessageUnread(msg: AdminMailboxMessage): boolean {
  return !msg.replyContent && !msg.adminHasRead;
}

function matchesStatusFilter(msg: AdminMailboxMessage, status: MailboxFilterStatus): boolean {
  if (status === 'pending') return !msg.replyContent && !msg.adminHasRead;
  if (status === 'read') return !msg.replyContent && Boolean(msg.adminHasRead);
  if (status === 'replied') return Boolean(msg.replyContent);
  return true;
}

export const WhisperMailboxWorkbench: React.FC<WhisperMailboxWorkbenchProps> = ({
  refreshTrigger,
  onStatusChanged,
}) => {
  const [messages, setMessages] = useState<AdminMailboxMessage[]>([]);
  const [selectedSenderKey, setSelectedSenderKey] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [status, setStatus] = useState<MailboxFilterStatus>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [batchMarking, setBatchMarking] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminMailboxMessage | null>(null);

  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const bubbleRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mailboxApi.listMessages({
        page: 1,
        pageSize: 200,
        status: 'all',
      });
      if (res.success) {
        setMessages(res.items);
      }
    } catch (err: unknown) {
      adminNotify.error(err instanceof Error ? err.message : '加载暗室密信失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshTrigger]);

  // 全局状态统计（用于顶部 Tab 实时显示数量）
  const statusCounts = useMemo(() => {
    let pending = 0;
    let read = 0;
    let replied = 0;
    for (const m of messages) {
      if (m.replyContent) replied += 1;
      else if (m.adminHasRead) read += 1;
      else pending += 1;
    }
    return {
      all: messages.length,
      pending,
      read,
      replied,
    };
  }, [messages]);

  // 经过顶部状态 Tab、分类与关键词过滤后的消息集合
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (!matchesStatusFilter(m, status)) return false;
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        m.nickname?.toLowerCase().includes(s) ||
        m.content?.toLowerCase().includes(s) ||
        m.deviceId?.toLowerCase().includes(s) ||
        m.contactInfo?.toLowerCase().includes(s)
      );
    });
  }, [messages, status, categoryFilter, search]);

  // 按访客聚合为会话列表，并严格按最新消息时间倒序排列
  const visitorConversations = useMemo(() => {
    const map = new Map<
      string,
      {
        senderKey: string;
        nickname: string;
        deviceId: string;
        userId: string | null;
        contactInfo?: string | null;
        items: AdminMailboxMessage[];
        totalCount: number;
        unreadCount: number;
        repliedCount: number;
        latestTime: string;
        latestMessage: AdminMailboxMessage;
      }
    >();

    // 先统计每位访客的全局总信件数与全局未读数（便于左侧列表小字始终准确展示）
    const globalStatsBySender = new Map<string, { total: number; unread: number }>();
    for (const m of messages) {
      const k = getSenderKey(m);
      const stat = globalStatsBySender.get(k) || { total: 0, unread: 0 };
      stat.total += 1;
      if (isMessageUnread(m)) stat.unread += 1;
      globalStatsBySender.set(k, stat);
    }

    for (const msg of filteredMessages) {
      const key = getSenderKey(msg);
      const existing = map.get(key);
      const replied = Boolean(msg.replyContent);

      if (existing) {
        existing.items.push(msg);
        if (replied) existing.repliedCount += 1;
        if (!existing.contactInfo && msg.contactInfo) existing.contactInfo = msg.contactInfo;
        if (new Date(msg.createdAt).getTime() > new Date(existing.latestTime).getTime()) {
          existing.latestTime = msg.createdAt;
          existing.latestMessage = msg;
        }
      } else {
        const globalStat = globalStatsBySender.get(key) || {
          total: 1,
          unread: isMessageUnread(msg) ? 1 : 0,
        };
        map.set(key, {
          senderKey: key,
          nickname: msg.nickname || '神秘探索者',
          deviceId: msg.deviceId || '',
          userId: msg.userId ?? null,
          contactInfo: msg.contactInfo,
          items: [msg],
          totalCount: globalStat.total,
          unreadCount: globalStat.unread,
          repliedCount: replied ? 1 : 0,
          latestTime: msg.createdAt,
          latestMessage: msg,
        });
      }
    }

    const list = Array.from(map.values());
    list.sort(
      (a, b) => new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime()
    );
    return list;
  }, [filteredMessages, messages]);

  // 自动维护当前选中的访客会话与回复目标信件
  useEffect(() => {
    if (visitorConversations.length === 0) {
      setSelectedSenderKey(null);
      setSelectedMessageId(null);
      return;
    }

    const activeConv =
      visitorConversations.find((c) => c.senderKey === selectedSenderKey) ||
      visitorConversations[0];

    if (activeConv.senderKey !== selectedSenderKey) {
      setSelectedSenderKey(activeConv.senderKey);
    }

    // 优先选中该会话中当前已选的信件；若不存在则优先选中最新一条未读信件，否则选中最新一条信件
    const existsInConv = activeConv.items.some((m) => m.id === selectedMessageId);
    if (!existsInConv) {
      const sortedDesc = [...activeConv.items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const latestUnread = sortedDesc.find(isMessageUnread);
      setSelectedMessageId((latestUnread || sortedDesc[0])?.id ?? null);
    }
  }, [visitorConversations, selectedSenderKey, selectedMessageId]);

  const activeConversation = useMemo(() => {
    if (!selectedSenderKey) return null;
    return visitorConversations.find((c) => c.senderKey === selectedSenderKey) || null;
  }, [visitorConversations, selectedSenderKey]);

  // 右侧聊天框内的消息按时间正序（旧 -> 新）排列，符合真实聊天软件对话流
  const chronologicalMessages = useMemo(() => {
    if (!activeConversation) return [];
    return [...activeConversation.items].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [activeConversation]);

  const selectedMessage = useMemo(() => {
    if (!activeConversation || !selectedMessageId) return null;
    return (
      activeConversation.items.find((m) => m.id === selectedMessageId) ||
      chronologicalMessages[chronologicalMessages.length - 1] ||
      null
    );
  }, [activeConversation, selectedMessageId, chronologicalMessages]);

  // 切换访客会话时自动滚动到聊天底部
  useEffect(() => {
    if (!activeConversation) return;
    const timer = setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [activeConversation?.senderKey, status]);

  // 切换选中的具体信件时同步底部输入框内容
  useEffect(() => {
    if (selectedMessage) {
      setReplyText(selectedMessage.replyContent || '');
    } else {
      setReplyText('');
    }
  }, [selectedMessage]);

  const handleSelectVisitor = (senderKey: string) => {
    setSelectedSenderKey(senderKey);
    const conv = visitorConversations.find((c) => c.senderKey === senderKey);
    if (conv) {
      const sortedDesc = [...conv.items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const latestUnread = sortedDesc.find(isMessageUnread);
      setSelectedMessageId((latestUnread || sortedDesc[0])?.id ?? null);
    }
  };

  const handleSelectBubble = (msgId: string, focusInput = false) => {
    setSelectedMessageId(msgId);
    if (focusInput) {
      setTimeout(() => {
        replyTextareaRef.current?.focus();
      }, 40);
    }
  };

  const handleToggleRead = async (msg: AdminMailboxMessage, nextRead: boolean) => {
    setMarkingId(msg.id);
    try {
      const res = await mailboxApi.markRead(msg.id, nextRead);
      if (res.success) {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === msg.id
              ? {
                  ...item,
                  adminHasRead: nextRead,
                  adminReadAt: nextRead ? new Date().toISOString() : null,
                }
              : item
          )
        );
        adminNotify.success(nextRead ? '已标为已读，不再触发待办提醒' : '已恢复为未读状态');
        onStatusChanged?.();
      }
    } catch (err: unknown) {
      adminNotify.error(err instanceof Error ? err.message : '更新已读状态失败');
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkBatchRead = async (ids?: string[], label?: string) => {
    setBatchMarking(true);
    try {
      const res = await mailboxApi.markBatchRead(ids);
      if (res.success) {
        adminNotify.success(label || res.message || '已批量标记为已读');
        await loadData();
        onStatusChanged?.();
      }
    } catch (err: unknown) {
      adminNotify.error(err instanceof Error ? err.message : '批量标记已读失败');
    } finally {
      setBatchMarking(false);
    }
  };

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
        adminNotify.success('回音已发送至对方暗室信箱');
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
        adminNotify.success('已删除该条密信');
        setDeleteTarget(null);
        await loadData();
        onStatusChanged?.();
      }
    } catch (err: unknown) {
      adminNotify.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full h-[calc(100vh-92px)] min-h-[600px]">
      {/* 顶部紧凑控制栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
            <Mail className="size-3.5" />
          </div>
          <h1 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>暗室私密信箱</span>
            <Badge variant="outline" className="text-[11px] font-normal px-1.5 py-0">
              {visitorConversations.length} 位访客 · 共 {statusCounts.all} 封
            </Badge>
            {statusCounts.pending > 0 && (
              <Badge variant="destructive" className="text-[11px] px-1.5 py-0">
                {statusCounts.pending} 未读
              </Badge>
            )}
          </h1>

          {statusCounts.pending > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={batchMarking}
              onClick={() => void handleMarkBatchRead(undefined, '已将全部未读密信标记为已读')}
              className="h-7 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
            >
              {batchMarking ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCheck className="size-3.5" />
              )}
              <span>全部标为已读</span>
            </Button>
          )}
        </div>

        {/* 顶部状态过滤（带实时准确计数）与刷新 */}
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={status}
            onValueChange={(val) => setStatus(val as MailboxFilterStatus)}
          >
            <TabsList className="h-8 p-0.5">
              <TabsTrigger value="all" className="text-xs px-2.5 py-1">
                全部 ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs px-2.5 py-1">
                未读 ({statusCounts.pending})
              </TabsTrigger>
              <TabsTrigger value="read" className="text-xs px-2.5 py-1">
                已读 ({statusCounts.read})
              </TabsTrigger>
              <TabsTrigger value="replied" className="text-xs px-2.5 py-1">
                已回复 ({statusCounts.replied})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            <span>刷新</span>
          </Button>
        </div>
      </div>

      {/* 主体 IM 聊天双栏窗口 */}
      <div className="flex-1 rounded-xl border border-border/80 bg-card overflow-hidden flex flex-col md:flex-row shadow-xs min-h-0">
        {/* ================= 左栏：紧凑型访客会话列表（按最新时间排序，点击进入具体对话） ================= */}
        <div className="w-full md:w-[300px] lg:w-[320px] border-r border-border/80 flex flex-col bg-background/40 shrink-0 min-h-0">
          {/* 搜索与分类筛选 */}
          <div className="p-2.5 border-b border-border/80 flex flex-col gap-2 bg-card">
            <div className="relative w-full">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="搜索访客、信件内容、设备号..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer font-medium',
                  categoryFilter === 'all'
                    ? 'bg-foreground text-background border-foreground shadow-xs'
                    : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:border-border'
                )}
              >
                全部
              </button>
              {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategoryFilter(key)}
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 font-medium',
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

          {/* 访客列表副标题 */}
          <div className="px-3 py-1.5 bg-muted/20 border-b border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>访客列表（按最近来信时间排序）</span>
            <span>{visitorConversations.length} 人</span>
          </div>

          {/* 紧凑型访客联系人列表（每位访客仅占一小行：头像+姓名+信件数/未读数+时间+最新一句摘要） */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {loading && messages.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>正在读取会话...</span>
              </div>
            ) : visitorConversations.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2 px-4 text-center">
                <Mail className="size-6 text-muted-foreground/30" />
                <span>当前筛选下暂无会话记录</span>
              </div>
            ) : (
              visitorConversations.map((conv) => {
                const isSelected = conv.senderKey === activeConversation?.senderKey;
                const latestCat =
                  CATEGORY_MAP[conv.latestMessage.category] || CATEGORY_MAP.suggestion;

                return (
                  <div
                    key={conv.senderKey}
                    onClick={() => handleSelectVisitor(conv.senderKey)}
                    className={cn(
                      'px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition-colors border-l-2',
                      isSelected
                        ? 'bg-primary/10 border-l-primary'
                        : 'border-l-transparent hover:bg-muted/40'
                    )}
                  >
                    {/* 紧凑头像 + 未读角标 */}
                    <div className="relative shrink-0">
                      <Avatar className="size-9 border border-border/80">
                        <AvatarFallback
                          className={cn(
                            'text-xs font-bold uppercase',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-primary/10 text-primary'
                          )}
                        >
                          {conv.nickname.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* 姓名、统计小字、时间与最新消息单行预览 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {conv.nickname}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {conv.items.length}封
                            {conv.unreadCount > 0 ? (
                              <span className="text-rose-500 font-semibold ml-1">
                                · {conv.unreadCount}未读
                              </span>
                            ) : (
                              <span className="text-muted-foreground/70 ml-1">· 0未读</span>
                            )}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {formatTime(conv.latestTime).slice(5, 16)}
                        </span>
                      </div>

                      <p
                        className={cn(
                          'text-[11px] truncate mt-0.5',
                          conv.unreadCount > 0
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground'
                        )}
                      >
                        <span className="text-muted-foreground/80 mr-1">
                          [{latestCat.label}]
                        </span>
                        {conv.latestMessage.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= 右栏：统一 IM 聊天对话窗口（左访客气泡 / 右主理人气泡） ================= */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden min-h-0">
          {activeConversation && selectedMessage ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
              {/* 聊天窗口顶部栏 */}
              <div className="px-4 py-2.5 border-b border-border/80 flex flex-wrap items-center justify-between gap-3 bg-card/60 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="size-8 rounded-full border border-border shrink-0">
                    <AvatarFallback className="text-xs font-bold uppercase bg-primary/10 text-primary">
                      {activeConversation.nickname.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {activeConversation.nickname}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        共 {activeConversation.items.length} 封信件 ·{' '}
                        {activeConversation.unreadCount > 0 ? (
                          <span className="text-rose-500 font-semibold">
                            {activeConversation.unreadCount} 封未读
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            全部已读
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono">
                        <Smartphone className="size-3" />
                        {activeConversation.deviceId || '未知设备'}
                      </span>
                      {activeConversation.contactInfo && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono">
                          <Phone className="size-3" />
                          {activeConversation.contactInfo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {activeConversation.unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={batchMarking}
                    onClick={() => {
                      const unreadIds = activeConversation.items
                        .filter(isMessageUnread)
                        .map((m) => m.id);
                      void handleMarkBatchRead(
                        unreadIds,
                        `已将 [${activeConversation.nickname}] 的未读消息标为已读`
                      );
                    }}
                    className="h-7 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    <CheckCheck className="size-3.5" />
                    <span>该访客全部已读 ({activeConversation.unreadCount})</span>
                  </Button>
                )}
              </div>

              {/* IM 聊天气泡对话流（时间从上到下，访客在左、主理人回复在右） */}
              <div
                ref={chatScrollRef}
                className="flex-1 px-4 py-4 overflow-y-auto space-y-5 bg-muted/15"
              >
                {chronologicalMessages.map((item) => {
                  const isActiveTarget = item.id === selectedMessage.id;
                  const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.suggestion;
                  const isUnread = isMessageUnread(item);
                  const isReplied = Boolean(item.replyContent);

                  return (
                    <div
                      key={item.id}
                      ref={(el) => {
                        bubbleRefs.current[item.id] = el;
                      }}
                      className="space-y-2.5"
                    >
                      {/* 左侧：访客发送的聊天气泡 */}
                      <div className="flex items-start gap-2.5">
                        <Avatar className="size-8 border border-border/80 shrink-0 mt-0.5">
                          <AvatarFallback className="text-xs font-bold uppercase bg-primary/10 text-primary">
                            {(item.nickname || 'U').slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col items-start max-w-[82%] sm:max-w-[72%]">
                          {/* 气泡上方小字元信息：分类、时间、未读/已读状态 */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1 px-0.5 text-[11px] text-muted-foreground">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[10px] px-1.5 py-0 rounded border font-medium',
                                catInfo.colorClass
                              )}
                            >
                              {catInfo.icon}
                              <span>{catInfo.label}</span>
                            </span>
                            <span className="font-mono text-[10px]">
                              {formatTime(item.createdAt)}
                            </span>
                            {item.contactInfo && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                                ({item.contactInfo})
                              </span>
                            )}
                            {isReplied ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="size-3" />
                                已回复
                              </span>
                            ) : isUnread ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-rose-500 font-semibold">
                                <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                                未读
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <CheckCheck className="size-3" />
                                已读
                              </span>
                            )}
                          </div>

                          {/* 访客聊天气泡本体 */}
                          <div
                            onClick={() => handleSelectBubble(item.id)}
                            className={cn(
                              'rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs border transition-all cursor-pointer',
                              isActiveTarget
                                ? 'bg-card border-primary ring-2 ring-primary/15 text-foreground'
                                : 'bg-card border-border/80 hover:border-border text-foreground'
                            )}
                          >
                            {item.content}
                          </div>

                          {/* 气泡下方轻量操作条 */}
                          <div className="flex flex-wrap items-center gap-3 mt-1 px-1">
                            {!isReplied &&
                              (isUnread ? (
                                <button
                                  type="button"
                                  disabled={markingId === item.id}
                                  onClick={() => void handleToggleRead(item, true)}
                                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer font-medium"
                                >
                                  {markingId === item.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <Check className="size-3" />
                                  )}
                                  <span>标为已读</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={markingId === item.id}
                                  onClick={() => void handleToggleRead(item, false)}
                                  className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  <RotateCcw className="size-2.5" />
                                  <span>标为未读</span>
                                </button>
                              ))}

                            <button
                              type="button"
                              onClick={() => handleSelectBubble(item.id, true)}
                              className={cn(
                                'text-[11px] inline-flex items-center gap-0.5 cursor-pointer',
                                isActiveTarget
                                  ? 'text-primary font-semibold'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              <CornerDownLeft className="size-3" />
                              <span>
                                {isReplied
                                  ? '修改回复'
                                  : isActiveTarget
                                    ? '当前回复目标'
                                    : '回复此条'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="text-[11px] text-muted-foreground/70 hover:text-destructive inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              <Trash2 className="size-3" />
                              <span>删除</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 右侧：主理人回复的聊天气泡 */}
                      {item.replyContent && (
                        <div className="flex items-start justify-end gap-2.5">
                          <div className="flex flex-col items-end max-w-[82%] sm:max-w-[72%]">
                            <div className="flex flex-wrap items-center justify-end gap-1.5 mb-1 px-0.5 text-[10px] text-muted-foreground">
                              <span>
                                {item.userHasReadReply ? '✓✓ 访客已读' : '✓ 已送达 · 待查阅'}
                              </span>
                              {item.repliedAt && (
                                <span className="font-mono">{formatTime(item.repliedAt)}</span>
                              )}
                              <span className="font-semibold text-primary">主理人</span>
                            </div>

                            <div
                              onClick={() => handleSelectBubble(item.id, true)}
                              className="rounded-2xl rounded-tr-xs bg-primary text-primary-foreground px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-xs cursor-pointer"
                            >
                              {item.replyContent}
                            </div>
                          </div>

                          <Avatar className="size-8 border border-primary/30 shrink-0 mt-0.5">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                              主
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 底部 IM 聊天输入栏 */}
              <div className="p-3 border-t border-border/80 bg-card flex flex-col gap-2 shrink-0">
                {/* 当前引用回复的目标消息提示条 */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/60 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <CornerDownLeft className="size-3.5 text-primary shrink-0" />
                    <span className="font-medium text-foreground shrink-0">
                      回复 [{formatTime(selectedMessage.createdAt).slice(5, 16)}]：
                    </span>
                    <span className="truncate text-muted-foreground">
                      「{selectedMessage.content}」
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isMessageUnread(selectedMessage) && (
                      <button
                        type="button"
                        disabled={markingId === selectedMessage.id}
                        onClick={() => void handleToggleRead(selectedMessage, true)}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Check className="size-3" />
                        <span>无需回复 · 标为已读</span>
                      </button>
                    )}
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      Ctrl + Enter 发送
                    </span>
                  </div>
                </div>

                {/* 聊天输入框 + 发送按钮同行布局 */}
                <div className="flex items-end gap-2">
                  <Textarea
                    ref={replyTextareaRef}
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
                        ? '输入内容以修改此条回音...'
                        : '输入回复内容（点击上方任意访客气泡可切换回复目标）...'
                    }
                    rows={2}
                    className="flex-1 bg-background p-2.5 text-xs sm:text-sm resize-none leading-relaxed min-h-[54px] max-h-[120px]"
                  />

                  <Button
                    size="sm"
                    disabled={replying || !replyText.trim()}
                    onClick={() => void handleSendReply()}
                    className="h-[54px] px-4 text-xs gap-1.5 cursor-pointer shrink-0"
                  >
                    {replying ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>发送中</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        <span>发送</span>
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
              <span className="font-medium text-foreground">未选择访客对话</span>
              <span className="text-[11px] text-muted-foreground">
                请在左侧列表中点击一位访客以查看对话内容
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 删除二次确认弹窗 */}
      <AdminConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="确认删除该条密信？"
        description={`您即将永久删除访客 [${deleteTarget?.nickname || '神秘探索者'}] 的这条消息。此操作不可逆。`}
        confirmText="确认删除"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
};

export default WhisperMailboxWorkbench;
