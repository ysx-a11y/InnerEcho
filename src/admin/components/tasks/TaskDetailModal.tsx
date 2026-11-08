import React, { useState } from 'react';
import {
  FileText,
  Clock,
  User,
  Mail,
  Calendar,
  AlertTriangle,
  Music,
  Video,
  Image as ImageIcon,
  Copy,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { formatTime } from '../../adminApi';
import type { AdminTaskSummary } from '../../adminTypes';
import { DictBadge } from '../ui/DictBadge';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { AdminImageLightbox } from '../ui/AdminImageLightbox';

interface TaskDetailModalProps {
  task: AdminTaskSummary | null;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  if (!task) return null;

  const isCompleted = task.status === 'completed';
  const isAbandoned = task.status === 'abandoned';

  const handleCopyText = () => {
    if (!task.textContent) return;
    navigator.clipboard.writeText(task.textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-5 gap-4">
          <DialogHeader className="border-b border-border/80 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                  {task.id}
                </span>
                <DictBadge dictCode="task_progress_status" value={task.status} size="xs" />
                <Badge variant="outline" className="text-xs">
                  {task.category}
                </Badge>
              </div>
            </div>

            <DialogTitle className="text-base font-bold text-foreground mt-2 leading-snug">
              {task.title || '无标题任务'}
            </DialogTitle>
          </DialogHeader>

          {/* 任务要求与预设 */}
          <div className="space-y-1 bg-muted/30 p-3 rounded-lg border border-border/70 text-xs">
            <div className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <Sparkles className="size-3.5 text-primary" />
              <span>任务预设要求与引导</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {task.description || '（无特定预设要求）'}
            </p>
          </div>

          {/* 用户与时间信息 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-lg border border-border/70 bg-card text-xs">
            <div>
              <span className="text-[11px] text-muted-foreground block mb-0.5">接取用户</span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                <User className="size-3.5 text-primary" />
                {task.nickname || '神秘客'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block mb-0.5">联系邮箱</span>
              <span className="text-foreground truncate block font-mono text-[11px]">
                {task.email || '—'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block mb-0.5">接取时间</span>
              <span className="text-muted-foreground font-mono text-[11px] flex items-center gap-1">
                <Calendar className="size-3" />
                {formatTime(task.acceptedAt)}
              </span>
            </div>
          </div>

          {/* 提交成果区 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="size-4 text-emerald-500" />
                <span>受测者提交自白与成果</span>
              </span>

              {task.textContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyText}
                  className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  <span>{copied ? '已复制' : '复制自白'}</span>
                </Button>
              )}
            </div>

            {isCompleted ? (
              <div className="space-y-3">
                {/* 文本内容 */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 text-xs leading-relaxed text-foreground whitespace-pre-wrap select-text font-serif">
                  {task.textContent || '（该任务无文字描述提交）'}
                </div>

                {/* 附件列表 */}
                {task.attachments && task.attachments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      📎 交付附件成果 ({task.attachments.length} 个)
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {task.attachments.map((att: any, idx: number) => {
                        if (att.type === 'image' || att.dataUrl?.startsWith('data:image')) {
                          return (
                            <div
                              key={att.id || idx}
                              className="rounded-lg border border-border/80 overflow-hidden bg-muted/30 p-2 flex items-center gap-2.5"
                            >
                              <img
                                src={att.dataUrl}
                                alt="成果图片"
                                onClick={() => setZoomedImg(att.dataUrl)}
                                className="size-16 rounded object-cover border border-border/80 cursor-zoom-in hover:opacity-90 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-semibold block text-foreground truncate">
                                  自白拍摄图片
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  点击图片放大查验
                                </span>
                              </div>
                            </div>
                          );
                        } else if (
                          att.type === 'audio' ||
                          att.dataUrl?.startsWith('data:audio') ||
                          att.type?.startsWith('audio/')
                        ) {
                          return (
                            <div
                              key={att.id || idx}
                              className="p-2.5 rounded-lg border border-border/80 bg-background flex flex-col gap-1.5 col-span-full"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                  <Music className="size-3.5 text-amber-500" />
                                  <span>服从录音录像自白</span>
                                </span>
                                {att.durationSeconds && (
                                  <span className="font-mono text-muted-foreground">
                                    {Math.round(att.durationSeconds)} 秒
                                  </span>
                                )}
                              </div>
                              <audio src={att.dataUrl} controls className="h-8 w-full" />
                            </div>
                          );
                        } else if (
                          att.type === 'video' ||
                          att.dataUrl?.startsWith('data:video') ||
                          att.type?.startsWith('video/')
                        ) {
                          return (
                            <div
                              key={att.id || idx}
                              className="p-2.5 rounded-lg border border-border/80 bg-background flex flex-col gap-1.5 col-span-full"
                            >
                              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                                <Video className="size-3.5 text-primary" />
                                <span>视频成果记录</span>
                              </span>
                              <video src={att.dataUrl} controls className="w-full max-h-56 rounded bg-black" />
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}

                {task.completedAt && (
                  <div className="text-[11px] text-muted-foreground text-right font-mono">
                    完成交付于：{formatTime(task.completedAt)}
                  </div>
                )}
              </div>
            ) : isAbandoned ? (
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="size-5 shrink-0" />
                <div>
                  <strong className="block font-semibold">该任务已被用户主动放弃</strong>
                  <span className="text-[11px] text-muted-foreground">用户未提交任何文本自白或音频附件成果</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-border/80 bg-muted/10 text-muted-foreground text-xs flex items-center gap-2">
                <Clock className="size-5 shrink-0 text-sky-500" />
                <div>
                  <strong className="block font-semibold text-foreground">任务进行中</strong>
                  <span className="text-[11px]">受测者已接取该任务，尚在撰写与录制自白中</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AdminImageLightbox imageUrl={zoomedImg} onClose={() => setZoomedImg(null)} />
    </>
  );
};

export default TaskDetailModal;

