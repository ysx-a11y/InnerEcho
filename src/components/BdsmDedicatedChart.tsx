import React from 'react';

export interface BdsmDimensionScore {
  key: string;
  name: string;
  enName: string;
  score: number; // 0 - 100
  color: string;
  description: string;
}

interface BdsmDedicatedChartProps {
  scores?: Record<string, number>;
  variant?: 'standard' | 'simple';
}

export const BdsmDedicatedChart: React.FC<BdsmDedicatedChartProps> = ({ scores = {}, variant = 'standard' }) => {
  const getScore = (keys: string[]): number => {
    for (const key of keys) {
      if (scores[key] !== undefined) return scores[key];
    }
    return 0;
  };

  // 默认正统 8 轴 BDSM 维度算力与映射
  const dimensions: BdsmDimensionScore[] = [
    {
      key: 'dominant',
      name: 'Dominant (支配者)',
      enName: 'Dominant',
      score: getScore(['dominant', 'dominance', 'dom']),
      color: '#ff70a6',
      description: '引导秩序、制定法则与主导气场的心理倾向',
    },
    {
      key: 'submissive',
      name: 'Submissive (顺从者)',
      enName: 'Submissive',
      score: getScore(['submissive', 'submission', 'sub']),
      color: '#e100ff',
      description: '托付信任、接纳指令与沉浸臣服的心理渴望',
    },
    {
      key: 'sadist',
      name: 'Sadist (施虐倾向)',
      enName: 'Sadist',
      score: getScore(['sadist', 's']),
      color: '#ef4444',
      description: '通过主导痛感与情绪起伏获得心理满足的能量',
    },
    {
      key: 'masochist',
      name: 'Masochist (受虐倾向)',
      enName: 'Masochist',
      score: getScore(['masochist', 'm']),
      color: '#a855f7',
      description: '在受控的边界感中释放压力与精神升华的能力',
    },
    {
      key: 'master',
      name: 'Master/Mistress (掌控者)',
      enName: 'Master/Mistress',
      score: getScore(['master', 'possessive']) || getScore(['dominant', 'dominance', 'dom']),
      color: '#eab308',
      description: '注重尊严、契约仪式与全面责任交付的领袖特质',
    },
    {
      key: 'slave',
      name: 'Slave (完全臣服者)',
      enName: 'Slave',
      score: getScore(['slave']) || getScore(['submissive', 'submission', 'sub']),
      color: '#3b82f6',
      description: '追求极致身心交付、放下世俗包袱的纯粹归属感',
    },
    {
      key: 'switch',
      name: 'Switch (双向倒错者)',
      enName: 'Switch',
      score: getScore(['switch']),
      color: '#14b8a6',
      description: '兼具支配与臣服双重镜像、根据场域自由转换能力',
    },
    {
      key: 'bondage',
      name: 'Bondage/Rigger (束缚/绳艺)',
      enName: 'Bondage',
      score: getScore(['bondage', 'restraint', 'binding']),
      color: '#f97316',
      description: '对空间包裹感、身体约束与安全限度的迷恋',
    },
  ];

  const renderedDims = variant === 'simple'
    ? [...dimensions].sort((a, b) => b.score - a.score).slice(0, 3)
    : dimensions;

  if (variant === 'simple') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%', boxSizing: 'border-box' }}>
        {renderedDims.map((dim) => (
          <div key={dim.key} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.74rem', color: '#fff', fontWeight: 600 }}>
                {dim.enName} ({dim.enName === 'Master/Mistress' ? '掌控者' : dim.name.split(' (')[1].replace(')', '')})
              </span>
              <span style={{ fontSize: '0.74rem', color: dim.color, fontWeight: 800 }}>
                {dim.score}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${dim.score}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${dim.color}88, ${dim.color})`,
                  borderRadius: 3,
                  boxShadow: `0 0 6px ${dim.color}aa`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

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
      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>
          📊 国际标准 BDSM 8 轴倾向分析矩阵
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>正统量表 · 维度权威百分比</span>
      </div>

      {/* 8 轴对比柱状条列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {dimensions.map((dim) => (
          <div key={dim.key} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
                {dim.name}
              </span>
              <span style={{ fontSize: '0.82rem', color: dim.color, fontWeight: 800 }}>
                {dim.score}%
              </span>
            </div>

            {/* 进度轨道 */}
            <div
              style={{
                width: '100%',
                height: 8,
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${dim.score}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${dim.color}88, ${dim.color})`,
                  borderRadius: 4,
                  boxShadow: `0 0 10px ${dim.color}aa`,
                  transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              />
            </div>

            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {dim.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
