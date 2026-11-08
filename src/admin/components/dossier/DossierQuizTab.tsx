import React from 'react';
import { Check, Clock, FileQuestion, MessageSquare, Video } from 'lucide-react';
import { DossierMediaAttachments } from './DossierMediaAttachments';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface DossierQuizTabProps {
  completedBanks: any[];
  questionLogs: any[];
  userTextAnswers: Record<string, string>;
  userMediaAttachments: Record<string, any[]>;
  allMediaEntries: any[];
  totalQuestionsCount: number;
  onZoomImage?: (url: string) => void;
}

export const DossierQuizTab: React.FC<DossierQuizTabProps> = ({
  completedBanks,
  questionLogs,
  userTextAnswers,
  userMediaAttachments,
  allMediaEntries,
  totalQuestionsCount,
  onZoomImage,
}) => {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 顶部统计信息 */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <FileQuestion className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            用户作答全部题目与选中明细卷宗
          </h3>
        </div>
        <Badge variant="outline" className="text-xs">
          共 {totalQuestionsCount} 道题目记录
        </Badge>
      </div>

      {/* 问卷所有媒体上传题汇总展播区 */}
      {allMediaEntries.length > 0 && (
        <Card className="border-border/80 bg-muted/20 shadow-xs">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="size-4 text-rose-500" />
                <CardTitle className="text-xs font-semibold">
                  问卷媒体上传题成果汇总 ({allMediaEntries.length} 件)
                </CardTitle>
              </div>
              <span className="text-[11px] text-muted-foreground">
                涵盖视频 / 录音 / 照片等作答凭证
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <DossierMediaAttachments attachments={allMediaEntries} title="全卷媒体成果" onZoomImage={onZoomImage} />
          </CardContent>
        </Card>
      )}

      {/* 题库完整题目与选项渲染 */}
      {completedBanks.length > 0 ? (
        completedBanks.map((bank: any, bIdx: number) => (
          <div key={bank.id || bIdx} className="flex flex-col gap-3">
            <Card className="border-border/80 bg-muted/30 shadow-xs">
              <CardContent className="p-3.5 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[11px] font-semibold">
                    题库 #{bIdx + 1}
                  </Badge>
                  <span className="text-xs font-bold text-foreground">
                    {bank.name || '标准倾向测试题库'}
                  </span>
                </div>
                {bank.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {bank.description}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 题目列表 */}
            <div className="flex flex-col gap-3">
              {(bank.questions || []).map((q: any, qIdx: number) => {
                const log = questionLogs.find((l: any) => l.questionId === q.id) || {};
                const userSelectedIds = log.finalValue?.selectedOptions || [];
                const textAnswer = userTextAnswers[q.id] || log.finalValue?.textInput;
                const questionMedia = userMediaAttachments[q.id] || log.finalValue?.attachments || [];

                return (
                  <Card key={q.id || qIdx} className="shadow-xs border-border/80">
                    <CardContent className="p-4 flex flex-col gap-3">
                      {/* 题干与作答时长 */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="text-[10px] shrink-0 font-mono mt-0.5">
                            Q{qIdx + 1}
                          </Badge>
                          <span className="text-xs font-semibold text-foreground leading-relaxed">
                            {q.title}
                          </span>
                        </div>
                        {log.durationMs !== undefined && (
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 flex items-center gap-1 font-mono">
                            <Clock className="size-3" />
                            {(log.durationMs / 1000).toFixed(1)}s · {log.interactionCount || 1}次操作
                          </span>
                        )}
                      </div>

                      {/* 情境描述 */}
                      {q.scenario && (
                        <p className="text-xs italic text-muted-foreground bg-muted/40 p-2.5 rounded-md border border-border/40">
                          "{q.scenario}"
                        </p>
                      )}

                      {/* 选项列表 */}
                      <div className="flex flex-col gap-2 pt-1">
                        {(q.options || []).map((opt: any, oIdx: number) => {
                          const isSelected = userSelectedIds.includes(opt.id) || userSelectedIds.includes(opt.text);
                          return (
                            <div
                              key={opt.id || oIdx}
                              className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border text-xs transition-colors ${
                                isSelected
                                  ? 'bg-primary/10 border-primary/40 text-foreground font-medium'
                                  : 'bg-card border-border/60 text-muted-foreground hover:bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`size-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-medium ${
                                    isSelected
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted border border-border text-muted-foreground'
                                  }`}
                                >
                                  {isSelected ? <Check className="size-3" /> : String.fromCharCode(65 + oIdx)}
                                </div>
                                <span className="truncate">{opt.text}</span>
                              </div>

                              {isSelected && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                                  已选
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* 用户手填文本 */}
                      {textAnswer && (
                        <div className="mt-1 bg-muted/40 border border-border/80 rounded-lg p-3 flex flex-col gap-1">
                          <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                            <MessageSquare className="size-3" />
                            被测者手填自白文本:
                          </span>
                          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                            {textAnswer}
                          </p>
                        </div>
                      )}

                      {/* 用户上传媒体附件 */}
                      {questionMedia && questionMedia.length > 0 && (
                        <DossierMediaAttachments attachments={questionMedia} title="本题上传成果" onZoomImage={onZoomImage} />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        /* 降级展示单题日志 */
        <div className="flex flex-col gap-3">
          {questionLogs.map((log: any, idx: number) => (
            <Card key={log.questionId || idx} className="shadow-xs border-border/80">
              <CardContent className="p-3.5 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground">题目编号: {log.questionId}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">⏱️ {(log.durationMs / 1000).toFixed(1)}s</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  已选选项 ID: <span className="text-primary font-semibold">{(log.finalValue?.selectedOptions || []).join(', ') || '无'}</span>
                </div>
                {log.finalValue?.textInput && (
                  <div className="text-xs text-foreground bg-muted/40 p-2 rounded-md">
                    手填文本: {log.finalValue.textInput}
                  </div>
                )}
                {log.finalValue?.attachments && (
                  <DossierMediaAttachments attachments={log.finalValue.attachments} title="本题上传成果" onZoomImage={onZoomImage} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default DossierQuizTab;
