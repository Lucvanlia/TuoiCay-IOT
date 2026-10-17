import React from 'react';
import { Sliders, CloudRain, Sprout, Thermometer, ShieldAlert } from 'lucide-react';
import { TelemetryData } from '../types';

interface SimulatorBarProps {
  telemetry: TelemetryData;
  onChangeTelemetry: (partial: Partial<TelemetryData>) => void;
}

export const SimulatorBar: React.FC<SimulatorBarProps> = ({
  telemetry,
  onChangeTelemetry
}) => {
  return (
    <div style={{
      backgroundColor: '#0c2219',
      borderBottom: '1px solid rgba(82, 183, 136, 0.2)',
      padding: '12px 28px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sliders size={18} color="#74c69d" />
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#eef5f0' }}>
          Mô Phỏng Cảm Biến Trực Quan (Wokwi Live Mock)
        </span>
        <span style={{
          fontSize: '11px',
          color: '#5e7a6a',
          backgroundColor: '#081610',
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          Kéo thanh trượt để thử nghiệm kịch bản
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '24px' }}>
        {/* Soil Moisture Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sprout size={16} color="#52b788" />
          <span style={{ fontSize: '12px', color: '#8fa89b' }}>Độ ẩm đất:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={telemetry.soilMoisture}
            onChange={(e) => onChangeTelemetry({ soilMoisture: parseInt(e.target.value) })}
            style={{ width: '100px', accentColor: '#52b788', cursor: 'pointer' }}
          />
          <span style={{
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: telemetry.soilMoisture < 35 ? '#ef4444' : (telemetry.soilMoisture >= 60 ? '#38bdf8' : '#52b788'),
            width: '38px'
          }}>
            {telemetry.soilMoisture}%
          </span>
        </div>

        {/* Rain Sensor Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CloudRain size={16} color="#38bdf8" />
          <span style={{ fontSize: '12px', color: '#8fa89b' }}>Cảm biến mưa:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={telemetry.rainPercentage}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              onChangeTelemetry({
                rainPercentage: val,
                isRaining: val >= 50
              });
            }}
            style={{ width: '100px', accentColor: '#38bdf8', cursor: 'pointer' }}
          />
          <span style={{
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: telemetry.isRaining ? '#38bdf8' : '#8fa89b',
            width: '38px'
          }}>
            {telemetry.rainPercentage}%
          </span>
        </div>

        {/* Ambient Temperature Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Thermometer size={16} color="#fbbf24" />
          <span style={{ fontSize: '12px', color: '#8fa89b' }}>Nhiệt độ:</span>
          <input
            type="range"
            min="15"
            max="45"
            value={Math.round(telemetry.temperature)}
            onChange={(e) => onChangeTelemetry({ temperature: parseFloat(e.target.value) })}
            style={{ width: '80px', accentColor: '#fbbf24', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fbbf24', width: '36px' }}>
            {telemetry.temperature}°C
          </span>
        </div>

        {/* Tank Status Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onChangeTelemetry({ tankOk: !telemetry.tankOk })}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: telemetry.tankOk ? 'rgba(82, 183, 136, 0.4)' : '#ef4444',
              backgroundColor: telemetry.tankOk ? 'rgba(82, 183, 136, 0.15)' : 'rgba(239, 68, 68, 0.2)',
              color: telemetry.tankOk ? '#74c69d' : '#fca5a5',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {telemetry.tankOk ? '✓ Bồn Đầy Nước' : '⚠ Bồn Cạn Nước'}
          </button>
        </div>
      </div>
    </div>
  );
};
