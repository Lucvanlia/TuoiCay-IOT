import React, { useState, useEffect } from 'react';
import { Cpu, Save, RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';
import { ThresholdConfig } from '../types';

interface DeviceSettingsProps {
  config: ThresholdConfig;
  onSaveConfig: (cfg: ThresholdConfig) => void;
}

export const DeviceSettings: React.FC<DeviceSettingsProps> = ({ config, onSaveConfig }) => {
  const [localCfg, setLocalCfg] = useState<ThresholdConfig>(config);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalCfg(config);
  }, [config]);

  const handleSave = () => {
    onSaveConfig(localCfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetDefaults = () => {
    const defaults: ThresholdConfig = {
      soilDry: 35,
      soilWet: 60,
      rainThreshold: 50,
      maxPumpSeconds: 20,
      restCooldownSeconds: 10
    };
    setLocalCfg(defaults);
    onSaveConfig(defaults);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Thông báo đã lưu thành công */}
          {saved && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(82, 183, 136, 0.15)',
              border: '1px solid #52b788',
              color: '#74c69d',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Check size={18} />
              <span><b>Thành công!</b> Đã truyền cấu hình xuống bo mạch ESP32 & đồng bộ Cloud Realtime!</span>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#eef5f0' }}>
                Ngưỡng độ ẩm đất kích hoạt bơm (Soil Dry %):
              </label>
              <span style={{ fontSize: '12px', color: '#52b788', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {localCfg.soilDry}%
              </span>
            </div>
            <input
              type="number"
              min={5}
              max={90}
              value={localCfg.soilDry}
              onChange={(e) => setLocalCfg({ ...localCfg, soilDry: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#091c14',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px'
              }}
            />
            <p style={{ fontSize: '11px', color: '#749282', margin: '4px 0 0 0' }}>
              💡 Khi độ ẩm đất &lt; ngưỡng này (và trời không mưa), ESP32 sẽ tự động bật máy bơm.
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#eef5f0' }}>
                Ngưỡng độ ẩm đất ngắt bơm (Soil Wet %):
              </label>
              <span style={{ fontSize: '12px', color: '#52b788', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {localCfg.soilWet}%
              </span>
            </div>
            <input
              type="number"
              min={10}
              max={95}
              value={localCfg.soilWet}
              onChange={(e) => setLocalCfg({ ...localCfg, soilWet: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#091c14',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px'
              }}
            />
            <p style={{ fontSize: '11px', color: '#749282', margin: '4px 0 0 0' }}>
              💡 Khi đất ngậm đủ nước &ge; ngưỡng này, ESP32 sẽ tự động ngắt bơm lập tức chống ngập úng rễ.
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#eef5f0' }}>
                Ngưỡng phát hiện trời mưa (Rain Threshold %):
              </label>
              <span style={{ fontSize: '12px', color: '#06b6d4', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {localCfg.rainThreshold}%
              </span>
            </div>
            <input
              type="number"
              min={10}
              max={90}
              value={localCfg.rainThreshold}
              onChange={(e) => setLocalCfg({ ...localCfg, rainThreshold: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#091c14',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px'
              }}
            />
            <p style={{ fontSize: '11px', color: '#749282', margin: '4px 0 0 0' }}>
              💡 Khi cảm biến mưa &ge; ngưỡng này, bơm tự động bị khóa an toàn và LED cảnh báo bật sáng.
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#eef5f0' }}>
                Thời gian bơm tối đa mỗi phiên (giây):
              </label>
              <span style={{ fontSize: '12px', color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {localCfg.maxPumpSeconds}s
              </span>
            </div>
            <input
              type="number"
              min={5}
              max={300}
              value={localCfg.maxPumpSeconds}
              onChange={(e) => setLocalCfg({ ...localCfg, maxPumpSeconds: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#091c14',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px'
              }}
            />
            <p style={{ fontSize: '11px', color: '#749282', margin: '4px 0 0 0' }}>
              💡 Bảo vệ an toàn: ngắt cưỡng bức nếu bơm chạy liên tục vượt quá thời gian này (chống cháy máy bơm).
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#eef5f0' }}>
                Thời gian nghỉ ngấm nước giữa 2 lần tưới (giây):
              </label>
              <span style={{ fontSize: '12px', color: '#a78bfa', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {localCfg.restCooldownSeconds}s
              </span>
            </div>
            <input
              type="number"
              min={2}
              max={600}
              value={localCfg.restCooldownSeconds}
              onChange={(e) => setLocalCfg({ ...localCfg, restCooldownSeconds: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#091c14',
                border: '1px solid rgba(82, 183, 136, 0.2)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px'
              }}
            />
            <p style={{ fontSize: '11px', color: '#749282', margin: '4px 0 0 0' }}>
              💡 Thời gian chờ nước ngấm từ bề mặt xuống tầng rễ trước khi kiểm tra lại độ ẩm đất.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
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
                boxShadow: '0 4px 14px rgba(82, 183, 136, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <Save size={18} />
              <span>LƯU CẤU HÌNH XUỐNG ESP32</span>
            </button>

            <button
              onClick={handleResetDefaults}
              title="Khôi phục thông số mặc định (35% - 60%)"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(82, 183, 136, 0.3)',
                backgroundColor: 'rgba(82, 183, 136, 0.1)',
                color: '#8fa89b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={16} />
              <span>Mặc định</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
