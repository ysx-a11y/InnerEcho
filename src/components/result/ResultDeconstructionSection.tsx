import React from 'react';
import { Sparkles, Heart, Layers } from 'lucide-react';
import { LuxuryCard } from '../ui/card';
import { LuxuryBadge } from '../ui/badge';
import { LuxuryButton } from '../ui/button';
import { RadarChart } from '../RadarChart';
import { BdsmDedicatedChart } from '../BdsmDedicatedChart';
import { MirrorResonanceFeedback, type ResonanceLevel } from '../MirrorResonanceFeedback';

interface ResultDeconstructionSectionProps {
  dossierId: string;
  archetypeTitle: string;
  archetypeSubtitle?: string;
  selectedShadowTags: string[];
  personaDeconstruction?: string;
  shadowDeconstruction?: string;
  psychologicalSublimation?: string;
  hasBdsmScores: boolean;
  scoresData: Record<string, number>;
  aggregatedScores?: Record<string, number>;
  completedBankDimensions?: { name: string; key: string }[];
  accentColor: string;
  resonanceLevel?: ResonanceLevel | null;
  resonanceText?: string | null;
  onOpenCardStudio: () => void;
}

export const ResultDeconstructionSection: React.FC<ResultDeconstructionSectionProps> = ({
  dossierId,
  archetypeTitle,
  archetypeSubtitle,
  selectedShadowTags,
  personaDeconstruction,
  shadowDeconstruction,
  psychologicalSublimation,
  hasBdsmScores,
  scoresData,
  aggregatedScores,
  completedBankDimensions,
  accentColor,
  resonanceLevel,
  resonanceText,
  onOpenCardStudio,
}) => {
  return (
    <>
      <article
        className="result-mobile-report w-full max-w-[640px]"
        style={{ '--result-accent': accentColor } as React.CSSProperties}
      >
        {/* 顶部英雄自白区 */}
        <header className="result-mobile-hero">
          <div className="result-mobile-kicker">
            <Sparkles size={14} strokeWidth={1.6} />
            <span>潜意识深度解构报告 · 卷宗 ID: {dossierId}</span>
          </div>

          <h1>{archetypeTitle}</h1>
          {archetypeSubtitle && (
            <p className="result-mobile-subtitle">{archetypeSubtitle}</p>
          )}

          <div className="result-mobile-tags">
            {selectedShadowTags.map((tag, index) => (
              <LuxuryBadge key={index} variant="default" className="text-xs">
                {tag}
              </LuxuryBadge>
            ))}
          </div>

          {/* 3D 实体卡全息展台卡片 */}
          <LuxuryCard
            padding="none"
            className="w-full p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-[rgba(255,112,166,0.12)] via-[rgba(192,132,252,0.08)] to-[rgba(16,8,22,0.85)] border-[rgba(255,112,166,0.35)] flex items-center justify-between gap-3 my-4 box-border text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-xl bg-gradient-to-br from-[#aa26da] to-[#ff70a6] flex items-center justify-center shadow-[0_0_14px_rgba(255,112,166,0.4)] shrink-0">
                <Layers size={18} color="#fff" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  3D 实体绝密自白角色卡
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] truncate">
                  全息质感 · 自由翻转 · 保存手机壁纸
                </div>
              </div>
            </div>

            <LuxuryButton
              type="button"
              onClick={onOpenCardStudio}
              variant="glow"
              size="sm"
              className="text-xs font-bold h-8 px-3 rounded-xl shrink-0 flex items-center gap-1"
            >
              <span>展开 3D 工坊</span>
              <Sparkles size={12} />
            </LuxuryButton>
          </LuxuryCard>
        </header>

        {/* 五维潜意识心相雷达图 */}
        <section className="result-mobile-card flex flex-col items-center text-center">
          <div className="result-mobile-card-title self-start">
            <Sparkles size={15} strokeWidth={1.7} />
            <h2>五维潜意识心相图谱</h2>
          </div>
          <div className="w-full flex justify-center py-2">
            {hasBdsmScores ? (
              <BdsmDedicatedChart scores={aggregatedScores} />
            ) : (
              <RadarChart
                normalized={scoresData as any}
                customAxes={completedBankDimensions}
                scores={aggregatedScores}
                accentColor={accentColor}
                size={230}
              />
            )}
          </div>
        </section>

        {/* 表象社交人格 */}
        <section className="result-mobile-card">
          <div className="result-mobile-card-title">
            <Sparkles size={15} strokeWidth={1.7} />
            <h2>表象社交人格</h2>
          </div>
          <p>{personaDeconstruction || '心理解构分析中...'}</p>
        </section>

        {/* 潜意识暗面渴望 */}
        <section className="result-mobile-card result-mobile-card-highlight">
          <div className="result-mobile-card-title">
            <Heart size={15} strokeWidth={1.7} />
            <h2>潜意识暗面与隐秘渴望</h2>
          </div>
          <p>{shadowDeconstruction || '潜意识暗面解构中...'}</p>
        </section>

        {/* 心理升华与接纳指引 */}
        <section className="result-mobile-card">
          <div className="result-mobile-card-title">
            <Sparkles size={15} strokeWidth={1.7} />
            <h2>心理升华与接纳指引</h2>
          </div>
          <p>{psychologicalSublimation || '心理升华建议生成中...'}</p>
        </section>
      </article>

      {/* 镜像共鸣印记与暗面心声 */}
      <div className="w-full max-w-[640px] mt-6">
        <MirrorResonanceFeedback
          dossierId={dossierId}
          initialLevel={resonanceLevel}
          initialText={resonanceText}
          accentColor={accentColor}
        />
      </div>
    </>
  );
};

