import React from 'react';

interface RadarChartProps {
  normalized?: {
    awareness?: number;
    chaos?: number;
    intuition?: number;
    structure?: number;
    [key: string]: number | undefined;
  };
  customAxes?: { name: string; key: string }[];
  scores?: Record<string, number>;
  accentColor?: string;
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  normalized = {},
  customAxes,
  scores,
  accentColor = '#00f2fe',
  size = 280,
}) => {
  const center = size / 2;
  const radius = size * 0.36;

  // Use customAxes if provided (dynamic by Question Bank), otherwise fallback to standard 4 axes
  const axes = (customAxes && customAxes.length >= 3)
    ? customAxes.slice(0, 6).map((ca, idx, arr) => {
        const angle = (idx * (2 * Math.PI / arr.length)) - (Math.PI / 2);
        return { name: ca.name, key: ca.key, angle };
      })
    : [
        { name: '洞察觉知', key: 'awareness', angle: -Math.PI / 2 },
        { name: '表意识秩序', key: 'structure', angle: 0 },
        { name: '直觉潜能', key: 'intuition', angle: Math.PI / 2 },
        { name: '深层混沌', key: 'chaos', angle: Math.PI },
      ];

  // Grid concentric rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1.0];

  const getCoordinates = (value: number, angle: number) => {
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const getAxisValue = (key: string) => {
    if (scores && typeof scores[key] === 'number') {
      return Math.round(scores[key]);
    }
    if (typeof normalized[key] === 'number') {
      return Math.round(normalized[key] as number);
    }
    return 50;
  };

  // Build polygon points for data fill
  const dataPoints = axes.map((axis) => {
    const val = getAxisValue(axis.key);
    return getCoordinates(val, axis.angle);
  });

  const pointsString = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const gradientId = `radarGradient_${accentColor.replace('#', '')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 auto', maxWidth: '100%' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {/* Concentric Grid Rings */}
        {rings.map((ring, idx) => {
          const gridPoints = axes.map((a) => getCoordinates(ring * 100, a.angle));
          const gridString = gridPoints.map((p) => `${p.x},${p.y}`).join(' ');
          return (
            <polygon
              key={idx}
              points={gridString}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
              strokeDasharray={idx < 3 ? '3 3' : undefined}
            />
          );
        })}

        {/* Axis Lines */}
        {axes.map((axis, idx) => {
          const end = getCoordinates(100, axis.angle);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
            />
          );
        })}

        {/* Filled Data Polygon */}
        <polygon
          points={pointsString}
          fill={`url(#${gradientId})`}
          stroke={accentColor}
          strokeWidth="2.5"
          style={{ transition: 'all 0.6s ease-out' }}
        />

        {/* Vertex Markers & Score Labels */}
        {dataPoints.map((p, idx) => {
          return (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke={accentColor} strokeWidth="2" />
              <circle cx={p.x} cy={p.y} r="7" fill={accentColor} opacity="0.3" />
            </g>
          );
        })}

        {/* Axis Labels */}
        {axes.map((axis, idx) => {
          const val = getAxisValue(axis.key);
          const labelPos = getCoordinates(120, axis.angle);
          return (
            <text
              key={idx}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text-primary)"
              fontSize="12"
              fontWeight="600"
            >
              {axis.name} <tspan fill={accentColor}>{val}%</tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
};
