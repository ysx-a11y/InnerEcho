import React, { useState } from 'react';
import { GitBranch, Shield, ShieldAlert, Check, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import type { AccountLineageSummary } from '../../adminTypes';
import { lineageApi, formatTime } from '../../adminApi';
import { DictBadge } from '../ui/DictBadge';
import { adminNotify } from '../ui/adminNotify';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface LineageGenerationItem {
  id: string;
  email: string;
  generation: number;
  accountStatus: string;
  createdAt: string;
  deletedAt: string | null;
  adminNotes: string | null;
  remark: string | null;
}

interface AccountLineageCardProps {
  currentUserId: string;
  lineage: AccountLineageSummary | null;
  generations: LineageGenerationItem[];
  onLineageUpdated?: (updated: AccountLineageSummary) => void;
}

const RISK_LEVEL_OPTIONS = [
  { value: 'normal', label: '正常 (Normal)' },
  { value: 'low', label: '低风控 (Low)' },
  { value: 'medium', label: '中风控 (Medium)' },
  { value: 'high', label: '高危风控 (High)' },
  { value: 'blocked', label: '全域封禁 (Blocked)' },
];

export const AccountLineageCard: React.FC<AccountLineageCardProps> = ({
  currentUserId,
  lineage,
  generations,
  onLineageUpdated,
}) => {
  if (!lineage) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <GitBranch className="size-4 shrink-0" />
        <span>该用户暂无关联的根账号血缘记录（独立匿名或未初始化）</span>
      </div>
    );
  }

  const [riskLevel, setRiskLevel] = useState(lineage.riskLevel || 'normal');
  const [isBlocked, setIsBlocked] = useState(lineage.isBlocked === 1);
  const [adminNotes, setAdminNotes] = useState(lineage.adminNotes || '');
  const [remark, setRemark] = useState(lineage.remark || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveRisk = async () => {
    setIsSaving(true);
    try {
      const res = await lineageApi.updateRisk(lineage.id, {
        riskLevel,
        isBlocked: isBlocked ? 1 : 0,
        adminNotes: adminNotes.trim() || undefined,
        remark: remark.trim() || undefined,
      });
      if (res.success && res.lineage) {
        onLineageUpdated?.(res.lineage);
        adminNotify.success('账号血缘风控配置与运营批注已保存');
      }
    } catch (err: any) {
      adminNotify.error(err?.message || '更新血缘风控失败');
    } finally {
      setIsSaving(false);
    }
  };

  const getRiskBadgeVariant = (lvl: string) => {
    switch (lvl) {
      case 'high':
      case 'blocked':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="gap-2 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitBranch className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">账号世代血缘网络 (Account Lineage)</CardTitle>
            <Badge variant={getRiskBadgeVariant(riskLevel)} className="text-[10px] uppercase">
              风控: {riskLevel}
            </Badge>
            {isBlocked && (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <ShieldAlert className="size-3" />
                根血缘已硬封禁
              </Badge>
            )}
          </div>
          <span className="font-mono text-xs text-muted-foreground">ID: {lineage.id}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono sm:grid-cols-4">
          <div>
            <span className="text-muted-foreground">根凭据 (Root Key): </span>
            <span className="font-semibold text-foreground">{lineage.rootKey}</span>
          </div>
          <div>
            <span className="text-muted-foreground">历经总世代数: </span>
            <span className="font-semibold text-foreground">{lineage.totalGenerations} 代</span>
          </div>
          <div>
            <span className="text-muted-foreground">首次创世时间: </span>
            <span className="text-foreground">{formatTime(lineage.firstRegisteredAt)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">跨世代最后活跃: </span>
            <span className="text-foreground">{formatTime(lineage.lastActiveAt)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* 跨世代族谱时间轴 */}
        <div>
          <div className="mb-2 text-xs font-semibold text-foreground">
            世代重生脉络 ({generations.length} 世代)
          </div>
          <div className="space-y-2">
            {generations.map((gen) => {
              const isCurrent = gen.id === currentUserId;
              return (
                <div
                  key={gen.id}
                  className={`rounded-lg border p-2.5 transition-colors ${
                    isCurrent
                      ? 'border-primary/40 bg-muted/60'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={isCurrent ? 'default' : 'outline'} className="text-[11px]">
                        第 {gen.generation} 代 {isCurrent ? '（当前查看）' : ''}
                      </Badge>
                      <DictBadge dictCode="user_account_status" value={gen.accountStatus} size="xs" />
                      <span className="font-mono text-xs text-muted-foreground">ID: {gen.id}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>注册: {formatTime(gen.createdAt)}</span>
                      {gen.deletedAt && (
                        <span className="text-destructive">注销: {formatTime(gen.deletedAt)}</span>
                      )}
                    </div>
                  </div>

                  {(gen.adminNotes || gen.remark) && (
                    <div className="mt-1.5 border-l-2 border-border pl-2 text-xs text-muted-foreground">
                      {gen.adminNotes && <span>[批注] {gen.adminNotes} </span>}
                      {gen.remark && <span>[备注] {gen.remark}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">全域风控等级</label>
                <p className="text-[11px] text-muted-foreground">调控该血缘跨世代的风控评估等级</p>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {RISK_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  id="lineage-is-blocked"
                  type="checkbox"
                  checked={isBlocked}
                  onChange={(e) => setIsBlocked(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border text-primary focus:ring-ring"
                />
                <label htmlFor="lineage-is-blocked" className="space-y-0.5 cursor-pointer">
                  <div className="text-xs font-medium text-foreground">根血缘硬封禁 (is_blocked)</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    封禁后，该邮箱所有世代（已注销、活跃或未来再注册）均被强制阻断
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">血缘私密运营批注 (admin_notes)</label>
                <p className="text-[11px] text-muted-foreground">仅管理后台内部可见的风控与运营留痕记录</p>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="例如：多次注销重建账号，存在异常刷题特征，保持密切风控关注。"
                  className="flex w-full rounded-md border border-input bg-background p-2 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">业务备注 (remark)</label>
                <Input
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="系统业务备忘"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveRisk}
              disabled={isSaving}
              className="gap-1.5"
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              <span>保存血缘风控与批注</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountLineageCard;
