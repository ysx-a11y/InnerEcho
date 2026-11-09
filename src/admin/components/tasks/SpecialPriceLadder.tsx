import React, { useEffect, useState, useCallback } from 'react';
import {
  Crown,
  Search,
  RefreshCw,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  DollarSign,
  Users,
  Loader2,
} from 'lucide-react';
import { adminApi, formatTime } from '../../adminApi';
import type { AdminSpecialEvaluation, AdminSpecialEvaluationStats } from '../../adminTypes';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { cn, getPageNumbers } from '../../lib/utils';

interface SpecialPriceLadderProps {
  refreshTrigger?: number;
}

export const SpecialPriceLadder: React.FC<SpecialPriceLadderProps> = ({ refreshTrigger }) => {
  const [items, setItems] = useState<AdminSpecialEvaluation[]>([]);
  const [stats, setStats] = useState<AdminSpecialEvaluationStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [taskType, setTaskType] = useState<'price_tag' | 'betrothal_gift'>('price_tag');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'high' | 'mid' | 'low' | 'zero'>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(15);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let minPrice: number | undefined;
      let maxPrice: number | undefined;

      if (tierFilter === 'high') {
        minPrice = 100000;
      } else if (tierFilter === 'mid') {
        minPrice = 10000;
        maxPrice = 99999;
      } else if (tierFilter === 'low') {
        minPrice = 1;
        maxPrice = 9999;
      } else if (tierFilter === 'zero') {
        minPrice = 0;
        maxPrice = 0;
      }

      const res = await adminApi.listSpecialEvaluations({
        taskType,
        search: search.trim() || undefined,
        minPrice,
        maxPrice,
        sort: 'price',
        order: 'desc',
        limit: pageSize,
        offset: page * pageSize,
      });

      setItems(res.items);
      setStats(res.stats);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载天梯榜单数据失败');
    } finally {
      setLoading(false);
    }
  }, [taskType, search, tierFilter, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load, refreshTrigger]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = getPageNumbers(page + 1, totalPages);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 4 Stat Cards */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 w-full">
          <Card className="shadow-xs border-border/80">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium">全网测算人数</span>
                <div className="text-xl font-bold text-foreground mt-1">
                  {stats.totalParticipants.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">人</span>
                </div>
              </div>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Users className="size-4" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border/80">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium">最高自评身价</span>
                <div className="text-xl font-bold text-rose-500 mt-1">
                  ¥{stats.highestPrice.toLocaleString()}
                </div>
              </div>
              <div className="size-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <Crown className="size-4" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border/80">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium">中位数自评身价</span>
                <div className="text-xl font-bold text-amber-500 mt-1">
                  ¥{stats.medianPrice.toLocaleString()}
                </div>
              </div>
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <DollarSign className="size-4" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border/80">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium">平均自评身价</span>
                <div className="text-xl font-bold text-purple-500 mt-1">
                  ¥{stats.averagePrice.toLocaleString()}
                </div>
              </div>
              <div className="size-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <TrendingUp className="size-4" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Control & Search Bar */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          {/* Tier filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium mr-1">档位:</span>
            {[
              { key: 'all', label: '全部' },
              { key: 'high', label: '高价值区 (≥¥10万)' },
              { key: 'mid', label: '中段反差 (¥1万~¥10万)' },
              { key: 'low', label: '基础区 (<¥1万)' },
              { key: 'zero', label: '无价 / 0元' },
            ].map((t) => (
              <Button
                key={t.key}
                variant={tierFilter === t.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setTierFilter(t.key as any);
                  setPage(0);
                }}
                className="h-7 text-xs px-2.5"
              >
                {t.label}
              </Button>
            ))}
          </div>

          {/* Search box & refresh */}
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="搜索昵称 / 邮箱 / 自白"
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 gap-1">
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>查询</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table Card */}
      <Card className="shadow-xs border-border/80 overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-border/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="size-4 text-amber-500" />
            <CardTitle className="text-sm font-semibold">全网身价天梯榜单与真实自白</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">共检索到 {total} 条排位记录</span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>正在加载天梯排位...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
              暂无符合条件的身价排位记录
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-b border-border/80">
                  <TableHead className="w-20 font-semibold text-xs">天梯排位</TableHead>
                  <TableHead className="w-36 font-semibold text-xs">用户身份</TableHead>
                  <TableHead className="w-28 font-semibold text-xs">自评身价</TableHead>
                  <TableHead className="w-32 font-semibold text-xs">设备指纹</TableHead>
                  <TableHead className="font-semibold text-xs">自评自白描述</TableHead>
                  <TableHead className="w-28 font-semibold text-xs text-right">测算时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => {
                  const rank = item.rank || (page * pageSize + idx + 1);
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/40">
                      <TableCell>
                        <Badge
                          variant={rank <= 3 ? 'default' : 'outline'}
                          className={`text-xs font-mono font-bold ${
                            rank === 1
                              ? 'bg-amber-500 text-white'
                              : rank === 2
                              ? 'bg-slate-400 text-white'
                              : rank === 3
                              ? 'bg-amber-700 text-white'
                              : ''
                          }`}
                        >
                          #{rank}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1">
                            <User className="size-3 text-primary" />
                            {item.nickname || '神秘客'}
                          </span>
                          {item.email && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                              {item.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-sm text-rose-500 font-mono">
                          ¥{item.price.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {item.deviceId ? `${item.deviceId.slice(0, 12)}...` : '-'}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                          "{item.selfEvaluation || '（未提交文字自白）'}"
                        </p>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground font-mono">
                        {formatTime(item.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* 统一现代标准数据分页器 */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-border/80 bg-background/50 text-xs text-muted-foreground">
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <span className="font-medium text-foreground whitespace-nowrap">
                  共 {total} 条排位
                </span>
                <div className="flex items-center gap-1.5">
                  <Select
                    value={`${pageSize}`}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setPage(0);
                    }}
                  >
                    <SelectTrigger size="sm" className="h-8 w-auto min-w-[96px] px-2.5 text-xs whitespace-nowrap bg-background">
                      <SelectValue placeholder={`${pageSize} 条/页`} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 15, 30, 50, 100].map((size) => (
                        <SelectItem key={size} value={`${size}`} className="text-xs">
                          {size} 条/页
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  第 {page + 1} 页 / 共 {totalPages} 页
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 p-0"
                    onClick={() => setPage(0)}
                    disabled={page <= 0}
                    title="首页"
                  >
                    <ChevronsLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 p-0"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page <= 0}
                    title="上一页"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>

                  {pageNumbers.map((pageNumber, idx) => {
                    if (pageNumber === '...') {
                      return (
                        <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground">
                          ...
                        </span>
                      );
                    }
                    const pNum = Number(pageNumber);
                    const isActive = pNum === page + 1;
                    return (
                      <Button
                        key={`page-${pNum}`}
                        variant={isActive ? 'default' : 'outline'}
                        size="icon"
                        className={cn('size-8 text-xs', isActive && 'font-bold pointer-events-none')}
                        onClick={() => setPage(pNum - 1)}
                      >
                        {pNum}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 p-0"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page + 1 >= totalPages}
                    title="下一页"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 p-0"
                    onClick={() => setPage(totalPages - 1)}
                    disabled={page + 1 >= totalPages}
                    title="末页"
                  >
                    <ChevronsRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default SpecialPriceLadder;
