import React from 'react';
import {
  Wifi,
  RefreshCw,
  Bell,
  OctagonAlert,
  Play
} from 'lucide-react';
import { TelemetryData } from '../types';

interface HeaderProps {
  telemetry: TelemetryData;
  onEmergencyStop: () => void;
  onResume: () => void;
  simMode: boolean;
  setSimMode: (val: boolean) => void;
  bridgeConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  onEmergencyStop,
  onResume,
  simMode,
  setSimMode,
  bridgeConnected
}) => {
  return (
    <header style={{
      height: '68px',
      backgroundColor: 'rgba(10, 26, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(82, 183, 136, 0.12)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 30
    }}>
      {/* Station Name & Path */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '18px',
              fontWeight: 700,
              color: '#eef5f0',
              margin: 0
            }}>
              Trạm Tưới A1 - Vườn Thực Nghiệm
            </h1>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: telemetry.mode === 'AUTO' ? 'rgba(82, 183, 136, 0.18)' : 'rgba(245, 158, 11, 0.18)',
              color: telemetry.mode === 'AUTO' ? '#74c69d' : '#fbbf24',
              fontFamily: 'var(--font-mono)'
            }}>
              {telemetry.mode}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#6e8d7d', marginTop: '2px' }}>
            Đề tài 04: Hệ thống tưới cây tự động qua Internet • Nhóm 2
          </p>
        </div>
      </div>

      {/* Quick Actions & Live Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Connection status badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '9999px',
          backgroundColor: bridgeConnected
            ? 'rgba(82, 183, 136, 0.18)'
            : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${bridgeConnected ? '#52b788' : '#ef4444'}`,
          color: bridgeConnected ? '#52b788' : '#f87171',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: bridgeConnected ? '#52b788' : '#ef4444',
            boxShadow: `0 0 10px ${bridgeConnected ? '#52b788' : '#ef4444'}`
          }} />
          <span>
            {bridgeConnected
              ? 'ESP32: ONLINE (LIVE)'
              : 'ESP32: OFFLINE (CHƯA KẾT NỐI)'}
          </span>
        </div>

        {/* Emergency Stop Button */}
        {telemetry.isStopped ? (
          <button
            onClick={onResume}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#52b788',
              color: '#012d1d',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(82, 183, 136, 0.4)'
            }}
          >
            <Play size={16} />
            <span>RESUME (GỠ KHÓA)</span>
          </button>
        ) : (
          <button
            onClick={onEmergencyStop}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.35)',
              transition: 'transform 0.1s ease'
            }}
          >
            <OctagonAlert size={16} />
            <span>KHẨN CẤP (STOP)</span>
          </button>
        )}
      </div>
    </header>
  );
};
