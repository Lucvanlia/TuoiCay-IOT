import React from 'react';
import {
  Sprout,
  Thermometer,
  Wind,
  CloudRain,
  Sun,
  Activity,
  Droplet
} from 'lucide-react';
import { TelemetryData } from '../types';

interface KpiCardsProps {
  telemetry: TelemetryData;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ telemetry }) => {
  // Gauge calculation for Soil Moisture: radius 34, circumference = 2 * PI * 34 ≈ 213.6
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const soilOffset = circumference - (telemetry.soilMoisture / 100) * circumference;

  const getSoilStatus = (val: number) => {
    if (val < 35) return { text: 'Đất Khô (<35%)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
    if (val >= 60) return { text: 'Đủ Ẩm (>=60%)', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
    return { text: 'Tối Ưu (35-59%)', color: '#52b788', bg: 'rgba(82, 183, 136, 0.15)' };
  };

  const soilStatus = getSoilStatus(telemetry.soilMoisture);

  // Format runtime mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
      gap: '18px',
      marginBottom: '24px'
    }}>
      {/* 1. Độ Ẩm Đất (GPIO34) */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#8fa89b' }}>Độ ẩm đất (GPIO34)</span>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: soilStatus.bg,
            color: soilStatus.color
          }}>
            {soilStatus.text}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '38px', fontWeight: 800, color: soilStatus.color }}>
                {telemetry.soilMoisture}
              </span>
              <span style={{ fontSize: '18px', color: '#8fa89b', fontWeight: 600 }}>%</span>
            </div>
            <span style={{ fontSize: '12px', color: '#6e8d7d' }}>
              {telemetry.pumpOn ? 'Đang cấp nước bù' : 'Chờ chu kỳ tiếp theo'}
            </span>
          </div>

          {/* SVG Circular Gauge */}
          <div style={{ position: 'relative', width: '78px', height: '78px' }}>
            <svg width="78" height="78" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="39"
                cy="39"
                r={radius}
                fill="transparent"
                stroke="#122a20"
                strokeWidth="7"
              />
              <circle
                cx="39"
                cy="39"
                r={radius}
                fill="transparent"
                stroke={soilStatus.color}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={soilOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: soilStatus.color
            }}>
              <Sprout size={20} />
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(82, 183, 136, 0.1)', paddingTop: '10px', fontSize: '11px', color: '#6e8d7d', display: 'flex', justifyContent: 'space-between' }}>
          <span>Ngưỡng bật: &lt;35%</span>
          <span>Ngưỡng dừng: &ge;60%</span>
        </div>
      </div>

      {/* 2. Nhiệt độ (DHT22 GPIO19) */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#8fa89b' }}>Nhiệt độ (DHT22)</span>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(251, 191, 36, 0.15)',
            color: '#fbbf24'
          }}>
            Chuẩn vườn
          </span>
        </div>

        <div style={{ margin: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '38px', fontWeight: 800, color: '#eef5f0' }}>
              {telemetry.temperature.toFixed(1)}
            </span>
            <span style={{ fontSize: '18px', color: '#8fa89b', fontWeight: 600 }}>°C</span>
          </div>
          <span style={{ fontSize: '12px', color: '#52b788' }}>
            Khoảng thích hợp: 22°C - 32°C
          </span>
        </div>

        <div style={{ borderTop: '1px solid rgba(82, 183, 136, 0.1)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6e8d7d', marginBottom: '6px' }}>
            <span>Min: 21.5°C</span>
            <span>Max: 34.0°C</span>
          </div>
          <div style={{ height: '5px', backgroundColor: '#122a20', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, ((telemetry.temperature - 15) / 30) * 100))}%`,
              backgroundColor: '#fbbf24',
              borderRadius: '9999px'
            }} />
          </div>
        </div>
      </div>

      {/* 3. Độ ẩm không khí (DHT22 GPIO19) */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#8fa89b' }}>Độ ẩm không khí</span>
          <Wind size={18} color="#74c69d" />
        </div>

        <div style={{ margin: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '38px', fontWeight: 800, color: '#eef5f0' }}>
              {telemetry.humidity.toFixed(0)}
            </span>
            <span style={{ fontSize: '18px', color: '#8fa89b', fontWeight: 600 }}>% RH</span>
          </div>
          <span style={{ fontSize: '12px', color: '#74c69d' }}>
            Điều kiện quang hợp tối ưu
          </span>
        </div>

        <div style={{ borderTop: '1px solid rgba(82, 183, 136, 0.1)', paddingTop: '10px', fontSize: '11px', color: '#6e8d7d', display: 'flex', justifyContent: 'space-between' }}>
          <span>VPD Ước tính: <b style={{ color: '#eef5f0' }}>1.08 kPa</b></span>
          <span>Bốc hơi: Bình thường</span>
        </div>
      </div>

      {/* 4. Cảm biến Mưa (GPIO35 & LED27) */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#8fa89b' }}>Cảm biến mưa (GPIO35)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: telemetry.isRaining ? '#ef4444' : '#5e7a6a',
              boxShadow: telemetry.isRaining ? '0 0 8px #ef4444' : 'none'
            }} />
            <span style={{ fontSize: '11px', color: telemetry.isRaining ? '#f87171' : '#6e8d7d', fontFamily: 'var(--font-mono)' }}>
              LED27: {telemetry.isRaining ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        <div style={{ margin: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {telemetry.isRaining ? (
              <CloudRain size={32} color="#38bdf8" />
            ) : (
              <Sun size={32} color="#fbbf24" />
            )}
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: telemetry.isRaining ? '#38bdf8' : '#eef5f0' }}>
                {telemetry.isRaining ? 'Trời Đang Mưa' : 'Trời Khô Ráo'}
              </div>
              <span style={{ fontSize: '12px', color: '#8fa89b' }}>
                Mức ướt tấm cảm ứng: <b style={{ color: '#eef5f0' }}>{telemetry.rainPercentage}%</b>
              </span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(82, 183, 136, 0.1)', paddingTop: '10px', fontSize: '11px', color: '#6e8d7d', display: 'flex', justifyContent: 'space-between' }}>
          <span>Ngưỡng mưa: &ge;50%</span>
          <span style={{ color: telemetry.isRaining ? '#f87171' : '#74c69d', fontWeight: 600 }}>
            {telemetry.isRaining ? 'Khóa bơm tưới' : 'Cho phép tưới'}
          </span>
        </div>
      </div>

      {/* 5. Relay Bơm (GPIO26) */}
      <div style={{
        backgroundColor: telemetry.pumpOn ? '#103827' : '#0d1e17',
        border: telemetry.pumpOn ? '1px solid #52b788' : '1px solid rgba(82, 183, 136, 0.15)',
        borderRadius: '14px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: telemetry.pumpOn ? '0 0 24px rgba(82, 183, 136, 0.25)' : 'none',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: telemetry.pumpOn ? '#a7f3d0' : '#8fa89b' }}>
            Máy Bơm (GPIO26)
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: telemetry.pumpOn ? '#52b788' : '#1b2d24',
            color: telemetry.pumpOn ? '#012d1d' : '#6e8d7d',
            fontFamily: 'var(--font-mono)'
          }}>
            {telemetry.pumpOn ? 'RUNNING' : 'STOPPED'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '14px 0' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: telemetry.pumpOn ? '#1b543b' : '#122a20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: telemetry.pumpOn ? '#74c69d' : '#4e6d5e'
          }}>
            <Droplet size={24} className={telemetry.pumpOn ? 'animate-bounce' : ''} />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '28px',
              fontWeight: 800,
              color: telemetry.pumpOn ? '#74c69d' : '#8fa89b'
            }}>
              {telemetry.pumpOn ? formatTime(telemetry.pumpRuntimeSeconds) : '00:00'}
            </div>
            <span style={{ fontSize: '12px', color: telemetry.pumpOn ? '#a7f3d0' : '#6e8d7d' }}>
              {telemetry.pumpOn ? 'Bơm đang hoạt động' : 'Bơm đang ngắt'}
            </span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(82, 183, 136, 0.1)', paddingTop: '10px', fontSize: '11px', color: '#6e8d7d', display: 'flex', justifyContent: 'space-between' }}>
          <span>Lưu lượng: <b style={{ color: '#eef5f0' }}>{telemetry.pumpOn ? '1.8 L/phút' : '0 L/phút'}</b></span>
          <span>Áp suất: <b style={{ color: '#eef5f0' }}>{telemetry.pumpOn ? '1.4 bar' : '0 bar'}</b></span>
        </div>
      </div>
    </div>
  );
};
