import React from 'react';
import { Loader2, Layers, Compass, Activity } from 'lucide-react';
import type { GlobalStatsContract } from '../../../shared/apiContracts';

interface DataViewMetricsPanelProps {
  statsLoading: boolean;
  stats: GlobalStatsContract | null;
  userDimensions?: {
    dominance: number;
    submission: number;
    restraint: number;
    sensory: number;
  } | null;
  onStartQuiz?: () => void;
}

export const DataViewMetricsPanel: React.FC<DataViewMetricsPanelProps> = ({
  statsLoading,
  stats,
  userDimensions,
  onStartQuiz,
}) => {
  return (
    <div className="flex flex-col gap-5">
      {statsLoading ? (
        <div className="text-center py-12 text-[#80f3ff]">
          <Loader2 size={28} className="animate-spin mx-auto mb-2.5" />
          <div className="text-xs">正在聚合全网潜意识光谱...</div>
        </div>
      ) : stats ? (
        <>
          {/* 核心全网宏观脉搏卡片 */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[rgba(18,6,24,0.6)] border border-[rgba(255,112,166,0.2)] rounded-2xl p-3 sm:py-3.5 text-center">
              <div className="text-xs text-white/50 mb-1">🌌 探索灵魂数</div>
              <div className="text-lg sm:text-xl font-extrabold text-[#ff70a6]">
                {stats.fuzzedExplorerCount}
              </div>
            </div>

            <div className="bg-[rgba(18,6,24,0.6)] border border-[rgba(0,242,254,0.2)] rounded-2xl p-3 sm:py-3.5 text-center">
              <div className="text-xs text-white/50 mb-1">🔓 解封卷宗数</div>
              <div className="text-lg sm:text-xl font-extrabold text-[#80f3ff]">
                {stats.fuzzedDossierCount}
              </div>
            </div>

            <div className="bg-[rgba(18,6,24,0.6)] border border-[rgba(255,209,128,0.2)] rounded-2xl p-3 sm:py-3.5 text-center">
              <div className="text-xs text-white/50 mb-1">⚡ 平均反差张力</div>
              <div className="text-lg sm:text-xl font-extrabold text-[#ffd180]">
                {stats.averageDisparityScore}%
              </div>
            </div>
          </div>

          {/* 全网潜意识深度评级分布 */}
          <div className="bg-[rgba(18,6,24,0.65)] border border-white/10 rounded-2xl p-4 sm:p-5">
            <div className="text-sm font-bold mb-3 flex items-center gap-1.5 text-white">
              <Layers size={16} color="#80f3ff" />
              <span>潜意识探索深度分布</span>
            </div>

            {/* 分段进度条 */}
            <div className="h-3 rounded-full bg-white/10 flex overflow-hidden mb-3">
              <div
                className="bg-gradient-to-r from-[#ff70a6] to-[#e100ff] shadow-[0_0_8px_rgba(255,112,166,0.5)]"
                style={{ width: `${stats.depthDistribution.deep}%` }}
                title={`暗夜破局: ${stats.depthDistribution.deep}%`}
              />
              <div
                className="bg-gradient-to-r from-[#ffd180] to-[#ff8c42] shadow-[0_0_8px_rgba(255,209,128,0.5)]"
                style={{ width: `${stats.depthDistribution.medium}%` }}
                title={`双重倒错: ${stats.depthDistribution.medium}%`}
              />
              <div
                className="bg-gradient-to-r from-[#80f3ff] to-[#00f2fe] shadow-[0_0_8px_rgba(128,243,255,0.5)]"
                style={{ width: `${stats.depthDistribution.light}%` }}
                title={`暗光萌芽: ${stats.depthDistribution.light}%`}
              />
            </div>

            {/* 图例 */}
            <div className="flex justify-between text-xs">
              <span className="text-[#ff70a6]">● 暗夜破局 (~{stats.depthDistribution.deep}%)</span>
              <span className="text-[#ffd180]">● 双重倒错 (~{stats.depthDistribution.medium}%)</span>
              <span className="text-[#80f3ff]">● 暗光萌芽 (~{stats.depthDistribution.light}%)</span>
            </div>
          </div>

          {/* 四维能量对比雷达图 */}
          <div className="bg-[rgba(18,6,24,0.65)] border border-[rgba(255,112,166,0.2)] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Compass size={16} color="#ff70a6" />
                <span>四维潜意识能量雷达</span>
              </div>
              {userDimensions ? (
                <span className="text-xs text-[#80f3ff] font-semibold">
                  已叠加你的个人测评分位
                </span>
              ) : (
                <span className="text-xs text-white/45">
                  全网均值基准线
                </span>
              )}
            </div>

            {/* 四维能量柱状条 */}
            <div className="flex flex-col gap-3">
              {[
                { key: 'dominance', label: '支配指数 (Dominance)', avg: stats.dimensionAverages.dominance, user: userDimensions?.dominance, color: '#ff70a6' },
                { key: 'submission', label: '臣服指数 (Submission)', avg: stats.dimensionAverages.submission, user: userDimensions?.submission, color: '#e100ff' },
                { key: 'restraint', label: '克制指数 (Restraint)', avg: stats.dimensionAverages.restraint, user: userDimensions?.restraint, color: '#ffd180' },
                { key: 'sensory', label: '感官阀值 (Sensory)', avg: stats.dimensionAverages.sensory, user: userDimensions?.sensory, color: '#80f3ff' },
              ].map((dim) => (
                <div key={dim.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/85">{dim.label}</span>
                    <div className="flex gap-2 font-bold">
                      {dim.user !== undefined && (
                        <span style={{ color: dim.color }}>你: {dim.user}%</span>
                      )}
                      <span className="text-white/45">全网: {dim.avg}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 relative overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${dim.user ?? dim.avg}%`,
                        background: `linear-gradient(90deg, ${dim.color}88, ${dim.color})`,
                        boxShadow: `0 0 6px ${dim.color}`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 若无个人测评，展示引导演示卡 */}
            {!userDimensions && (
              <div className="mt-4 p-3.5 rounded-xl bg-[rgba(255,112,166,0.08)] border border-[rgba(255,112,166,0.25)] flex items-center justify-between gap-2">
                <div className="text-xs text-white/85">
                  完成一次测试，点亮专属四维雷达并与全网对撞
                </div>
                <button
                  type="button"
                  onClick={onStartQuiz}
                  className="shrink-0 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#ff70a6] to-[#e100ff] border-none text-white text-xs font-bold cursor-pointer"
                >
                  开启探索
                </button>
              </div>
            )}
          </div>

          {/* 职业 vs 潜意识反差力学星盘 */}
          <div className="bg-[rgba(18,6,24,0.65)] border border-white/10 rounded-2xl p-4 sm:p-5">
            <div className="text-sm font-extrabold mb-3.5 flex items-center gap-1.5 text-white">
              <Activity size={16} color="#ffd180" />
              <span>职业面具 vs 潜意识反差力学洞察</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {stats.occupationInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="bg-white/[0.03] rounded-xl p-3 flex justify-between items-center gap-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-[#ffd180]">
                      {insight.occupationGroup}
                    </span>
                    <span className="text-[11px] text-white/60">
                      {insight.topTrait}
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-[#ff70a6] shrink-0">
                    ~{insight.contrastPercentage}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

