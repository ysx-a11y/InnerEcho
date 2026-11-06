import React, { useState } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import type { AdminOverview } from '../../adminTypes';

interface DashboardTrendChartProps {
  weekly: AdminOverview['weekly'];
}

export const DashboardTrendChart: React.FC<DashboardTrendChartProps> = ({ weekly }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const svgWidth = 560;
  const svgHeight = 150;
  const paddingX = 45;
  const paddingY = 22;

  const dataList = (weekly ?? []).map((item) => ({
    label: item.label || item.date || '—',
    pv: item.pv,
    submit: item.submit,
  }));

  if (dataList.length === 0) {
    return (
      <div
        className="glass-card"
        style={{
          padding: '1.1rem 1.3rem',
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 51, 119, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Activity size={16} color="#ff70a6" />
            <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)' }}>
              近 7 天流量与填报趋势分析
            </h3>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--admin-text-secondary)', margin: '0.2rem 0 0 0' }}>
            页面浏览量 (PV) 与 50 题深度卷宗完成量对比
          </p>
        </div>
        <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '2.5rem 0' }}>
          暂无近 7 天趋势数据
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...dataList.map((i) => i.pv), 1) * 1.15;

  const coords = dataList.map((item, index) => {
    const x = paddingX + (index / Math.max(dataList.length - 1, 1)) * (svgWidth - paddingX * 2);
    const yPv = svgHeight - paddingY - ((item.pv - 0) / maxVal) * (svgHeight - paddingY * 2);
    const ySubmit = svgHeight - paddingY - ((item.submit - 0) / maxVal) * (svgHeight - paddingY * 2);
    return { x, yPv, ySubmit, ...item };
  });

  const getCurvePath = (key: 'yPv' | 'ySubmit') => {
    if (coords.length === 0) return '';
    let d = `M ${coords[0].x} ${coords[0][key]}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 3;
      const cpY1 = curr[key];
      const cpX2 = curr.x + (2 * (next.x - curr.x)) / 3;
      const cpY2 = next[key];
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next[key]}`;
    }
    return d;
  };

  const getAreaPath = (key: 'yPv' | 'ySubmit') => {
    const curve = getCurvePath(key);
    if (!curve) return '';
    return `${curve} L ${coords[coords.length - 1].x} ${svgHeight - paddingY} L ${coords[0].x} ${svgHeight - paddingY} Z`;
  };

  const hoveredItem = hoveredIdx !== null ? coords[hoveredIdx] : null;

  return (
    <div
      className="glass-card"
      style={{
        padding: '1.1rem 1.3rem',
        borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
        border: '1px solid rgba(255, 112, 166, 0.2)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 51, 119, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
        position: 'relative',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Activity size={16} color="#ff70a6" />
            <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)' }}>
              近 7 天流量与填报趋势分析
            </h3>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--admin-text-secondary)', margin: '0.2rem 0 0 0' }}>
            页面浏览量 (PV) 与 50 题深度卷宗完成量对比
          </p>
        </div>

        {/* Legends */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#80f3ff' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#80f3ff', boxShadow: '0 0 8px #80f3ff' }} />
            <span>页面访问 (PV)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#ff70a6' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff70a6', boxShadow: '0 0 8px #ff70a6' }} />
            <span>卷宗提交 (Submit)</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            {/* PV Area Gradient */}
            <linearGradient id="pvAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#80f3ff" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#80f3ff" stopOpacity="0.0" />
            </linearGradient>
            {/* Submit Area Gradient */}
            <linearGradient id="submitAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff70a6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ff70a6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = svgHeight - paddingY - ratio * (svgHeight - paddingY * 2);
            return (
              <line
                key={ratio}
                x1={paddingX}
                y1={y}
                x2={svgWidth - paddingX}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Area Fills */}
          <path d={getAreaPath('yPv')} fill="url(#pvAreaGrad)" />
          <path d={getAreaPath('ySubmit')} fill="url(#submitAreaGrad)" />

          {/* Line Strokes */}
          <path
            d={getCurvePath('yPv')}
            fill="none"
            stroke="#80f3ff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={getCurvePath('ySubmit')}
            fill="none"
            stroke="#ff70a6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points & Interaction */}
          {coords.map((item, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <g key={item.label}>
                {/* Vertical hover indicator bar */}
                {isHovered && (
                  <line
                    x1={item.x}
                    y1={paddingY}
                    x2={item.x}
                    y2={svgHeight - paddingY}
                    stroke="rgba(255, 112, 166, 0.4)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* PV Circle */}
                <circle
                  cx={item.x}
                  cy={item.yPv}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#0e0512"
                  stroke="#80f3ff"
                  strokeWidth="2"
                  style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                />

                {/* Submit Circle */}
                <circle
                  cx={item.x}
                  cy={item.ySubmit}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#0e0512"
                  stroke="#ff70a6"
                  strokeWidth="2"
                  style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                />

                {/* Day Labels */}
                <text
                  x={item.x}
                  y={svgHeight - 4}
                  textAnchor="middle"
                  fill={isHovered ? '#fff' : 'var(--admin-text-muted)'}
                  fontSize="10"
                  fontWeight={isHovered ? 700 : 500}
                >
                  {item.label}
                </text>

                {/* Interactive trigger transparent rectangle */}
                <rect
                  x={item.x - 20}
                  y={0}
                  width={40}
                  height={svgHeight}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredItem && (
          <div
            style={{
              position: 'absolute',
              left: `${(hoveredItem.x / svgWidth) * 100}%`,
              top: '10px',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(145deg, rgba(28, 14, 38, 0.98) 0%, rgba(14, 6, 20, 0.98) 100%)',
              border: '1px solid rgba(255, 112, 166, 0.4)',
              borderRadius: 10,
              padding: '0.45rem 0.75rem',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 51, 119, 0.2)',
              pointerEvents: 'none',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              minWidth: 135,
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fff0f5', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.2rem', whiteSpace: 'nowrap' }}>
              {hoveredItem.label} 数据快照
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#80f3ff', whiteSpace: 'nowrap', gap: '0.75rem' }}>
              <span>页面访问 (PV):</span>
              <strong style={{ marginLeft: 'auto', fontWeight: 800 }}>{hoveredItem.pv}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#ff70a6', whiteSpace: 'nowrap', gap: '0.75rem' }}>
              <span>卷宗提交:</span>
              <strong style={{ marginLeft: 'auto', fontWeight: 800 }}>{hoveredItem.submit}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
