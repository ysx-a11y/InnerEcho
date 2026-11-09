import React from 'react';
import {
  X,
  Layers,
  Sparkles,
  User,
  Eye,
} from 'lucide-react';
import { formatDuration, formatTime } from '../adminApi';
import { getQuestionnaireName } from '../adminUtils';
import type { AdminDossier } from '../adminTypes';
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
import { cn } from '../lib/utils';

export interface UserGroupData {
  userKey: string;
  userId?: string;
  nickname: string;
  avatarUrl?: string;
  email?: string;
  deviceId?: string;
  gender?: string;
  occupation?: string;
  personaTrait?: string;
  age?: string;
  maritalStatus?: string;
  hasBoyfriend?: string;
  dossiers: AdminDossier[];
  guestDossierCount?: number;
  userDossierCount?: number;
  isPureGuest?: boolean;
}

interface RespondentProfileModalProps {
  userGroup: UserGroupData | null;
  bankNames?: Record<string, string>;
  onClose: () => void;
  onSelectDossier?: (dossier: AdminDossier) => void;
  onZoomImage?: (url: string) => void;
}

export const RespondentProfileModal: React.FC<RespondentProfileModalProps> = ({
  userGroup,
  bankNames = {},
  onClose,
  onSelectDossier,
  onZoomImage,
}) => {
  if (!userGroup) return null;

  const latestDossier = userGroup.dossiers[0];
  const surfaceTrait =
    latestDossier?.q_surfaceTrait ||
    (latestDossier as any)?.dossierData?.chapter1?.surfaceTrait;
  const innerDesire =
    latestDossier?.q_innerDesire ||
    (latestDossier as any)?.dossierData?.chapter1?.innerDesire;
  const boundaryText =
    latestDossier?.q_boundaryText ||
    (latestDossier as any)?.dossierData?.chapter2?.boundaryText;
  const secretWords =
    latestDossier?.q_secretWords ||
    (latestDossier as any)?.dossierData?.chapter3?.secretWords;
  const avatarPhotos = latestDossier?.avatarUrls || [];

  return (
    <Dialog open={Boolean(userGroup)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-background border-border text-foreground shadow-xl">
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border/80 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
              <User className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold">
                  {userGroup.nickname || '神秘答卷者'} · 档案全貌
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-xs font-medium',
                    userGroup.isPureGuest
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                  )}
                >
                  {userGroup.isPureGuest ? '访客设备' : '注册会员'}
                </Badge>
              </div>
              <DialogDescription className="font-mono text-xs text-muted-foreground mt-0.5">
                {userGroup.email ? `邮箱: ${userGroup.email}` : `设备指纹: ${userGroup.deviceId || '—'}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* 属性网格 */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-xs border-border/80">
              <CardContent className="p-3">
                <span className="text-[11px] text-muted-foreground block mb-0.5">自白昵称</span>
                <strong className="text-sm text-foreground">{userGroup.nickname || '神秘探索者'}</strong>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border/80">
              <CardContent className="p-3">
                <span className="text-[11px] text-muted-foreground block mb-0.5">真实社会职业</span>
                <strong className="text-sm text-foreground">{userGroup.occupation || '—'}</strong>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border/80">
              <CardContent className="p-3">
                <span className="text-[11px] text-muted-foreground block mb-0.5">人前特质 / 面具</span>
                <strong className="text-sm text-foreground">
                  {userGroup.personaTrait || surfaceTrait || '—'}
                </strong>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border/80">
              <CardContent className="p-3">
                <span className="text-[11px] text-muted-foreground block mb-0.5">累计生成卷宗</span>
                <strong className="text-sm text-foreground">{userGroup.dossiers.length} 份</strong>
              </CardContent>
            </Card>
          </div>

          {/* 隐秘自白与心理渴望 */}
          {(innerDesire || boundaryText || secretWords) && (
            <Card className="shadow-xs border-border/80">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center gap-1.5 text-primary">
                  <Sparkles className="size-4" />
                  <CardTitle className="text-xs font-semibold">隐秘渴望与心理边界自白</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-1 flex flex-col gap-2.5 text-xs">
                {innerDesire && (
                  <div className="rounded-md bg-muted/40 p-2.5">
                    <span className="font-semibold text-foreground block mb-0.5">暗面渴望:</span>
                    <p className="text-muted-foreground leading-relaxed">{innerDesire}</p>
                  </div>
                )}
                {boundaryText && (
                  <div className="rounded-md bg-muted/40 p-2.5">
                    <span className="font-semibold text-foreground block mb-0.5">底线与恐惧边界:</span>
                    <p className="text-muted-foreground leading-relaxed">{boundaryText}</p>
                  </div>
                )}
                {secretWords && (
                  <div className="rounded-md bg-muted/40 p-2.5">
                    <span className="font-semibold text-foreground block mb-0.5">隐秘独白:</span>
                    <p className="text-muted-foreground leading-relaxed">{secretWords}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 上传照片 */}
          {avatarPhotos.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground block mb-2">
                作答自白登记照片 ({avatarPhotos.length} 张)
              </span>
              <div className="flex gap-2 flex-wrap">
                {avatarPhotos.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onZoomImage?.(url)}
                    className="size-14 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                  >
                    <img src={url} alt="自白照片" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 卷宗历程列表 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Layers className="size-3.5" />
              测评卷宗历程 ({userGroup.dossiers.length})
            </h4>
            <div className="flex flex-col gap-2">
              {userGroup.dossiers.map((dos) => (
                <Card key={dos.id} className="shadow-xs border-border/80">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-foreground">
                        {getQuestionnaireName(dos, bankNames)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {formatTime(dos.createdAt).slice(0, 16)} · 耗时 {formatDuration(dos.durationSeconds)} ·{' '}
                        {dos.depthRating ? `深度: ${dos.depthRating}` : ''}
                      </div>
                    </div>
                    {onSelectDossier && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectDossier(dos)}
                        className="h-7 px-2 text-xs gap-1"
                      >
                        <Eye className="size-3.5" />
                        <span>查阅详情</span>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default RespondentProfileModal;
