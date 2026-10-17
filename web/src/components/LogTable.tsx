import React from 'react';
import { Droplets, Download, Filter, Search } from 'lucide-react';
import { LogEntry } from '../types';

interface LogTableProps {
  logs: LogEntry[];
  onClearLogs?: () => void;
}

export const LogTable: React.FC<LogTableProps> = ({ logs }) => {
  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#122a20', color: '#52b788' }}>
            <Droplets size={20} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: '#eef5f0' }}>
              Nhật Ký Các Phiên Tưới Cây
            </h2>
            <p style={{ fontSize: '12px', color: '#8fa89b' }}>
              Dữ liệu lưu vết thời điểm, độ ẩm trước/sau và lý do kết thúc phiên
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#8fa89b' }}>
            Tổng số: <b style={{ color: '#52b788' }}>{logs.length}</b> lần tưới
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(82, 183, 136, 0.15)', color: '#5e7a6a', fontSize: '11px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>Thời điểm</th>
              <th style={{ padding: '12px 16px' }}>Chế độ</th>
              <th style={{ padding: '12px 16px' }}>Thời lượng</th>
              <th style={{ padding: '12px 16px' }}>Độ ẩm Trước &rarr; Sau</th>
              <th style={{ padding: '12px 16px' }}>Lý do bắt đầu</th>
              <th style={{ padding: '12px 16px' }}>Lý do kết thúc</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#5e7a6a' }}>
                  Chưa có phiên tưới nào được ghi nhận.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(82, 183, 136, 0.08)', color: '#eef5f0' }}>
                  <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#8fa89b' }}>
                    {log.timestamp}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: log.mode === 'AUTO' ? 'rgba(82, 183, 136, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                      color: log.mode === 'AUTO' ? '#74c69d' : '#fbbf24',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {log.mode}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#74c69d' }}>
                    {log.durationSeconds}s
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: '#ef4444' }}>{log.soilBefore}%</span> &rarr; <span style={{ color: '#52b788', fontWeight: 700 }}>{log.soilAfter}%</span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#8fa89b' }}>
                    {log.startReason}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      color: log.stopReason.includes('mưa') ? '#38bdf8' : (log.stopReason.includes('đủ ẩm') ? '#52b788' : '#8fa89b'),
                      fontWeight: 600
                    }}>
                      {log.stopReason}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
