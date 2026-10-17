import React from 'react';
import { LineChart as LineChartIcon, Activity } from 'lucide-react';
import { ChartPoint } from '../types';

interface TelemetryChartProps {
  history: ChartPoint[];
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ history }) => {
  const width = 800;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scale functions
  const getYSoil = (val: number) => padding.top + chartHeight - (val / 100) * chartHeight;
  const getYTemp = (val: number) => padding.top + chartHeight - ((val - 15) / 30) * chartHeight;
  const getX = (index: number, total: number) => padding.left + (index / Math.max(1, total - 1)) * chartWidth;

  // Build SVG path
  const soilPath = history.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, history.length)} ${getYSoil(pt.soil)}`).join(' ');
  const tempPath = history.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, history.length)} ${getYTemp(pt.temp)}`).join(' ');

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#122a20', color: '#52b788' }}>
            <LineChartIcon size={20} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: '#eef5f0' }}>
              Biểu Đồ Diễn Biến Thời Gian Thực
            </h2>
            <p style={{ fontSize: '12px', color: '#8fa89b' }}>
              Theo dõi độ ẩm đất (%) và nhiệt độ môi trường (°C)
            </p>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#52b788', borderRadius: '2px' }} />
            <span style={{ color: '#eef5f0' }}>Độ ẩm đất (%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#fbbf24', borderRadius: '2px' }} />
            <span style={{ color: '#eef5f0' }}>Nhiệt độ (°C)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '1px', borderTop: '1px dashed #ef4444' }} />
            <span style={{ color: '#f87171' }}>Ngưỡng tưới (35%)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = getYSoil(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(82, 183, 136, 0.08)"
                  strokeDasharray={tick === 0 ? 'none' : '3 3'}
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#5e7a6a"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="var(--font-mono)"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Threshold Line at 35% */}
          <line
            x1={padding.left}
            y1={getYSoil(35)}
            x2={width - padding.right}
            y2={getYSoil(35)}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth="1.5"
            opacity="0.8"
          />

          {/* Threshold Line at 60% */}
          <line
            x1={padding.left}
            y1={getYSoil(60)}
            x2={width - padding.right}
            y2={getYSoil(60)}
            stroke="#38bdf8"
            strokeDasharray="4 4"
            strokeWidth="1.5"
            opacity="0.5"
          />

          {/* Shaded pump active regions */}
          {history.map((pt, i) => {
            if (!pt.pump || i === 0) return null;
            const x1 = getX(i - 1, history.length);
            const x2 = getX(i, history.length);
            return (
              <rect
                key={i}
                x={x1}
                y={padding.top}
                width={x2 - x1}
                height={chartHeight}
                fill="rgba(82, 183, 136, 0.12)"
              />
            );
          })}

          {/* Temperature Path */}
          {history.length > 1 && (
            <path
              d={tempPath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          )}

          {/* Soil Moisture Path */}
          {history.length > 1 && (
            <path
              d={soilPath}
              fill="none"
              stroke="#52b788"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {history.map((pt, i) => (
            <circle
              key={i}
              cx={getX(i, history.length)}
              cy={getYSoil(pt.soil)}
              r={i === history.length - 1 ? 5 : 3}
              fill={pt.soil < 35 ? '#ef4444' : '#52b788'}
              stroke="#07120e"
              strokeWidth="2"
            />
          ))}

          {/* Bottom Time Axis Labels */}
          {history.filter((_, i) => i % Math.max(1, Math.floor(history.length / 5)) === 0).map((pt, idx, arr) => {
            const originalIndex = history.indexOf(pt);
            return (
              <text
                key={idx}
                x={getX(originalIndex, history.length)}
                y={height - 8}
                fill="#5e7a6a"
                fontSize="10"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {pt.time}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
