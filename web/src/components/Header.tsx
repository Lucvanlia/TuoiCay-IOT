import React from 'react';
import {
  Wifi,
  RefreshCw,
  Bell,
  OctagonAlert,
  Play,
  LogIn,
  LogOut,
  User as UserIcon,
  Cloud
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { TelemetryData } from '../types';

interface HeaderProps {
  telemetry: TelemetryData;
  onEmergencyStop: () => void;
  onResume: () => void;
  simMode: boolean;
  setSimMode: (val: boolean) => void;
  bridgeConnected: boolean;
  cloudConnected?: boolean;
  user?: User | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  onEmergencyStop,
  onResume,
  bridgeConnected,
  cloudConnected = false,
  user,
  onLogin,
  onLogout
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
        {/* Connection status badge (Cloud or Bridge) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '9999px',
          backgroundColor: (cloudConnected || bridgeConnected)
            ? 'rgba(82, 183, 136, 0.18)'
            : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${(cloudConnected || bridgeConnected) ? '#52b788' : '#ef4444'}`,
          color: (cloudConnected || bridgeConnected) ? '#52b788' : '#f87171',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: (cloudConnected || bridgeConnected) ? '#52b788' : '#ef4444',
            boxShadow: `0 0 10px ${(cloudConnected || bridgeConnected) ? '#52b788' : '#ef4444'}`
          }} />
          <span>
            {cloudConnected
              ? 'CLOUD: ONLINE (FIREBASE)'
              : bridgeConnected
                ? 'BRIDGE: ONLINE (USB)'
                : 'ESP32: OFFLINE'}
          </span>
        </div>

        {/* User Account / Google Auth */}
        {user ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#071610',
            padding: '4px 8px 4px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(82, 183, 136, 0.2)'
          }}>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                style={{ width: '22px', height: '22px', borderRadius: '50%' }}
              />
            ) : (
              <UserIcon size={16} color="#74c69d" />
            )}
            <span style={{ fontSize: '12px', color: '#eef5f0', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
            </span>
            <button
              onClick={onLogout}
              title="Đăng xuất"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '6px',
                border: 'none',
                background: 'none',
                color: '#8fa89b',
                cursor: 'pointer'
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#091c14',
              border: '1px solid rgba(82, 183, 136, 0.3)',
              color: '#74c69d',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <LogIn size={14} />
            <span>Đăng nhập</span>
          </button>
        )}

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
