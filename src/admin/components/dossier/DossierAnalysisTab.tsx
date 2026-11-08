import React from 'react';
import { User, Flame, Sparkles } from 'lucide-react';
import type { AdminDossier } from '../../adminTypes';
import { formatTime } from '../../adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

function getRadarPolygon(d: AdminDossier) {
  const cx = 100;
  const cy = 100;
  const maxR = 75;
  const points = [
    { x: cx, y: cy - (maxR * Math.min(100, d.dominanceIndex)) / 100 },
    { x: cx + (maxR * Math.min(100, d.restraintIndex)) / 100, y: cy },
    { x: cx, y: cy + (maxR * Math.min(100, d.submissionIndex)) / 100 },
    { x: cx - (maxR * Math.min(100, d.sensoryThreshold)) / 100, y: cy },
  ];
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

interface DossierAnalysisTabProps {
  dossier: AdminDossier;
}

export const DossierAnalysisTab: React.FC<DossierAnalysisTabProps> = ({ dossier }) => {
  return (
    <div className="flex flex-col gap-4">
      {/* 1. 核心原型与雷达图卡片 */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-4 sm:p-5 flex flex-wrap items-center gap-6">
          <svg width="120" height="120" viewBox="0 0 200 200" className="overflow-visible shrink-0">
            <defs>
              <radialGradient id="modal-radar-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
            </defs>
            {[0.33, 0.66, 1.0].map((ratio, i) => (
              <circle
                key={i}
                cx="100"
                cy="100"
                r={75 * ratio}
                fill="none"
                className="stroke-border"
                strokeWidth="1"
              />
            ))}
            <line x1="100" y1="15" x2="100" y2="185" className="stroke-border" strokeWidth="1" />
            <line x1="15" y1="100" x2="185" y2="100" className="stroke-border" strokeWidth="1" />
            <polygon
              points={getRadarPolygon(dossier)}
              fill="url(#modal-radar-glow)"
              stroke="#3b82f6"
              strokeWidth="2.2"
            />
          </svg>

          <div className="flex-1 min-w-[220px]">
            <span className="text-[11px] text-primary font-bold uppercase tracking-wider block">
              PRIMARY ARCHETYPE
            </span>
            <h3 className="text-xl font-bold text-foreground mt-0.5 mb-1">
              {dossier.archetypeTitle || '倾向评估中'}
            </h3>
            {dossier.archetypeSubtitle && (
              <p className="text-xs text-muted-foreground mb-3">{dossier.archetypeSubtitle}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                <span className="text-[10px] text-muted-foreground block">支配指数</span>
                <strong className="text-sm text-foreground">{dossier.dominanceIndex}</strong>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                <span className="text-[10px] text-muted-foreground block">克制指数</span>
                <strong className="text-sm text-foreground">{dossier.restraintIndex}</strong>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                <span className="text-[10px] text-muted-foreground block">臣服指数</span>
                <strong className="text-sm text-foreground">{dossier.submissionIndex}</strong>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                <span className="text-[10px] text-muted-foreground block">感官阈值</span>
                <strong className="text-sm text-foreground">{dossier.sensoryThreshold}</strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. 深度解构三大篇章 */}
      <div className="flex flex-col gap-3">
        {/* 人格面具解构 */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-1 pt-3.5 px-4">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <User className="size-4" />
              <CardTitle className="text-xs font-semibold">
                🎭 人格面具深度解构 (Persona Deconstruction)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 pt-1 text-xs text-muted-foreground leading-relaxed">
            {dossier.personaDeconstruction || '暂无该维度的深度面具解构数据。'}
          </CardContent>
        </Card>

        {/* 潜意识阴暗面解构 */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-1 pt-3.5 px-4">
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <Flame className="size-4" />
              <CardTitle className="text-xs font-semibold">
                🌑 潜意识阴暗面与隐秘渴望解构 (Shadow Deconstruction)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 pt-1 text-xs text-foreground leading-relaxed">
            {dossier.shadowDeconstruction || '暂无该维度的阴暗面解构数据。'}
          </CardContent>
        </Card>

        {/* 心理升华与心流指引 */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-1 pt-3.5 px-4">
            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <Sparkles className="size-4" />
              <CardTitle className="text-xs font-semibold">
                ✨ 心理升华与心流指引 (Psychological Sublimation)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3.5 pt-1 text-xs text-muted-foreground leading-relaxed">
            {dossier.psychologicalSublimation || '暂无心理升华指引数据。'}
          </CardContent>
        </Card>
      </div>

      {/* 3. 心理共鸣关键词与暗面标签 */}
      {(Boolean(dossier.resonanceKeywords?.length) || Boolean(dossier.selectedShadowTags?.length)) && (
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4 flex flex-col gap-3">
            {dossier.resonanceKeywords && dossier.resonanceKeywords.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-2">
                  🪞 心理共鸣关键词云
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dossier.resonanceKeywords.map((kw: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      #{kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {dossier.selectedShadowTags && dossier.selectedShadowTags.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-2">
                  🏷️ 潜意识暗面标签
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dossier.selectedShadowTags.map((tag: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. 暗面镜像共鸣与用户心声 */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-1 pt-3.5 px-4">
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <Sparkles className="size-4" />
            <CardTitle className="text-xs font-semibold">
              🪞 暗面镜像共鸣与用户心声 (Mirror Resonance Feedback)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3.5 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-muted-foreground">用户共鸣印记：</span>
            {dossier.resonanceLevel === 'exact' && (
              <Badge variant="default" className="text-xs">
                💎 90% 灵魂被彻底剥离 (精准击中 · 深度共鸣)
              </Badge>
            )}
            {dossier.resonanceLevel === 'partial' && (
              <Badge variant="secondary" className="text-xs">
                🪞 60% 隐约触碰到了暗面 (部分触动)
              </Badge>
            )}
            {dossier.resonanceLevel === 'guarded' && (
              <Badge variant="outline" className="text-xs">
                🛡️ 尚有防备，未完全敞开
              </Badge>
            )}
            {dossier.resonanceLevel === 'custom' && (
              <Badge variant="secondary" className="text-xs">
                ✍️ 暗面另有隐衷 (手写自白)
              </Badge>
            )}
            {!dossier.resonanceLevel && (
              <span className="text-muted-foreground">访客尚未选择共鸣印记</span>
            )}
            {dossier.resonanceAt && (
              <span className="text-[10px] text-muted-foreground">
                (标记于 {formatTime(dossier.resonanceAt)})
              </span>
            )}
          </div>

          {dossier.resonanceText && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 mt-2">
              <span className="text-[11px] font-semibold text-foreground block mb-1">
                💬 作答者手写暗面自白：
              </span>
              <p className="text-xs text-foreground italic leading-relaxed">
                “{dossier.resonanceText}”
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default DossierAnalysisTab;
