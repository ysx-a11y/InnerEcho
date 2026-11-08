import React, { useState } from 'react';
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface PromptVersionModalProps {
  opened: boolean;
  templateName: string;
  onClose: () => void;
  onSubmit: (data: { changeSummary: string; remark: string; adminNotes: string }) => Promise<void>;
}

export const PromptVersionModal: React.FC<PromptVersionModalProps> = ({
  opened,
  templateName,
  onClose,
  onSubmit,
}) => {
  const [changeSummary, setChangeSummary] = useState('');
  const [remark, setRemark] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!changeSummary.trim()) {
      setError('请简要填写本次版本的变更摘要（例如：微调文学共鸣关键词、强化表里反差）');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        changeSummary: changeSummary.trim(),
        remark: remark.trim(),
        adminNotes: adminNotes.trim(),
      });
      setChangeSummary('');
      setRemark('');
      setAdminNotes('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存快照失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <DialogTitle className="text-base font-semibold">
              固化保存为新版本快照 · {templateName}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            将当前草稿固化为不可变版本快照并持久化留痕，支持后续秒级回滚。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">本次版本变更摘要 *</label>
            <p className="text-[11px] text-muted-foreground">如：优化主审官冷峻人设追问语气，强化防注入护栏</p>
            <textarea
              rows={2}
              placeholder="请准确总结本次主要变动..."
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">业务说明 (Remark)</label>
            <Input
              placeholder="如：2026Q4 审讯室语料迭代"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">管理留痕批注 (Admin Notes)</label>
            <Input
              placeholder="内部运营留痕信息"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            <span>固化生成新版本</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromptVersionModal;
