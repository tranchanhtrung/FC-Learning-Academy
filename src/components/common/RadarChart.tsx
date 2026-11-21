import React, { useId } from 'react';

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

/** Splits a domain label cleanly into at most 2 readable SVG lines without cutting mid-word. */
function wrapSvgLabel(text: string, maxCharsPerLine = 22): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length <= 1 || text.length <= maxCharsPerLine) return [text];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else if (lines.length === 0) {
      if (current) lines.push(current);
      current = word;
    } else {
      // Append remaining to second line and trim cleanly if still too long
      current = candidate;
    }
  }
  if (current) lines.push(current);

  if (lines.length === 2 && lines[1].length > maxCharsPerLine + 4) {
    lines[1] = `${lines[1].slice(0, maxCharsPerLine + 1).trimEnd()}…`;
  }
  return lines.slice(0, 2);
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  size = 320,
  targetLabel = 'Target Profile',
  currentLabel = 'Current Assessed',
  secondaryLabel = 'Self-Assessed',
  showSecondary = false,
  currentColor = '#2563EB',
  targetColor = '#D4AF37',
  secondaryColor = '#10B981',
}) => {
  const uid = useId().replace(/:/g, '');
  const radarGlowId = `radarGlow-${uid}`;
  const targetGlowId = `targetGlow-${uid}`;
  const secondaryGlowId = `secondaryGlow-${uid}`;

  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No competency domain data available.
      </div>
    );
  }

  // Padded viewBox guarantees axis labels never overflow or get clipped at any viewport width
  const padX = 112;
  const padY = 44;
  const viewWidth = size + padX * 2;
  const viewHeight = size + padY * 2;
  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;
  const radius = size / 2 - 36;
  const numAxes = data.length;
  const angleStep = (Math.PI * 2) / numAxes;
  const maxLevel = 4;

  // Calculate coordinates for a given axis index and value (0.5–4)
  const getCoordinates = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (Math.max(0.5, Math.min(maxLevel, value)) / maxLevel) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  };

  const levels = [1, 2, 3, 4];
  const levelPolygons = levels.map((lvl) => ({
    lvl,
    points: data
      .map((_, i) => {
        const { x, y } = getCoordinates(i, lvl);
        return `${x},${y}`;
      })
      .join(' '),
  }));

  const targetPoints = data
    .map((d, i) => {
      const { x, y } = getCoordinates(i, d.target);
      return `${x},${y}`;
    })
    .join(' ');

  const currentPoints = data
    .map((d, i) => {
      const { x, y } = getCoordinates(i, d.current);
      return `${x},${y}`;
    })
    .join(' ');

  const secondaryPoints = showSecondary
    ? data
        .map((d, i) => {
          const { x, y } = getCoordinates(i, d.secondary ?? d.current);
          return `${x},${y}`;
        })
        .join(' ')
    : '';

  return (
    <div className="flex flex-col items-center w-full min-w-0">
      <svg
        className="w-full max-w-[460px] h-auto select-none drop-shadow-sm"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        role="img"
        aria-label="Competency radar chart"
      >
        <defs>
          <radialGradient id={radarGlowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={currentColor} stopOpacity="0.30" />
            <stop offset="100%" stopColor={currentColor} stopOpacity="0.04" />
          </radialGradient>
          <radialGradient id={targetGlowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={targetColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={targetColor} stopOpacity="0.02" />
          </radialGradient>
          <radialGradient id={secondaryGlowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.02" />
          </radialGradient>
        </defs>

        {/* Level Polygons */}
        {levelPolygons.map(({ lvl, points }) => (
          <polygon
            key={lvl}
            points={points}
            fill={lvl % 2 === 0 ? 'rgba(241, 245, 249, 0.5)' : 'rgba(255, 255, 255, 0.7)'}
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
              x1={centerX}
              y1={centerY}
              x2={x}
              y2={y}
              stroke="#94A3B8"
              strokeWidth="1"
              strokeOpacity="0.55"
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
          fill={`url(#${targetGlowId})`}
          stroke={targetColor}
          strokeWidth="2.5"
          strokeDasharray="4 4"
        />

        {/* Secondary Polygon */}
        {showSecondary && (
          <polygon
            points={secondaryPoints}
            fill={`url(#${secondaryGlowId})`}
            stroke={secondaryColor}
            strokeWidth="2"
            strokeDasharray="2 2"
          />
        )}

        {/* Current Assessed Polygon */}
        <polygon
          points={currentPoints}
          fill={`url(#${radarGlowId})`}
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
              className="cursor-pointer"
            >
              <title>{`${d.label}: ${currentLabel} L${d.current} / ${targetLabel} L${d.target}`}</title>
            </circle>
          );
        })}

        {/* Axis Labels with 2-line clean wrapping */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const labelDist = radius + 18;
          const lx = centerX + labelDist * cosA;
          const ly = centerY + labelDist * sinA;
          const isRight = cosA > 0.15;
          const isLeft = cosA < -0.15;
          const isTop = sinA < -0.7;
          const anchor = isRight ? 'start' : isLeft ? 'end' : 'middle';
          const baseY = isTop ? ly - 16 : ly;
          const lines = wrapSvgLabel(d.label, 20);

          return (
            <g key={i}>
              <title>{`${d.code} — ${d.label} (L${d.current} / L${d.target})`}</title>
              <text
                x={lx}
                y={baseY}
                textAnchor={anchor}
                fontSize="11.5"
                fontWeight="700"
                fill="#0F172A"
              >
                {d.code}
              </text>
              <text
                x={lx}
                y={baseY + 13}
                textAnchor={anchor}
                fontSize="10"
                fill="#475569"
                fontWeight="500"
              >
                {lines.map((line, lineIdx) => (
                  <tspan key={lineIdx} x={lx} dy={lineIdx === 0 ? 0 : 12}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-2 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 border-t-2 border-dashed inline-block" style={{ borderColor: targetColor }} />
          <span
            className="w-2.5 h-2.5 rounded-full border"
            style={{ borderColor: targetColor, backgroundColor: `${targetColor}33` }}
          />
          <span className="text-slate-700">{targetLabel}</span>
        </div>
        {showSecondary && (
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 border-t-2 border-dotted inline-block" style={{ borderColor: secondaryColor }} />
            <span className="w-2.5 h-2.5 rounded-full border border-white ring-1" style={{ backgroundColor: secondaryColor }} />
            <span className="text-slate-700">{secondaryLabel}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 inline-block rounded-full" style={{ backgroundColor: currentColor }} />
          <span className="w-2.5 h-2.5 rounded-full border border-white ring-1 ring-blue-500" style={{ backgroundColor: currentColor }} />
          <span className="text-slate-800">{currentLabel}</span>
        </div>
      </div>
    </div>
  );
};
