import React from 'react';
import type { AdminDossier } from '../../adminTypes';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { User, Camera, FileText } from 'lucide-react';

interface DossierPersonaTabProps {
  dossier: AdminDossier;
  onZoomImage?: (url: string) => void;
}

export const DossierPersonaTab: React.FC<DossierPersonaTabProps> = ({ dossier, onZoomImage }) => {
  const confessionCards = [
    { label: '人前社交面具自述 (C1)', content: dossier.q_surfaceTrait, highlight: false },
    { label: '隐秘深层渴望自白 (C1)', content: dossier.q_innerDesire, highlight: true },
    { label: '暗面触向与边界试探 (C2)', content: dossier.q_boundaryText, highlight: false },
    { label: '偏好的权责与信任交付关系 (C2)', content: dossier.q_relationPreference, highlight: false },
    { label: '觉醒幻想时刻 (C2)', content: dossier.q_awakeningMoment, highlight: false },
    { label: '潜意识宣泄词句 (C3)', content: dossier.q_secretWords, highlight: false },
    { label: '心流规则与暗示约束 (C3)', content: dossier.q_secretRule, highlight: false },
  ];

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. 基础信息数据表 */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
          <div className="flex items-center gap-2">
            <User className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">作答者登记基本信息</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4 pt-0">
          <div className="divide-y divide-border/60 text-xs">
            <div className="flex py-2.5 justify-between sm:justify-start gap-4">
              <span className="w-28 text-muted-foreground font-medium shrink-0">称呼与昵称</span>
              <span className="font-semibold text-foreground">{dossier.nickname || '匿名访客'}</span>
            </div>
            <div className="flex py-2.5 justify-between sm:justify-start gap-4">
              <span className="w-28 text-muted-foreground font-medium shrink-0">性别</span>
              <span className="font-medium text-foreground">{dossier.gender || '未填写 / 保密'}</span>
            </div>
            <div className="flex py-2.5 justify-between sm:justify-start gap-4">
              <span className="w-28 text-muted-foreground font-medium shrink-0">注册账号 / 邮箱</span>
              <span className="text-foreground">{dossier.email || '未登录（匿名访客）'}</span>
            </div>
            <div className="flex py-2.5 justify-between sm:justify-start gap-4">
              <span className="w-28 text-muted-foreground font-medium shrink-0">真实社会职业</span>
              <span className="font-semibold text-foreground">{dossier.q_occupation || dossier.occupation || '未填写'}</span>
            </div>
            <div className="flex py-2.5 justify-between sm:justify-start gap-4">
              <span className="w-28 text-muted-foreground font-medium shrink-0">人前社交性格</span>
              <span className="font-semibold text-primary">{dossier.personaTrait || '未填写'}</span>
            </div>
            <div className="flex py-2.5 justify-between sm:justify-start gap-4">
              <span className="w-28 text-muted-foreground font-medium shrink-0">年龄归属</span>
              <span className="text-foreground">{dossier.age ? `${dossier.age} 岁` : '未填写'}</span>
            </div>
            <div className="flex py-2.5 justify-between sm:justify-start gap-4">
              <span className="w-28 text-muted-foreground font-medium shrink-0">婚姻与伴侣</span>
              <span className="text-foreground">
                {dossier.maritalStatus || '未填写'}{dossier.hasBoyfriend ? ` (${dossier.hasBoyfriend})` : ''}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. 用户上传照片 */}
      {dossier.avatarUrls && dossier.avatarUrls.length > 0 && (
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
            <div className="flex items-center gap-2">
              <Camera className="size-4 text-rose-500" />
              <CardTitle className="text-sm font-semibold">
                用户上传真实照片 ({dossier.avatarUrls.length} 张)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4 pt-0">
            <div className="flex flex-wrap gap-3">
              {dossier.avatarUrls.map((url: string, idx: number) => (
                <img
                  key={idx}
                  src={url}
                  alt={`上传照片 ${idx + 1}`}
                  onClick={() => onZoomImage?.(url)}
                  className="size-24 rounded-lg object-cover border border-border/80 hover:opacity-90 transition-opacity cursor-zoom-in"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. C1-C3 隐秘自白详细卡片 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <FileText className="size-4 text-purple-500" />
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            深度心智与隐秘自白明细
          </h4>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {confessionCards.map((item, idx) => (
            <Card
              key={idx}
              className={`shadow-xs border-border/80 ${
                item.highlight ? 'bg-rose-500/5 border-rose-500/30 sm:col-span-2' : 'bg-card'
              }`}
            >
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-xs font-semibold ${item.highlight ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                  {item.highlight && (
                    <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-600 dark:text-rose-400">
                      核心隐秘自白
                    </Badge>
                  )}
                </div>
                <p className={`text-xs leading-relaxed whitespace-pre-wrap ${item.highlight ? 'text-foreground font-medium' : 'text-foreground'}`}>
                  {item.content || <span className="text-muted-foreground italic">未填写 / 隐私留白</span>}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
export default DossierPersonaTab;
