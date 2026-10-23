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
  Cloud,
  Menu,
  Lock
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { TelemetryData, UserRole, AppUser } from '../types';

interface HeaderProps {
  telemetry: TelemetryData;
  onEmergencyStop: () => void;
  onResume: () => void;
  simMode: boolean;
  setSimMode: (val: boolean) => void;
  bridgeConnected: boolean;
  cloudConnected?: boolean;
  user?: AppUser | User | null;
  userRole?: UserRole;
  onToggleMobileMenu?: () => void;
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
  userRole = 'VIEWER',
  onToggleMobileMenu,
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
      {/* Station Name & Path with Mobile Hamburger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={onToggleMobileMenu}
          className="mobile-hamburger-btn"
          title="Mở menu điều hướng"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid rgba(82, 183, 136, 0.25)',
            backgroundColor: '#0d221a',
            color: '#74c69d',
            cursor: 'pointer'
          }}
        >
          <Menu size={20} />
        </button>

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

        {/* User Account / Google Auth & Role Badge */}
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
            <span style={{ fontSize: '12px', color: '#eef5f0', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: userRole === 'ADMIN' ? 'rgba(239, 68, 68, 0.2)' : userRole === 'OPERATOR' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
              color: userRole === 'ADMIN' ? '#f87171' : userRole === 'OPERATOR' ? '#fbbf24' : '#38bdf8',
              fontFamily: 'var(--font-mono)'
            }}>
              {userRole}
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
            onClick={userRole === 'VIEWER' ? undefined : onResume}
            disabled={userRole === 'VIEWER'}
            title={userRole === 'VIEWER' ? 'Yêu cầu quyền Operator hoặc Admin để gỡ khóa' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: userRole === 'VIEWER' ? 'rgba(255,255,255,0.08)' : '#52b788',
              color: userRole === 'VIEWER' ? '#6b8a7b' : '#012d1d',
              fontSize: '13px',
              fontWeight: 700,
              cursor: userRole === 'VIEWER' ? 'not-allowed' : 'pointer',
              boxShadow: userRole === 'VIEWER' ? 'none' : '0 0 15px rgba(82, 183, 136, 0.4)'
            }}
          >
            {userRole === 'VIEWER' ? <Lock size={15} /> : <Play size={16} />}
            <span>RESUME (GỠ KHÓA)</span>
          </button>
        ) : (
          <button
            onClick={userRole === 'VIEWER' ? undefined : onEmergencyStop}
            disabled={userRole === 'VIEWER'}
            title={userRole === 'VIEWER' ? 'Yêu cầu quyền Operator hoặc Admin để dừng khẩn cấp' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: userRole === 'VIEWER' ? 'rgba(255,255,255,0.08)' : '#ef4444',
              color: userRole === 'VIEWER' ? '#6b8a7b' : '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: userRole === 'VIEWER' ? 'not-allowed' : 'pointer',
              boxShadow: userRole === 'VIEWER' ? 'none' : '0 0 15px rgba(239, 68, 68, 0.35)',
              transition: 'transform 0.1s ease'
            }}
          >
            {userRole === 'VIEWER' ? <Lock size={15} /> : <OctagonAlert size={16} />}
            <span>KHẨN CẤP (STOP)</span>
          </button>
        )}
      </div>
    </header>
  );
};
