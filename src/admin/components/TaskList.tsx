import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Clock,
  Compass,
  Mail,
  RefreshCw,
  User,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Music,
  AlertTriangle,
  Video,
  Crown,
  ListTodo,
  FileText,
  Loader2,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import { adminApi, formatTime } from '../adminApi';
import type { AdminTaskSummary } from '../adminTypes';
import { SpecialPriceLadder } from './tasks/SpecialPriceLadder';
import { TaskDetailModal } from './tasks/TaskDetailModal';
import { DictBadge } from './ui/DictBadge';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '../lib/utils';

const PAGE_SIZE = 15;

interface TaskListProps {
  refreshTrigger?: number;
}

export const TaskList: React.FC<TaskListProps> = ({ refreshTrigger }) => {
  const [activeTab, setActiveTab] = useState<'regular' | 'special_ladder'>('regular');
  const [tasks, setTasks] = useState<AdminTaskSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Detail Modal State
  const [selectedTask, setSelectedTask] = useState<AdminTaskSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listTasks({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        category: filterCategory !== 'all' ? filterCategory : undefined,
      });
      setTasks(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterCategory]);

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  // Client-side search keyword filtering
  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const term = search.toLowerCase().trim();
    return tasks.filter((t) => {
      const matchTitle = t.title?.toLowerCase().includes(term);
      const matchUser = t.nickname?.toLowerCase().includes(term);
      const matchEmail = t.email?.toLowerCase().includes(term);
      const matchId = t.id?.toLowerCase().includes(term);
      return matchTitle || matchUser || matchEmail || matchId;
    });
  }, [tasks, search]);

  const getCategoryDetails = (category: string) => {
    switch (category) {
      case 'routine':
      case 'persona':
        return { label: '日常记录', variant: 'secondary' as const, icon: Clock };
      case 'secret':
      case 'shadow':
      case 'dream':
        return { label: '隐秘想法', variant: 'default' as const, icon: Compass };
      default:
        return { label: '常规任务', variant: 'outline' as const, icon: ListTodo };
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Top Tab Switcher */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'regular' | 'special_ladder')}
      >
        <TabsList className="h-8">
          <TabsTrigger value="regular" className="gap-1.5 text-xs px-2.5">
            <ListTodo className="size-3.5" />
            <span>常规任务记录 (日常 / 隐秘)</span>
          </TabsTrigger>
          <TabsTrigger value="special_ladder" className="gap-1.5 text-xs px-2.5">
            <Crown className="size-3.5 text-amber-500" />
            <span>身价天梯榜单与自白</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Render active subtab */}
      {activeTab === 'special_ladder' ? (
        <SpecialPriceLadder refreshTrigger={refreshTrigger} />
      ) : (
        <>
          {/* Header Panel & Filter Toolbar */}
          <Card className="shadow-xs border-border/80">
            <CardContent className="p-2.5 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-foreground">任务成果流</span>
                <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-mono">
                  共 {total} 条
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* 搜索框 */}
                <div className="relative w-44 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="搜索任务、用户、ID..."
                    className="h-8 pl-8 pr-7 text-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => setSearch('')}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* 分类下拉 (标准 shadcn Select) */}
                <Select
                  value={filterCategory}
                  onValueChange={(val) => {
                    setFilterCategory(val);
                    setPage(0);
                  }}
                >
                  <SelectTrigger size="sm" className="h-8 w-[130px] text-xs bg-background">
                    <SelectValue placeholder="所有分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有分类</SelectItem>
                    <SelectItem value="routine">日常记录 (日常/人设)</SelectItem>
                    <SelectItem value="secret">隐秘想法 (梦境/暗影)</SelectItem>
                  </SelectContent>
                </Select>

                {/* 状态下拉 (标准 shadcn Select) */}
                <Select
                  value={filterStatus}
                  onValueChange={(val) => {
                    setFilterStatus(val);
                    setPage(0);
                  }}
                >
                  <SelectTrigger size="sm" className="h-8 w-[130px] text-xs bg-background">
                    <SelectValue placeholder="所有状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有状态</SelectItem>
                    <SelectItem value="accepted">进行中 (已接取)</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="abandoned">已放弃</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void load()}
                  disabled={loading}
                  className="h-8 gap-1 text-xs"
                >
                  <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                  <span>刷新</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Standard High-Density Data Table */}
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="h-9 hover:bg-transparent">
                    <TableHead className="w-[110px] text-xs font-semibold">任务标识</TableHead>
                    <TableHead className="min-w-[220px] text-xs font-semibold">任务主题与要求</TableHead>
                    <TableHead className="w-[140px] text-xs font-semibold">接取用户</TableHead>
                    <TableHead className="w-[90px] text-xs font-semibold">分类</TableHead>
                    <TableHead className="w-[90px] text-xs font-semibold">进度状态</TableHead>
                    <TableHead className="min-w-[180px] text-xs font-semibold">交付成果概况</TableHead>
                    <TableHead className="w-[125px] text-xs font-semibold">接取时间</TableHead>
                    <TableHead className="w-[85px] text-right text-xs font-semibold">操作</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading && tasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center text-xs text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="size-4 animate-spin text-primary" />
                          <span>正在加载任务流数据...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center text-xs text-destructive">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertTriangle className="size-5" />
                          <span>{error}</span>
                          <Button variant="outline" size="sm" onClick={() => void load()} className="h-7 text-xs">
                            重试
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center text-xs text-muted-foreground">
                        暂无符合筛选条件的用户任务成果记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => {
                      const cat = getCategoryDetails(task.category);
                      const CategoryIcon = cat.icon;
                      const isCompleted = task.status === 'completed';
                      const isAbandoned = task.status === 'abandoned';
                      const hasAttachments = task.attachments && task.attachments.length > 0;
                      const hasAudio = task.attachments?.some((a: any) => a.type === 'audio' || a.dataUrl?.startsWith('data:audio'));
                      const hasImage = task.attachments?.some((a: any) => a.type === 'image' || a.dataUrl?.startsWith('data:image'));
                      const hasVideo = task.attachments?.some((a: any) => a.type === 'video' || a.dataUrl?.startsWith('data:video'));

                      return (
                        <TableRow
                          key={task.id}
                          className="h-10 hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => setSelectedTask(task)}
                        >
                          {/* 任务 ID */}
                          <TableCell className="font-mono text-[11px] text-muted-foreground">
                            <span className="truncate block max-w-[95px]" title={task.id}>
                              {task.id.replace('utk_', '...')}
                            </span>
                          </TableCell>

                          {/* 任务主题与要求 */}
                          <TableCell className="max-w-[280px]">
                            <div className="space-y-0.5">
                              <span className="font-bold text-foreground text-xs block truncate" title={task.title}>
                                {task.title || '无标题任务'}
                              </span>
                              <span className="text-[10px] text-muted-foreground block truncate" title={task.description}>
                                {task.description || '（无特定预设要求）'}
                              </span>
                            </div>
                          </TableCell>

                          {/* 接取用户 */}
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Avatar className="size-6 text-[10px]">
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                  {(task.nickname || '客').slice(0, 1).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <span className="font-semibold text-foreground text-xs block truncate" title={task.nickname}>
                                  {task.nickname || '神秘客'}
                                </span>
                                {task.email && (
                                  <span className="text-[10px] text-muted-foreground block truncate font-mono" title={task.email}>
                                    {task.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* 分类 */}
                          <TableCell>
                            <Badge variant={cat.variant} className="text-[10px] px-1.5 py-0 h-4.5 gap-1 shrink-0">
                              <CategoryIcon className="size-2.5" />
                              <span>{cat.label}</span>
                            </Badge>
                          </TableCell>

                          {/* 状态 */}
                          <TableCell>
                            <DictBadge dictCode="task_progress_status" value={task.status} size="xs" />
                          </TableCell>

                          {/* 交付成果概况 */}
                          <TableCell className="max-w-[240px]">
                            {isCompleted ? (
                              <div className="flex items-center gap-1.5 text-xs truncate">
                                <span className="text-foreground truncate" title={task.textContent || ''}>
                                  {task.textContent || '已提交成果'}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {hasAudio && (
                                    <span title="包含录音自白" className="text-amber-500">
                                      <Music className="size-3" />
                                    </span>
                                  )}
                                  {hasImage && (
                                    <span title="包含图片成果" className="text-sky-500">
                                      <ImageIcon className="size-3" />
                                    </span>
                                  )}
                                  {hasVideo && (
                                    <span title="包含视频成果" className="text-purple-500">
                                      <Video className="size-3" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : isAbandoned ? (
                              <span className="text-[11px] text-destructive/80 flex items-center gap-1">
                                <XCircle className="size-3" />
                                <span>已放弃（未提交自白）</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="size-3 text-sky-500" />
                                <span>进行中（撰写中）</span>
                              </span>
                            )}
                          </TableCell>

                          {/* 接取时间 */}
                          <TableCell className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                            {formatTime(task.acceptedAt)}
                          </TableCell>

                          {/* 操作 */}
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(task);
                              }}
                              className="h-6 text-[11px] px-2 gap-1"
                            >
                              <Eye className="size-3" />
                              <span>详情</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Standard Pagination Footer */}
            {total > 0 && (
              <div className="flex items-center justify-between p-2.5 border-t border-border/80 bg-background/50 text-xs text-muted-foreground">
                <span className="font-mono">
                  共 {total} 条记录 · 每页 {PAGE_SIZE} 条 · 第 {page + 1} / {pageCount} 页
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="h-7 text-xs px-2.5 gap-1"
                  >
                    <ChevronLeft className="size-3.5" />
                    <span>上一页</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-7 text-xs px-2.5 gap-1"
                  >
                    <span>下一页</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Task Deliverable Detail Modal */}
          <TaskDetailModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        </>
      )}
    </div>
  );
};

export default TaskList;
