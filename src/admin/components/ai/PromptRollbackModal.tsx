import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import type { PromptVersionContract } from '../../adminTypes';
import { formatTime } from '../../adminApi';
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

interface PromptRollbackModalProps {
  opened: boolean;
  templateName: string;
  versions: PromptVersionContract[];
  currentVersionId: string | null;
  onClose: () => void;
  onRollback: (data: { targetVersionId: string; adminNotes: string; remark: string }) => Promise<void>;
}

export const PromptRollbackModal: React.FC<PromptRollbackModalProps> = ({
  opened,
  templateName,
  versions,
  currentVersionId,
  onClose,
  onRollback,
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null;

  const handleConfirm = async () => {
    if (!selectedVersionId) {
      setError('请选择要回滚到的目标版本');
      return;
    }
    if (selectedVersionId === currentVersionId) {
      setError('目标版本已经是当前生效版本，无需回滚');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onRollback({
        targetVersionId: selectedVersionId,
        adminNotes: adminNotes.trim(),
        remark: '版本回滚操作',
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '回滚执行失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="gap-1.5">
          <div className="flex items-center gap-2">
            <RotateCcw className="size-5 text-amber-500" />
            <DialogTitle className="text-base font-semibold">
              版本瞬时回滚 · {templateName}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            选择历史快照版本。确认回滚后，系统将瞬时切换当前生效提示词为该快照内容，无需停机或重新发版。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">选择目标历史版本 *</label>
            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">-- 请选择要回滚的版本快照 --</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNum} · {v.changeSummary || '未记录改动'} ({formatTime(v.createdAt)})
                  {v.id === currentVersionId ? ' [当前生效]' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedVersion && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-xs">
              <div className="font-semibold text-foreground">
                快照详情预览 (v{selectedVersion.versionNum})：
              </div>
              <div className="text-[11px] text-muted-foreground">
                提交人: {selectedVersion.createdBy} | 时间: {formatTime(selectedVersion.createdAt)}
              </div>
              <div>
                <span className="font-medium text-foreground">改动说明: </span>
                <span className="text-muted-foreground">{selectedVersion.changeSummary}</span>
              </div>
              <pre className="max-h-28 overflow-y-auto rounded bg-muted/60 p-2 font-mono text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">
                {selectedVersion.systemPrompt.slice(0, 300)}...
              </pre>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">回滚原因备忘 (Admin Notes)</label>
            <Input
              placeholder="如：因线上v3版本个别字段格式异常，临时回滚至v2"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!selectedVersionId || selectedVersionId === currentVersionId || loading}
            className="gap-1.5"
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            <span>确认回滚至该版本</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromptRollbackModal;
