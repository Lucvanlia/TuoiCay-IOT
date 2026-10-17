import React from 'react';
import { AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { AlertItem } from '../types';

interface AlertsListProps {
  alerts: AlertItem[];
  onMarkAllRead: () => void;
}

export const AlertsList: React.FC<AlertsListProps> = ({ alerts, onMarkAllRead }) => {
  const getIcon = (severity: string) => {
    switch (severity) {
      case 'DANGER':
        return <AlertCircle size={20} color="#ef4444" />;
      case 'WARN':
        return <AlertTriangle size={20} color="#fbbf24" />;
      default:
        return <Info size={20} color="#38bdf8" />;
    }
  };

  const getBorderColor = (severity: string) => {
    switch (severity) {
      case 'DANGER':
        return '#ef4444';
      case 'WARN':
        return '#fbbf24';
      default:
        return '#38bdf8';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#122a20', color: '#52b788' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: '#eef5f0' }}>
              Cảnh Báo & Sự Kiện Hệ Thống
            </h2>
            <p style={{ fontSize: '12px', color: '#8fa89b' }}>
              Thông báo phát hiện mưa, khóa an toàn và cảnh báo bồn nước
            </p>
          </div>
        </div>

        <button
          onClick={onMarkAllRead}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(82, 183, 136, 0.2)',
            backgroundColor: '#0a1d15',
            color: '#74c69d',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <CheckCircle size={14} />
          <span>Đánh dấu đã đọc</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#5e7a6a' }}>
            Không có cảnh báo nào trong hệ thống.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '14px 18px',
                backgroundColor: '#091c14',
                borderRadius: '10px',
                borderLeft: `4px solid ${getBorderColor(alert.severity)}`
              }}
            >
              <div style={{ marginTop: '2px' }}>{getIcon(alert.severity)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#eef5f0' }}>{alert.title}</h4>
                  <span style={{ fontSize: '11px', color: '#6e8d7d', fontFamily: 'var(--font-mono)' }}>
                    {alert.timestamp}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#8fa89b', marginTop: '3px' }}>{alert.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
