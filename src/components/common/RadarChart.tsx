import React from 'react';

interface RadarDataPoint {
  label: string;
  code: string;
  target: number;
  current: number;
  secondary?: number;
  fullMark?: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  targetLabel?: string;
  currentLabel?: string;
  secondaryLabel?: string;
  showSecondary?: boolean;
  currentColor?: string;
  targetColor?: string;
  secondaryColor?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  size = 360,
  targetLabel = 'Mục tiêu FC (Target)',
  currentLabel = 'Hiện tại (Assessed)',
  secondaryLabel = 'Tự đánh giá (Self)',
  showSecondary = false,
  currentColor = '#2563EB',
  targetColor = '#D4AF37',
  secondaryColor = '#10B981',
}) => {
  const center = size / 2;
  const radius = (size / 2) - 48;
  const numAxes = data.length;
  const angleStep = (Math.PI * 2) / numAxes;
  const maxLevel = 4;

  // Calculate coordinates for a given axis index and value (1-4)
  const getCoordinates = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (Math.max(0.5, Math.min(maxLevel, value)) / maxLevel) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Generate background concentric polygons for levels 1 to 4
  const levels = [1, 2, 3, 4];
  const levelPolygons = levels.map((lvl) => {
    const points = data
      .map((_, i) => {
        const { x, y } = getCoordinates(i, lvl);
        return `${x},${y}`;
      })
      .join(' ');
    return { lvl, points };
  });

  // Target polygon points
  const targetPoints = data
    .map((d, i) => {
      const { x, y } = getCoordinates(i, d.target);
      return `${x},${y}`;
    })
    .join(' ');

  // Current polygon points
  const currentPoints = data
    .map((d, i) => {
      const { x, y } = getCoordinates(i, d.current);
      return `${x},${y}`;
    })
    .join(' ');

  // Secondary polygon points (optional)
  const secondaryPoints = showSecondary
    ? data
        .map((d, i) => {
          const { x, y } = getCoordinates(i, d.secondary ?? d.current);
          return `${x},${y}`;
        })
        .join(' ')
    : '';

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        className="overflow-visible select-none drop-shadow-sm"
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={currentColor} stopOpacity="0.30" />
            <stop offset="100%" stopColor={currentColor} stopOpacity="0.03" />
          </radialGradient>
          <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={targetColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={targetColor} stopOpacity="0.02" />
          </radialGradient>
          <radialGradient id="secondaryGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.02" />
          </radialGradient>
        </defs>

        {/* Level Polygons */}
        {levelPolygons.map(({ lvl, points }) => (
          <polygon
            key={lvl}
            points={points}
            fill={lvl % 2 === 0 ? 'rgba(241, 245, 249, 0.45)' : 'rgba(255, 255, 255, 0.65)'}
            stroke="#CBD5E1"
            strokeWidth="1"
            strokeDasharray={lvl < 4 ? '3 3' : 'none'}
          />
        ))}

        {/* Axis Rays */}
        {data.map((_, i) => {
          const { x, y } = getCoordinates(i, maxLevel);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#94A3B8"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
          );
        })}

        {/* Level numeric badges along top axis */}
        {levels.map((lvl) => {
          const { x, y } = getCoordinates(0, lvl);
          return (
            <text
              key={lvl}
              x={x + 6}
              y={y + 3}
              fontSize="10"
              fill="#64748B"
              fontWeight="600"
              className="font-mono"
            >
              L{lvl}
            </text>
          );
        })}

        {/* Target Profile Polygon */}
        <polygon
          points={targetPoints}
          fill="url(#targetGlow)"
          stroke={targetColor}
          strokeWidth="2.5"
          strokeDasharray="4 4"
        />

        {/* Secondary Polygon (e.g. Self Assessment in Perception Gap mode) */}
        {showSecondary && (
          <polygon
            points={secondaryPoints}
            fill="url(#secondaryGlow)"
            stroke={secondaryColor}
            strokeWidth="2"
            strokeDasharray="2 2"
          />
        )}

        {/* Current Assessed Polygon */}
        <polygon
          points={currentPoints}
          fill="url(#radarGlow)"
          stroke={currentColor}
          strokeWidth="2.5"
        />

        {/* Secondary Nodes */}
        {showSecondary &&
          data.map((d, i) => {
            const { x, y } = getCoordinates(i, d.secondary ?? d.current);
            return (
              <circle
                key={`sec-${i}`}
                cx={x}
                cy={y}
                r="4"
                fill={secondaryColor}
                stroke="#FFFFFF"
                strokeWidth="1.5"
                className="transition-all duration-300"
              >
                <title>{`${d.label}: ${secondaryLabel} L${d.secondary}`}</title>
              </circle>
            );
          })}

        {/* Nodes for Current Points */}
        {data.map((d, i) => {
          const { x, y } = getCoordinates(i, d.current);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4.5"
              fill={currentColor}
              stroke="#FFFFFF"
              strokeWidth="2"
              className="transition-all duration-300 hover:r-6 cursor-pointer"
            >
              <title>{`${d.label}: Đạt L${d.current} / Mục tiêu L${d.target}`}</title>
            </circle>
          );
        })}

        {/* Axis Labels */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelDist = radius + 24;
          const lx = center + labelDist * Math.cos(angle);
          const ly = center + labelDist * Math.sin(angle);
          const isRight = Math.cos(angle) > 0.1;
          const isLeft = Math.cos(angle) < -0.1;
          const anchor = isRight ? 'start' : isLeft ? 'end' : 'middle';

          return (
            <g key={i}>
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                fontSize="11"
                fontWeight="700"
                fill="#0F172A"
                className="select-none"
              >
                {d.code}
              </text>
              <text
                x={lx}
                y={ly + 12}
                textAnchor={anchor}
                fontSize="9"
                fill="#64748B"
                className="select-none font-medium"
              >
                {d.label.length > 22 ? d.label.substring(0, 20) + '...' : d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 border-t-2 border-dashed inline-block" style={{ borderColor: targetColor }}></span>
          <span className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: targetColor, backgroundColor: `${targetColor}33` }}></span>
          <span className="text-slate-700">{targetLabel}</span>
        </div>
        {showSecondary && (
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 border-t-2 border-dotted inline-block" style={{ borderColor: secondaryColor }}></span>
            <span className="w-2.5 h-2.5 rounded-full border border-white ring-1" style={{ backgroundColor: secondaryColor }}></span>
            <span className="text-slate-700">{secondaryLabel}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 inline-block rounded-full" style={{ backgroundColor: currentColor }}></span>
          <span className="w-2.5 h-2.5 rounded-full border border-white ring-1 ring-blue-500" style={{ backgroundColor: currentColor }}></span>
          <span className="text-slate-800">{currentLabel}</span>
        </div>
      </div>
    </div>
  );
};
