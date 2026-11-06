import React from 'react';

export interface DimensionItem {
  key: string;
  name: string;
  description?: string;
  color?: string;
}

interface GenericDimensionMatrixProps {
  title?: string;
  dimensions?: DimensionItem[];
  scores?: Record<string, number>;
}

// 预设的高奢渐变色系库，自动轮播分配给未来 100 个题库的任意维度
const COLOR_PALETTE = [
  '#ff70a6', '#e100ff', '#ef4444', '#a855f7',
  '#eab308', '#3b82f6', '#14b8a6', '#f97316',
  '#10b981', '#ec4899', '#6366f1', '#06b6d4',
];

export const GenericDimensionMatrix: React.FC<GenericDimensionMatrixProps> = ({
  title = '多维倾向分析矩阵',
  dimensions = [],
  scores = {},
}) => {
  // 如果题库未提供 dimensions 列表，自动从 scores 对象的 key 动态生成列表并进行高奢中译映射
  const renderDimensions: DimensionItem[] =
    dimensions.length > 0
      ? dimensions
      : Object.keys(scores).map((key) => {
          let name = key.toUpperCase();
          let description = `${key} 维度匹配百分比`;
          const lKey = key.toLowerCase();

          if (lKey === 'awareness') {
            name = '洞察觉知 · Awareness';
            description = '对内心隐秘倾向的敏锐觉察与直觉感知力';
          } else if (lKey === 'chaos') {
            name = '深层混沌 · Chaos';
            description = '潜意识中反差属性与原始本能的活跃指数';
          } else if (lKey === 'intuition') {
            name = '直觉潜能 · Intuition';
            description = '非理性心流体验与精神补偿的契合程度';
          } else if (lKey === 'structure') {
            name = '表意识秩序 · Structure';
            description = '社会化人格面具与现实行为防线的坚固度';
          } else if (['dominance', 'dom', 'dominant', 'dominanceindex'].includes(lKey)) {
            name = '支配掌控 · Dominance';
            description = '潜意识中对局面的掌控欲望与规则制定倾向';
          } else if (['submission', 'sub', 'submissive', 'submissionindex'].includes(lKey)) {
            name = '臣服交付 · Submission';
            description = '对信任对象的安全感托付与共鸣配合倾向';
          } else if (['restraint', 's', 'binding', 'bondage', 'restraintindex'].includes(lKey)) {
            name = '情绪克制 · Restraint';
            description = '心理防御机制的紧固度与情绪边界的坚守能力';
          } else if (['sensory', 'm', 'sensorythreshold'].includes(lKey)) {
            name = '感官阈值 · Sensory';
            description = '对情绪张力、情境暗示与感官敏感度的接纳上限';
          }

          return {
            key,
            name,
            description,
          };
        });

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 112, 166, 0.2)',
        borderRadius: 16,
        padding: '1.2rem 1.4rem',
        marginTop: '1rem',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>
          📊 {title}
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>动态维度得分归一化</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {renderDimensions.map((dim, idx) => {
          const rawScore = scores[dim.key] ?? scores[dim.key.toLowerCase()] ?? 50;
          const scorePercent = Math.min(100, Math.max(0, Math.round(rawScore)));
          const themeColor = dim.color || COLOR_PALETTE[idx % COLOR_PALETTE.length];

          return (
            <div key={dim.key} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
                  {dim.name}
                </span>
                <span style={{ fontSize: '0.82rem', color: themeColor, fontWeight: 800 }}>
                  {scorePercent}%
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.08)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${scorePercent}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${themeColor}66, ${themeColor})`,
                    borderRadius: 3,
                    boxShadow: `0 0 8px ${themeColor}aa`,
                    transition: 'width 1.2s cubic-bezier(0.25, 1, 0.5, 1)',
                    position: 'relative',
                  }}
                >
                  {/* Glowing end indicator dot */}
                  {scorePercent > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        right: -3,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: `0 0 10px 3px ${themeColor}, 0 0 4px 1px #ffffff`,
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>
              </div>

              {dim.description && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {dim.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
