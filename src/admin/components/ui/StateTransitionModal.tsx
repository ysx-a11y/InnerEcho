import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { DictBadge } from './DictBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { Input } from './input';

export interface StateTransitionModalProps {
  opened: boolean;
  onClose: () => void;
  dictCode: string;
  fromValue: string;
  toValue: string;
  actionName: string;
  title?: string;
  targetName?: string;
  onConfirm: (data: { adminNotes?: string; remark?: string }) => Promise<void> | void;
}

export const StateTransitionModal: React.FC<StateTransitionModalProps> = ({
  opened,
  onClose,
  dictCode,
  fromValue,
  toValue,
  actionName,
  title = '状态流转与审核核准',
  targetName,
  onConfirm,
}) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm({
        adminNotes: adminNotes.trim() || undefined,
        remark: remark.trim() || undefined,
      });
      setAdminNotes('');
      setRemark('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '状态流转失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          </div>
          {targetName && (
            <DialogDescription className="text-xs text-muted-foreground">
              目标对象：<span className="font-semibold text-foreground">{targetName}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* 状态流转指示卡 */}
          <div className="flex items-center justify-center gap-4 p-3 rounded-lg border border-border/80 bg-muted/40">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] text-muted-foreground">当前状态</span>
              <DictBadge dictCode={dictCode} value={fromValue} size="md" />
            </div>

            <div className="flex items-center gap-1 text-primary">
              <ArrowRight className="size-4" />
              <span className="text-xs font-bold">{actionName}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] text-muted-foreground">目标状态</span>
              <DictBadge dictCode={dictCode} value={toValue} size="md" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2.5 rounded-md">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 批注 textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              管理员审核批注 (admin_notes)
            </label>
            <span className="text-[11px] text-muted-foreground">
              记录本次人工审核原因、风控结论或整改意见（仅后台内部可见）
            </span>
            <textarea
              placeholder="例如：自白真实深刻，符合社区自白规范，予以通过。"
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="flex min-h-[75px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* 业务备注 input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              业务备注 (remark)
            </label>
            <span className="text-[11px] text-muted-foreground">
              系统或对外业务说明（可选）
            </span>
            <Input
              placeholder="例如：人工初审"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={loading} className="gap-1.5">
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            <span>确认执行流转</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default StateTransitionModal;
