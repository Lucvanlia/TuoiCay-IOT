import React from 'react';
import {
  LayoutDashboard,
  Droplets,
  AlertTriangle,
  Cpu,
  CloudCog,
  Radio,
  Sprout
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOnline: boolean;
  alertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOnline,
  alertCount
}) => {
  const navItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'history', label: 'Lịch sử tưới', icon: Droplets },
    { id: 'alerts', label: 'Cảnh báo & Sự kiện', icon: AlertTriangle, badge: alertCount },
    { id: 'settings', label: 'Thiết bị & Cấu hình', icon: Cpu },
    { id: 'azure', label: 'Azure IoT Hub', icon: CloudCog }
  ];

  return (
    <aside style={{
      width: '280px',
      backgroundColor: '#0a1a14',
      borderRight: '1px solid rgba(82, 183, 136, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0
    }}>
      <div>
        {/* Logo and Brand */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(82, 183, 136, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: '#1b4332',
            border: '1px solid #40916c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#74c69d',
            boxShadow: '0 4px 12px rgba(82, 183, 136, 0.2)'
          }}>
            <Sprout size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '19px',
                fontWeight: 700,
                color: '#eef5f0',
                letterSpacing: '-0.02em'
              }}>
                GreenFlow
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '6px',
                backgroundColor: 'rgba(82, 183, 136, 0.15)',
                color: '#74c69d',
                fontFamily: 'var(--font-mono)'
              }}>
                v2.4
              </span>
            </div>
            <div style={{
              fontSize: '12px',
              color: '#749282',
              marginTop: '2px'
            }}>
              ESP32 Farm Core • Nhóm 2
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div style={{
          padding: '20px 20px 8px 20px',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#5e7a6a'
        }}>
          Điều khiển & Giám sát
        </div>

        {/* Navigation items */}
        <nav style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
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
                  outline: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={19} color={isActive ? '#74c69d' : '#6b8a7b'} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={{
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: '9999px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Hardware Connection Status Footer */}
      <div style={{
        padding: '16px',
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
    </aside>
  );
};
