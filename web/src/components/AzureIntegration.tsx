import React, { useState } from 'react';
import { Cloud, Key, Server, Copy, Check, ExternalLink, ShieldAlert } from 'lucide-react';

export const AzureIntegration: React.FC = () => {
  const [hubName, setHubName] = useState('iothub-tuoicay-hkp');
  const [deviceId, setDeviceId] = useState('esp32-garden-01');
  const [primaryKey, setPrimaryKey] = useState('Kq5mUcVC9EzWsOvwuOotAL3ZWuk/1gtcctlgE9+tv5U=');
  const [copied, setCopied] = useState(false);

  const connectionString = `HostName=${hubName}.azure-devices.net;DeviceId=${deviceId};SharedAccessKey=${primaryKey}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(connectionString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
      {/* 1. Thông số kết nối Azure IoT Hub */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#122a20', color: '#06b6d4' }}>
            <Cloud size={20} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: '#eef5f0' }}>
              Cấu Hình Azure IoT Hub (Gói Free F1)
            </h2>
            <p style={{ fontSize: '12px', color: '#8fa89b' }}>
              Thông số xác thực thiết bị ESP32 qua giao thức MQTT / TLS
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#8fa89b', display: 'block', marginBottom: '6px' }}>
              IoT Hub Name:
            </label>
            <input
              type="text"
              value={hubName}
              onChange={(e) => setHubName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#091c14',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#8fa89b', display: 'block', marginBottom: '6px' }}>
              Device ID:
            </label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#091c14',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#8fa89b', display: 'block', marginBottom: '6px' }}>
              Device Primary Key:
            </label>
            <input
              type="password"
              value={primaryKey}
              onChange={(e) => setPrimaryKey(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#091c14',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', color: '#8fa89b' }}>Device Connection String:</label>
              <button
                onClick={copyToClipboard}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: copied ? '#52b788' : '#74c69d',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={3}
              value={connectionString}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#071610',
                border: '1px solid rgba(82, 183, 136, 0.15)',
                borderRadius: '8px',
                color: '#74c69d',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                resize: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. Kiến trúc & Hạn mức Azure for Students */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#122a20', color: '#fbbf24' }}>
            <Server size={20} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: '#eef5f0' }}>
              Kiến Trúc & Bảo Vệ Hạn Mức Student
            </h2>
            <p style={{ fontSize: '12px', color: '#8fa89b' }}>
              Đảm bảo 0đ chi phí / tháng trong gói $100 Student Credit
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '12px', backgroundColor: '#091c14', borderRadius: '8px', borderLeft: '4px solid #52b788' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#52b788' }}>1. Azure IoT Hub (F1 Free Tier)</h4>
            <p style={{ fontSize: '12px', color: '#8fa89b', marginTop: '3px' }}>
              Hạn mức 8.000 tin nhắn / ngày. Cấu hình ESP32 gửi telemetry định kỳ 10 giây/lần = ~8.640 msg/ngày (hoặc 15s/lần = 5.760 msg/ngày hoàn toàn an toàn).
            </p>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#091c14', borderRadius: '8px', borderLeft: '4px solid #06b6d4' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#06b6d4' }}>2. Azure Static Web Apps (Free)</h4>
            <p style={{ fontSize: '12px', color: '#8fa89b', marginTop: '3px' }}>
              Host trang web React này trực tiếp từ GitHub Repository. Miễn phí 100%, có chứng chỉ HTTPS tự động và CDN toàn cầu.
            </p>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#091c14', borderRadius: '8px', borderLeft: '4px solid #fbbf24' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24' }}>3. Azure Functions (Consumption Y1)</h4>
            <p style={{ fontSize: '12px', color: '#8fa89b', marginTop: '3px' }}>
              Miễn phí 1 triệu lượt gọi / tháng. Xử lý trigger nhận dữ liệu từ IoT Hub lưu vào Azure Table Storage và gửi lệnh Direct Method xuống ESP32.
            </p>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#18120a', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#f87171' }}>⚠ Lưu ý tránh mất tiền Credit</h4>
            <p style={{ fontSize: '12px', color: '#fca5a5', marginTop: '3px' }}>
              Vào Azure Portal &rarr; Cost Management &rarr; Tạo <b>Cost Alert</b> ở mốc $5 và $10. Tuyệt đối không chọn gói trả phí S1/S2 của IoT Hub.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
