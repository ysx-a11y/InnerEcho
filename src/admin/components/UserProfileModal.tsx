import React from 'react';
import {
  X,
  Smartphone,
  Layers,
  Target,
  Flame,
  FileText,
  Clock,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { formatTime } from '../adminApi';
import { getQuestionnaireName } from '../adminUtils';
import type { AdminUserDetails } from '../adminTypes';
import { DictBadge } from './ui/DictBadge';
import { AccountLineageCard } from './users/AccountLineageCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface UserProfileModalProps {
  userId: string | null;
  userDetails: AdminUserDetails | null;
  loading: boolean;
  onClose: () => void;
  onZoomImage?: (url: string) => void;
  onOpenDossier?: (dossierId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  userDetails,
  loading,
  onClose,
  onZoomImage,
  onOpenDossier,
}) => {
  if (!userId) return null;

  return (
    <Dialog open={Boolean(userId)} onOpenChange={(open) => !open && onClose()} modal={false}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-background border-border text-foreground shadow-xl">
        {/* Modal Header */}
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border/80 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                👤
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold">用户全维画像</DialogTitle>
                  {userDetails && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {userDetails.user.email}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="font-mono text-xs text-muted-foreground mt-0.5">
                  ID: {userId}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-sm">正在合成用户画像...</span>
            </div>
          ) : userDetails ? (
            <>
              {/* 0. 根账号血缘与跨世代族谱 */}
              <AccountLineageCard
                currentUserId={userId}
                lineage={userDetails.lineage ?? null}
                generations={userDetails.lineageGenerations ?? []}
              />

              {/* 1. 账号档案 & 关联设备 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="shadow-xs border-border/80">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      📌 账号档案 (本世代)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-1 text-xs">
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div>注册代次: 第{userDetails.user.generation}代</div>
                      <div className="flex items-center gap-1.5">
                        <span>状态:</span>
                        <DictBadge
                          dictCode="user_account_status"
                          value={
                            userDetails.user.accountStatus ||
                            (userDetails.user.deletedAt ? 'deleted' : 'active')
                          }
                          size="xs"
                        />
                      </div>
                      <div className="col-span-2 text-muted-foreground">
                        注册时间: {formatTime(userDetails.user.createdAt)}
                      </div>
                      {userDetails.user.deletedAt && (
                        <div className="col-span-2 text-destructive font-medium">
                          注销时间: {formatTime(userDetails.user.deletedAt)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-xs border-border/80">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="size-3.5 text-primary" />
                      <CardTitle className="text-xs font-semibold text-muted-foreground">
                        关联设备指纹 ({userDetails.devices.length})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-1 text-xs">
                    <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto">
                      {userDetails.devices.length === 0 ? (
                        <span className="text-muted-foreground">无设备记录</span>
                      ) : (
                        userDetails.devices.map((d, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 font-mono text-[11px]"
                          >
                            <span className="truncate max-w-[180px] text-foreground">{d.deviceId}</span>
                            <span className="text-muted-foreground text-[10px]">
                              {formatTime(d.lastLoginAt).slice(0, 10)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 2. 第一章基础档案与表里自白 */}
              <Card className="shadow-xs border-border/80">
                <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">
                      第一章 · 访客基础档案与表里自白
                    </CardTitle>
                  </div>
                  {userDetails.basicInfo ? (
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-[10px]">
                      ✓ 已登记基础资料
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 bg-amber-50 dark:bg-amber-950/30 text-[10px]">
                      ! 暂未登记
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-2">
                  {(() => {
                    const b =
                      userDetails.basicInfo ||
                      (userDetails.dossiers[0]
                        ? {
                            nickname: userDetails.dossiers[0].nickname,
                            occupation: userDetails.dossiers[0].occupation,
                            personaTrait: userDetails.dossiers[0].personaTrait,
                          }
                        : null);

                    if (!b || (!b.nickname && !b.occupation)) {
                      return (
                        <div className="text-xs text-muted-foreground py-2">
                          该用户尚未登记基础昵称与职业信息。
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-3">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                            <span className="text-[11px] text-muted-foreground block mb-0.5">自白昵称</span>
                            <strong className="text-sm text-foreground">{b.nickname || '未填'}</strong>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                            <span className="text-[11px] text-muted-foreground block mb-0.5">真实社会职业</span>
                            <strong className="text-sm text-foreground">{b.occupation || '未填'}</strong>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                            <span className="text-[11px] text-muted-foreground block mb-0.5">人前社交面具</span>
                            <strong className="text-sm text-foreground">
                              {b.personaTrait || (b as any).surfaceTrait || '未填'}
                            </strong>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                            <span className="text-[11px] text-muted-foreground block mb-0.5">性别/年龄/情感</span>
                            <span className="text-xs font-semibold text-foreground">
                              {b.gender || '保密'} · {b.age ? `${b.age}岁` : '保密'} ·{' '}
                              {b.maritalStatus || ((b as any).hasBoyfriend ? '有伴侣' : '单身')}
                            </span>
                          </div>
                        </div>

                        {(b as any).innerDesire && (
                          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                            <span className="text-xs font-semibold text-foreground block mb-1">
                              无人时的暗面渴望自白
                            </span>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {(b as any).innerDesire}
                            </p>
                          </div>
                        )}

                        {/* 自白照片 */}
                        {((b.avatarUrls && b.avatarUrls.length > 0) || b.avatarUrl) && (
                          <div>
                            <span className="text-xs text-muted-foreground block mb-2">
                              登记照片 (
                              {b.avatarUrls?.length || (b.avatarUrl ? 1 : 0)} 张) · 点击放大查阅
                            </span>
                            <div className="flex gap-2 flex-wrap">
                              {(b.avatarUrls || (b.avatarUrl ? [b.avatarUrl] : [])).map((url, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => onZoomImage?.(url)}
                                  className="size-14 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                                >
                                  <img
                                    src={url}
                                    alt="自白照片"
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* 3. 名下卷宗测评 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    📑 名下测评卷宗 ({userDetails.dossiers.length})
                  </h4>
                </div>
                {userDetails.dossiers.length === 0 ? (
                  <Card className="shadow-xs border-border/80">
                    <CardContent className="py-6 text-center text-xs text-muted-foreground">
                      暂无卷宗记录，用户仅完成注册，尚未参与测评。
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {userDetails.dossiers.map((dos) => (
                      <Card key={dos.id} className="shadow-xs border-border/80">
                        <CardContent className="p-3.5 flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-foreground truncate">
                              {getQuestionnaireName(dos, userDetails.bankNames)}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {formatTime(dos.createdAt).slice(0, 16)} · 深度:{' '}
                              {dos.depthRating || '中度'}
                            </div>
                          </div>
                          {onOpenDossier && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenDossier(dos.id)}
                              className="h-7 text-xs ml-2"
                            >
                              查阅卷宗
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. 多维贡献 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="shadow-xs border-border/80">
                  <CardContent className="p-3.5 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground">自建题库</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{userDetails.banks?.length ?? 0}</Badge>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
                      {!userDetails.banks || userDetails.banks.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">无自建题库</span>
                      ) : (
                        userDetails.banks.map((b) => (
                          <div key={b.id} className="p-1.5 rounded bg-muted/40 border border-border/60 text-xs">
                            <div className="font-medium text-foreground truncate">{b.title}</div>
                            <div className="text-[10px] text-muted-foreground font-mono flex justify-between mt-0.5">
                              <span>{b.questionCount} 题</span>
                              <span>{b.auditStatus}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-xs border-border/80">
                  <CardContent className="p-3.5 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground">接取任务</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{userDetails.tasks?.length ?? 0}</Badge>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
                      {!userDetails.tasks || userDetails.tasks.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">无接取任务</span>
                      ) : (
                        userDetails.tasks.map((t) => (
                          <div key={t.id} className="p-1.5 rounded bg-muted/40 border border-border/60 text-xs font-mono">
                            <div className="truncate text-foreground">{t.taskId}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{t.status}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-xs border-border/80">
                  <CardContent className="p-3.5 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground">深夜回响</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{userDetails.echoes?.length ?? 0}</Badge>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
                      {!userDetails.echoes || userDetails.echoes.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">未投掷回响</span>
                      ) : (
                        userDetails.echoes.map((e) => (
                          <div key={e.id} className="p-1.5 rounded bg-muted/40 border border-border/60 text-xs">
                            <div className="text-foreground text-[11px] leading-relaxed truncate">"{e.shadowDesire}"</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">#{e.shadowTag} · {e.echoCount} 共鸣</div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default UserProfileModal;
