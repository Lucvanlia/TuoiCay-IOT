import React, { useState } from 'react';
import { Cpu, Save, RotateCcw, Check } from 'lucide-react';
import { ThresholdConfig } from '../types';

interface DeviceSettingsProps {
  config: ThresholdConfig;
  onSaveConfig: (cfg: ThresholdConfig) => void;
}

export const DeviceSettings: React.FC<DeviceSettingsProps> = ({ config, onSaveConfig }) => {
  const [localCfg, setLocalCfg] = useState<ThresholdConfig>(config);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSaveConfig(localCfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
      {/* 1. Sơ đồ chân ESP32 */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#122a20', color: '#52b788' }}>
            <Cpu size={20} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: '#eef5f0' }}>
              Sơ Đồ Chân ESP32 (Pin Mapping)
            </h2>
            <p style={{ fontSize: '12px', color: '#8fa89b' }}>
              Bố trí phần cứng thực tế & mô phỏng Wokwi
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { pin: 'GPIO 34 (ADC1)', device: 'Cảm biến độ ẩm đất analog (AO)', note: 'Điện dung 3.3V' },
            { pin: 'GPIO 35 (ADC1)', device: 'Cảm biến phát hiện mưa analog (AO)', note: 'Mạch so sánh 3.3V' },
            { pin: 'GPIO 19', device: 'Cảm biến nhiệt độ & ẩm DHT22', note: '1-Wire Bus' },
            { pin: 'GPIO 26', device: 'Relay kích nguồn máy bơm', note: 'Active-HIGH qua Transistor Q1' },
            { pin: 'GPIO 27', device: 'LED đỏ cảnh báo trời mưa', note: 'Qua điện trở 220Ω' },
            { pin: 'GPIO 21 / 22', device: 'Màn hình LCD1602 I2C', note: 'SDA / SCL' },
            { pin: 'GPIO 25', device: 'Công tắc gạt AUTO / MANUAL', note: 'Kéo lên 10k' },
            { pin: 'GPIO 33', device: 'Nút nhấn bơm tay (BOM TAY)', note: 'Kéo lên 10k' },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                backgroundColor: '#091c14',
                borderRadius: '8px',
                fontSize: '13px'
              }}
            >
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#52b788' }}>
                  {item.pin}
                </span>
                <span style={{ color: '#eef5f0', marginLeft: '12px' }}>{item.device}</span>
              </div>
              <span style={{ fontSize: '11px', color: '#6e8d7d' }}>{item.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Cấu hình ngưỡng tưới & an toàn */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: '#eef5f0' }}>
              Cài Đặt Ngưỡng Tự Động
            </h2>
            <p style={{ fontSize: '12px', color: '#8fa89b' }}>
              Lưu vào bộ nhớ NVS trên ESP32
            </p>
          </div>
          {saved && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#52b788',
              fontSize: '12px',
              fontWeight: 700
            }}>
              <Check size={16} /> Đã lưu!
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#8fa89b', display: 'block', marginBottom: '6px' }}>
              Ngưỡng độ ẩm đất kích hoạt bơm (Soil Dry Threshold %):
            </label>
            <input
              type="number"
              value={localCfg.soilDry}
              onChange={(e) => setLocalCfg({ ...localCfg, soilDry: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#091c14',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#8fa89b', display: 'block', marginBottom: '6px' }}>
              Ngưỡng độ ẩm đất ngắt bơm (Soil Wet Threshold %):
            </label>
            <input
              type="number"
              value={localCfg.soilWet}
              onChange={(e) => setLocalCfg({ ...localCfg, soilWet: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#091c14',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#8fa89b', display: 'block', marginBottom: '6px' }}>
              Thời gian bơm tối đa mỗi phiên (giây):
            </label>
            <input
              type="number"
              value={localCfg.maxPumpSeconds}
              onChange={(e) => setLocalCfg({ ...localCfg, maxPumpSeconds: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#091c14',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#8fa89b', display: 'block', marginBottom: '6px' }}>
              Thời gian nghỉ ngấm nước giữa 2 lần tưới (giây):
            </label>
            <input
              type="number"
              value={localCfg.restCooldownSeconds}
              onChange={(e) => setLocalCfg({ ...localCfg, restCooldownSeconds: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#091c14',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px'
              }}
            />
          </div>

          <button
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#52b788',
              color: '#012d1d',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              marginTop: '10px',
              boxShadow: '0 4px 14px rgba(82, 183, 136, 0.3)'
            }}
          >
            <Save size={18} />
            <span>LƯU CẤU HÌNH XUỐNG ESP32</span>
          </button>
        </div>
      </div>
    </div>
  );
};
