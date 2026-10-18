import React from 'react';
import {
  LayoutDashboard,
  Droplets,
  AlertTriangle,
  Cpu,
  ShieldCheck,
  Sprout,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import type { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOnline: boolean;
  alertCount: number;
  collapsed: boolean;
  setCollapsed: (val: boolean | ((prev: boolean) => boolean)) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
  userRole?: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOnline,
  alertCount,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  userRole = 'VIEWER'
}) => {
  const allNavItems: {
    id: string;
    label: string;
    icon: any;
    badge?: number;
    roles?: UserRole[];
  }[] = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'history', label: 'Lịch sử tưới', icon: Droplets },
    { id: 'alerts', label: 'Cảnh báo & Sự kiện', icon: AlertTriangle, badge: alertCount },
    { id: 'settings', label: 'Thiết bị & Cấu hình', icon: Cpu, roles: ['ADMIN', 'OPERATOR'] },
    { id: 'roles', label: 'Phân quyền & User', icon: ShieldCheck, roles: ['ADMIN'] }
  ];

  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false); // Tu dong dong menu khi bam tren mobile
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="mobile-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 49,
            display: 'block'
          }}
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        style={{
          width: collapsed ? '76px' : '280px',
          backgroundColor: '#0a1a14',
          borderRight: '1px solid rgba(82, 183, 136, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100vh',
          position: 'sticky',
          top: 0,
          flexShrink: 0,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 50
        }}
      >
        <div>
          {/* Logo and Brand Header */}
          <div style={{
            padding: collapsed ? '20px 16px' : '20px 20px',
            borderBottom: '1px solid rgba(82, 183, 136, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: '12px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#1b4332',
                border: '1px solid #40916c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#74c69d',
                boxShadow: '0 4px 12px rgba(82, 183, 136, 0.2)',
                flexShrink: 0
              }}>
                <Sprout size={22} />
              </div>
              {!collapsed && (
                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#eef5f0',
                      letterSpacing: '-0.02em'
                    }}>
                      GreenFlow
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(82, 183, 136, 0.15)',
                      color: '#74c69d',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      v2.5
                    </span>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#749282',
                    marginTop: '2px'
                  }}>
                    ESP32 Farm Core • Nhóm 2
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="mobile-close-btn"
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                color: '#8fa89b',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Section Title */}
          {!collapsed && (
            <div style={{
              padding: '18px 20px 8px 20px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#5e7a6a'
            }}>
              Điều khiển & Giám sát
            </div>
          )}

          {/* Navigation Items */}
          <nav style={{
            padding: collapsed ? '16px 8px' : '0 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    padding: collapsed ? '12px' : '12px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: isActive ? '#1b4332' : 'transparent',
                    color: isActive ? '#eef5f0' : '#8fa89b',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                    outline: 'none',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icon size={19} color={isActive ? '#74c69d' : '#6b8a7b'} />
                    {!collapsed && <span>{item.label}</span>}
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span style={{
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: collapsed ? '2px 5px' : '1px 7px',
                      borderRadius: '9999px',
                      fontFamily: 'var(--font-mono)',
                      position: collapsed ? 'absolute' : 'static',
                      top: collapsed ? '4px' : undefined,
                      right: collapsed ? '4px' : undefined
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer: Hardware Status & Collapse Toggle */}
        <div>
          {/* Hardware Connection Card */}
          {!collapsed ? (
            <div style={{
              padding: '14px',
              margin: '12px',
              backgroundColor: '#0d221a',
              borderRadius: '12px',
              border: '1px solid rgba(82, 183, 136, 0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isOnline ? '#52b788' : '#ef4444',
                    boxShadow: isOnline ? '0 0 8px #52b788' : 'none',
                    display: 'inline-block'
                  }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#eef5f0' }}>
                    ESP32-Garden
                  </span>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: '#74c69d',
                  backgroundColor: 'rgba(82, 183, 136, 0.12)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  -58 dBm
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#6e8d7d', display: 'flex', justifyContent: 'space-between' }}>
                <span>Trạng thái</span>
                <span style={{ color: isOnline ? '#74c69d' : '#f87171', fontWeight: 600 }}>
                  {isOnline ? 'Online (MQTT)' : 'Offline'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <span
                title={isOnline ? 'ESP32 Online' : 'ESP32 Offline'}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: isOnline ? '#52b788' : '#ef4444',
                  boxShadow: isOnline ? '0 0 8px #52b788' : 'none',
                  display: 'inline-block'
                }}
              />
            </div>
          )}

          {/* Desktop Collapse / Expand Button */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid rgba(82, 183, 136, 0.1)',
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'space-between',
            alignItems: 'center'
          }}>
            {!collapsed && (
              <span style={{ fontSize: '12px', color: '#6e8d7d' }}>
                Thu gọn thanh menu
              </span>
            )}
            <button
              onClick={() => setCollapsed((prev) => !prev)}
              className="desktop-collapse-btn"
              title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                backgroundColor: '#122a20',
                color: '#74c69d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
