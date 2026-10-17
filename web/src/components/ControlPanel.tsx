import React from 'react';
import {
  PlayCircle,
  StopCircle,
  Cpu,
  ShieldCheck,
  Clock,
  Info,
  SlidersHorizontal,
  Bot,
  Hand
} from 'lucide-react';
import { TelemetryData, SystemMode } from '../types';

interface ControlPanelProps {
  telemetry: TelemetryData;
  onSetMode: (mode: SystemMode) => void;
  onTogglePump: (turnOn: boolean) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  telemetry,
  onSetMode,
  onTogglePump
}) => {
  // Check whether manual pump button is allowed:
  // Cannot turn on if mode is AUTO, or if soil >= 60%, or if raining, or if tank empty
  const canTurnOn =
    telemetry.mode === 'MANUAL' &&
    !telemetry.pumpOn &&
    !telemetry.isRaining &&
    telemetry.soilMoisture < 60 &&
    telemetry.tankOk &&
    !telemetry.isStopped;

  const getDisabledReason = () => {
    if (telemetry.isStopped) return 'Hệ thống đang khóa khẩn cấp (STOP LATCH)';
    if (telemetry.mode === 'AUTO') return 'Đang ở chế độ AUTO (Chuyển sang MANUAL để bật tay)';
    if (telemetry.isRaining) return 'Từ chối: Cảm biến phát hiện trời mưa';
    if (telemetry.soilMoisture >= 60) return 'Từ chối: Đất đã đủ ẩm (>=60%)';
    if (!telemetry.tankOk) return 'Từ chối: Bồn cạn nước';
    return '';
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    }}>
      {/* 1. Bộ Điều Khiển Relay Bơm & Chế Độ */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {/* Header & Mode Switch */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: '#eef5f0' }}>
                Bảng Điều Khiển Relay Bơm
              </h2>
              <p style={{ fontSize: '12px', color: '#8fa89b' }}>
                Gửi lệnh Direct Method / MQTT xuống ESP32
              </p>
            </div>

            {/* Mode Switch Pills */}
            <div style={{
              display: 'flex',
              backgroundColor: '#081610',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid rgba(82, 183, 136, 0.2)'
            }}>
              <button
                onClick={() => onSetMode('AUTO')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: telemetry.mode === 'AUTO' ? '#1b4332' : 'transparent',
                  color: telemetry.mode === 'AUTO' ? '#74c69d' : '#5e7a6a',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Bot size={15} />
                <span>AUTO</span>
              </button>
              <button
                onClick={() => onSetMode('MANUAL')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: telemetry.mode === 'MANUAL' ? '#1b4332' : 'transparent',
                  color: telemetry.mode === 'MANUAL' ? '#74c69d' : '#5e7a6a',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Hand size={15} />
                <span>MANUAL</span>
              </button>
            </div>
          </div>

          {/* Mode explanation notification */}
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#091c14',
            borderRadius: '10px',
            borderLeft: '4px solid #52b788',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <Info size={18} color="#74c69d" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#eef5f0' }}>
                {telemetry.mode === 'AUTO' ? 'Đang kích hoạt chế độ [AUTO]' : 'Đang ở chế độ [MANUAL]'}
              </div>
              <p style={{ fontSize: '12px', color: '#8fa89b', marginTop: '2px', lineHeight: 1.4 }}>
                {telemetry.mode === 'AUTO'
                  ? 'Bơm tự động bật khi đất < 35% và tự ngắt khi đất >= 60% hoặc trời mưa. Nút điều khiển tay tạm khóa để tránh xung đột.'
                  : 'Cho phép người dùng bấm nút bật/tắt bơm chủ động. Vẫn áp dụng bảo vệ chống cháy bơm và tự ngắt nếu phát hiện mưa.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <button
              onClick={() => onTogglePump(true)}
              disabled={!canTurnOn}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: canTurnOn ? '#52b788' : 'rgba(82, 183, 136, 0.15)',
                color: canTurnOn ? '#012d1d' : '#5e7a6a',
                fontSize: '13px',
                fontWeight: 800,
                cursor: canTurnOn ? 'pointer' : 'not-allowed',
                boxShadow: canTurnOn ? '0 4px 16px rgba(82, 183, 136, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <PlayCircle size={18} />
              <span>BẬT BƠM TAY</span>
            </button>

            <button
              onClick={() => onTogglePump(false)}
              disabled={!telemetry.pumpOn}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: telemetry.pumpOn ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
                color: telemetry.pumpOn ? '#fff' : '#5e7a6a',
                fontSize: '13px',
                fontWeight: 800,
                cursor: telemetry.pumpOn ? 'pointer' : 'not-allowed',
                boxShadow: telemetry.pumpOn ? '0 4px 16px rgba(239, 68, 68, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <StopCircle size={18} />
              <span>TẮT BƠM</span>
            </button>
          </div>

          {!canTurnOn && !telemetry.pumpOn && (
            <div style={{ fontSize: '11px', color: '#fbbf24', textAlign: 'center', marginTop: '8px' }}>
              ℹ {getDisabledReason()}
            </div>
          )}
        </div>

        {/* Safety Note */}
        <div style={{
          marginTop: '18px',
          padding: '10px 14px',
          backgroundColor: '#091811',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#6e8d7d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#52b788" />
            <span>Tự ngắt khi đất &ge; 60%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="#f59e0b" />
            <span>Timeout an toàn: 20s (Wokwi)</span>
          </div>
        </div>
      </div>

      {/* 2. Bảng Quy Tắc & Ngưỡng Kích Hoạt */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: '#eef5f0' }}>
                Bảng Ngưỡng Cấu Hình
              </h2>
              <p style={{ fontSize: '12px', color: '#8fa89b' }}>
                Tham số nạp trong bộ nhớ Flash ESP32
              </p>
            </div>
            <SlidersHorizontal size={20} color="#74c69d" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#091811', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', color: '#8fa89b' }}>Độ ẩm đất kích hoạt AUTO</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>&lt; 35%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#091811', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', color: '#8fa89b' }}>Độ ẩm đất dừng tưới</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>&ge; 60%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#091811', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', color: '#8fa89b' }}>Ngưỡng phát hiện mưa</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: '#fbbf24' }}>&ge; 50%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#091811', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', color: '#8fa89b' }}>Thời gian bơm tối đa mỗi lần</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: '#eef5f0' }}>20 giây (SIM) / 60s (Thật)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#091811', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', color: '#8fa89b' }}>Thời gian ngấm nước giữa 2 lần</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: '#eef5f0' }}>10 giây (SIM) / 120s (Thật)</span>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '16px',
          padding: '10px 14px',
          backgroundColor: '#091c14',
          borderRadius: '8px',
          border: '1px solid rgba(82, 183, 136, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px'
        }}>
          <span style={{ color: '#8fa89b' }}>Lệnh Serial map 1:1 sang MQTT:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#74c69d', fontWeight: 700 }}>a: AUTO | m: MAN | p: BƠM</span>
        </div>
      </div>
    </div>
  );
};
