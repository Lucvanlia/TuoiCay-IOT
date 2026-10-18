import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { ControlPanel } from './components/ControlPanel';
import { TelemetryChart } from './components/TelemetryChart';
import { LogTable } from './components/LogTable';
import { AlertsList } from './components/AlertsList';
import { DeviceSettings } from './components/DeviceSettings';
import { AzureIntegration } from './components/AzureIntegration';
import { WifiOff } from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  listenTelemetry,
  sendControl,
  listenDeviceStatus,
  loginWithGoogle,
  logoutFirebase,
  onAuthChanged
} from './firebase';
import {
  TelemetryData,
  SystemMode,
  LogEntry,
  AlertItem,
  ChartPoint,
  ThresholdConfig
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [simMode, setSimMode] = useState<boolean>(false);
  const [bridgeConnected, setBridgeConnected] = useState<boolean>(false);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Configuration
  const [config, setConfig] = useState<ThresholdConfig>({
    soilDry: 35,
    soilWet: 60,
    rainThreshold: 50,
    maxPumpSeconds: 20,
    restCooldownSeconds: 10
  });

  // Telemetry state
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    soilMoisture: 28,
    rainPercentage: 0,
    isRaining: false,
    temperature: 28.5,
    humidity: 68,
    tankOk: true,
    pumpOn: true,
    pumpRuntimeSeconds: 6,
    mode: 'AUTO',
    isStopped: false,
    rssi: -58,
    ip: '192.168.1.105',
    lastUpdated: new Date()
  });

  // Chart time-series history
  const [chartHistory, setChartHistory] = useState<ChartPoint[]>([
    { time: '10:40:00', soil: 42, temp: 28.0, pump: false },
    { time: '10:40:30', soil: 38, temp: 28.2, pump: false },
    { time: '10:41:00', soil: 34, temp: 28.4, pump: true },
    { time: '10:41:30', soil: 31, temp: 28.5, pump: true },
    { time: '10:42:00', soil: 28, temp: 28.5, pump: true }
  ]);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-1',
      timestamp: '10:35:12',
      mode: 'AUTO',
      durationSeconds: 18,
      soilBefore: 32,
      soilAfter: 61,
      startReason: 'Đất khô (<35%)',
      stopReason: 'Đất đủ ẩm (>=60%)'
    },
    {
      id: 'log-2',
      timestamp: '10:15:40',
      mode: 'MANUAL',
      durationSeconds: 10,
      soilBefore: 45,
      soilAfter: 52,
      startReason: 'Bật tay qua Web',
      stopReason: 'Tắt tay qua Web'
    }
  ]);

  // Alerts
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: 'alt-1',
      timestamp: '10:41:00',
      severity: 'INFO',
      title: 'Kích hoạt tưới tự động (AUTO)',
      message: 'Độ ẩm đất giảm xuống 34% (< 35%), bơm bắt đầu chạy bù nước.',
      read: false
    },
    {
      id: 'alt-2',
      timestamp: '09:50:22',
      severity: 'WARN',
      title: 'Phát hiện trời mưa',
      message: 'Tấm cảm ứng mưa ẩm 65%, khóa tưới tự động bảo vệ bộ rễ.',
      read: true
    }
  ]);

  // Reference for soil at pump start
  const soilAtStartRef = useRef<number>(telemetry.soilMoisture);
  const pumpStartReasonRef = useRef<string>('Đất khô');

  // Live WebSocket Bridge Connection (ws://localhost:8080)
  useEffect(() => {
    if (simMode) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setBridgeConnected(false);
      return;
    }

    let socket: WebSocket | null = null;
    let retryTimer: any = null;

    const connect = () => {
      try {
        socket = new WebSocket('ws://localhost:8080');
        wsRef.current = socket;

        socket.onopen = () => {
          console.log('[WEB] Da ket noi toi Local Bridge ws://localhost:8080');
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'status') {
              setBridgeConnected(Boolean(msg.connected));
            } else if (msg.type === 'telemetry' && msg.data) {
              setBridgeConnected(true);
              const d = msg.data;
              setTelemetry((prev) => ({
                ...prev,
                soilMoisture: typeof d.soil === 'number' ? d.soil : prev.soilMoisture,
                rainPercentage: typeof d.rain === 'number' ? d.rain : prev.rainPercentage,
                isRaining: typeof d.raining === 'boolean' ? d.raining : prev.isRaining,
                temperature: d.temp !== null && typeof d.temp === 'number' ? d.temp : prev.temperature,
                humidity: d.hum !== null && typeof d.hum === 'number' ? d.hum : prev.humidity,
                pumpOn: typeof d.pump === 'boolean' ? d.pump : (d.pump === 1),
                mode: d.mode === 'MANUAL' ? 'MANUAL' : 'AUTO',
                lastUpdated: new Date()
              }));
            }
          } catch (e) {
            console.error('[WEB] Loi doc goi tin bridge:', e);
          }
        };

        socket.onclose = () => {
          setBridgeConnected(false);
          retryTimer = setTimeout(connect, 3000);
        };

        socket.onerror = () => {
          setBridgeConnected(false);
        };
      } catch (e) {
        setBridgeConnected(false);
        retryTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (socket) socket.close();
    };
  }, [simMode]);

  // Firebase Auth state listener
  useEffect(() => {
    const unsub = onAuthChanged((u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  // Firebase Realtime Database Listener (Cloud IoT connection)
  useEffect(() => {
    const unsubTelemetry = listenTelemetry(
      (data) => {
        if (!data) return;
        setCloudConnected(true);
        setTelemetry((prev) => ({
          ...prev,
          soilMoisture: typeof data.soil === 'number' ? data.soil : prev.soilMoisture,
          rainPercentage: typeof data.rain === 'number' ? data.rain : prev.rainPercentage,
          isRaining: typeof data.raining === 'boolean' ? data.raining : prev.isRaining,
          temperature: typeof data.temp === 'number' ? data.temp : prev.temperature,
          humidity: typeof data.hum === 'number' ? data.hum : prev.humidity,
          pumpOn: typeof data.pump === 'boolean' ? data.pump : prev.pumpOn,
          mode: data.mode === 'MANUAL' ? 'MANUAL' : 'AUTO',
          tankOk: typeof data.tankOk === 'boolean' ? data.tankOk : prev.tankOk,
          rssi: typeof data.rssi === 'number' ? data.rssi : prev.rssi,
          lastUpdated: new Date()
        }));
      },
      (err) => {
        console.warn('[FIREBASE] Realtime Database error:', err.message);
      }
    );

    const unsubStatus = listenDeviceStatus((online) => {
      setCloudConnected(online);
    });

    return () => {
      unsubTelemetry();
      unsubStatus();
    };
  }, []);

  // Simulation Clock Tick (runs every 1 second)
  useEffect(() => {
    if (!simMode) return;

    const timer = setInterval(() => {
      setTelemetry((prev) => {
        let newSoil = prev.soilMoisture;
        let newPumpOn = prev.pumpOn;
        let newRuntime = prev.pumpRuntimeSeconds;
        let newIsStopped = prev.isStopped;

        // 1. If pump is ON:
        if (newPumpOn && !newIsStopped) {
          newRuntime += 1;
          // Every 2 seconds of pumping increases soil moisture by 1%
          if (newRuntime % 2 === 0 && newSoil < 100) {
            newSoil = Math.min(100, newSoil + 1);
          }

          // Safety stop conditions
          let stopWhy = '';
          if (prev.isRaining) {
            stopWhy = 'Trời mưa (>=50%)';
          } else if (newSoil >= config.soilWet) {
            stopWhy = 'Đất đủ ẩm (>=60%)';
          } else if (newRuntime >= config.maxPumpSeconds) {
            stopWhy = 'Quá thời gian bơm tối đa';
          } else if (!prev.tankOk) {
            stopWhy = 'Bồn cạn nước';
          }

          if (stopWhy) {
            newPumpOn = false;
            // Record to log
            const nowTime = new Date().toLocaleTimeString('vi-VN');
            setLogs((prevLogs) => [
              {
                id: `log-${Date.now()}`,
                timestamp: nowTime,
                mode: prev.mode,
                durationSeconds: newRuntime,
                soilBefore: soilAtStartRef.current,
                soilAfter: newSoil,
                startReason: pumpStartReasonRef.current,
                stopReason: stopWhy
              },
              ...prevLogs
            ]);

            // Add alert
            setAlerts((prevAlerts) => [
              {
                id: `alt-${Date.now()}`,
                timestamp: nowTime,
                severity: stopWhy.includes('mưa') ? 'WARN' : 'INFO',
                title: `Bơm TẮT: ${stopWhy}`,
                message: `Phiên tưới kết thúc sau ${newRuntime}s. Độ ẩm đất đạt ${newSoil}%.`,
                read: false
              },
              ...prevAlerts
            ]);

            newRuntime = 0;
          }
        } else {
          // If pump is OFF:
          // Soil naturally dries down 1% every 30 seconds
          if (Math.random() < 0.05 && newSoil > 0) {
            newSoil = Math.max(0, newSoil - 1);
          }

          // AUTO START condition:
          if (
            prev.mode === 'AUTO' &&
            !newIsStopped &&
            prev.tankOk &&
            !prev.isRaining &&
            newSoil < config.soilDry
          ) {
            newPumpOn = true;
            newRuntime = 0;
            soilAtStartRef.current = newSoil;
            pumpStartReasonRef.current = 'Đất khô (<35%)';

            const nowTime = new Date().toLocaleTimeString('vi-VN');
            setAlerts((prevAlerts) => [
              {
                id: `alt-${Date.now()}`,
                timestamp: nowTime,
                severity: 'INFO',
                title: 'Bơm BẬT Tự Động',
                message: `Độ ẩm đất ${newSoil}% thấp hơn ngưỡng 35%. Bắt đầu chu kỳ tưới.`,
                read: false
              },
              ...prevAlerts
            ]);
          }
        }

        return {
          ...prev,
          soilMoisture: newSoil,
          pumpOn: newPumpOn,
          pumpRuntimeSeconds: newRuntime,
          isStopped: newIsStopped,
          lastUpdated: new Date()
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [simMode, config]);

  // Chart point recorder (every 5 seconds)
  useEffect(() => {
    const chartTimer = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setChartHistory((prev) => {
        const next = [...prev, {
          time: timeStr,
          soil: telemetry.soilMoisture,
          temp: telemetry.temperature,
          pump: telemetry.pumpOn
        }];
        if (next.length > 20) next.shift();
        return next;
      });
    }, 5000);

    return () => clearInterval(chartTimer);
  }, [telemetry.soilMoisture, telemetry.temperature, telemetry.pumpOn]);

  // Mode Change Handlers
  const handleSetMode = (mode: SystemMode) => {
    if (mode === telemetry.mode) return;
    if (!simMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(mode === 'AUTO' ? 'a' : 'm');
    }
    sendControl({ mode }).catch(() => {});
    setTelemetry((prev) => {
      // Switching mode turns off pump for safety
      if (prev.pumpOn) {
        setLogs((prevLogs) => [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            mode: prev.mode,
            durationSeconds: prev.pumpRuntimeSeconds,
            soilBefore: soilAtStartRef.current,
            soilAfter: prev.soilMoisture,
            startReason: pumpStartReasonRef.current,
            stopReason: 'Đổi chế độ (MODE_CHANGE)'
          },
          ...prevLogs
        ]);
      }
      return {
        ...prev,
        mode,
        pumpOn: false,
        pumpRuntimeSeconds: 0
      };
    });
  };

  // Manual Pump Toggle
  const handleTogglePump = (turnOn: boolean) => {
    if (!simMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('p');
    }
    sendControl({ pump: turnOn }).catch(() => {});
    if (turnOn) {
      soilAtStartRef.current = telemetry.soilMoisture;
      pumpStartReasonRef.current = 'Bật tay qua Web';
      setTelemetry((prev) => ({
        ...prev,
        pumpOn: true,
        pumpRuntimeSeconds: 0
      }));
    } else {
      setLogs((prevLogs) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          mode: telemetry.mode,
          durationSeconds: telemetry.pumpRuntimeSeconds,
          soilBefore: soilAtStartRef.current,
          soilAfter: telemetry.soilMoisture,
          startReason: pumpStartReasonRef.current,
          stopReason: 'Tắt tay qua Web'
        },
        ...prevLogs
      ]);
      setTelemetry((prev) => ({
        ...prev,
        pumpOn: false,
        pumpRuntimeSeconds: 0
      }));
    }
  };

  // Emergency Stop & Resume
  const handleEmergencyStop = () => {
    if (!simMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('s');
    }
    sendControl({ emergencyStop: true, pump: false }).catch(() => {});
    setTelemetry((prev) => ({
      ...prev,
      pumpOn: false,
      isStopped: true,
      pumpRuntimeSeconds: 0
    }));
    setAlerts((prevAlerts) => [
      {
        id: `alt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        severity: 'DANGER',
        title: 'LỆNH KHẨN CẤP: DỪNG TOÀN BỘ BƠM',
        message: 'Khóa relay lập tức. Yêu cầu nhấn RESUME để khôi phục.',
        read: false
      },
      ...prevAlerts
    ]);
  };

  const handleResume = () => {
    if (!simMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('a');
    }
    sendControl({ emergencyStop: false }).catch(() => {});
    setTelemetry((prev) => ({
      ...prev,
      isStopped: false
    }));
  };

  const unreadAlerts = alerts.filter((a) => !a.read).length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={simMode || bridgeConnected || cloudConnected}
        alertCount={unreadAlerts}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <Header
          telemetry={telemetry}
          onEmergencyStop={handleEmergencyStop}
          onResume={handleResume}
          simMode={simMode}
          setSimMode={setSimMode}
          bridgeConnected={bridgeConnected}
          cloudConnected={cloudConnected}
          user={currentUser}
          onLogin={loginWithGoogle}
          onLogout={logoutFirebase}
        />

        {/* Main Body per tab */}
        <main style={{ padding: '28px', flex: 1 }}>
          {activeTab === 'overview' && (
            <>
              {/* Cảnh báo khi ESP32 chưa online (cả Cloud lẫn Local Bridge) */}
              {!bridgeConnected && !cloudConnected && (
                <div style={{
                  padding: '16px 20px',
                  marginBottom: '20px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      padding: '10px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <WifiOff size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f87171', margin: 0 }}>
                        Đang chờ tín hiệu từ bo mạch ESP32
                      </h4>
                      <p style={{ fontSize: '12px', color: '#fca5a5', margin: '4px 0 0 0' }}>
                        ESP32 có thể gửi trực tiếp lên <b>Firebase Cloud</b> qua Wi-Fi hoặc qua cổng USB (<code>npm run bridge</code>).
                      </p>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#8fa89b',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(82, 183, 136, 0.15)'
                  }}>
                    Firebase: iot-garden-2cb4e • Đang lắng nghe Realtime...
                  </div>
                </div>
              )}

              {/* 5 Realtime KPI Metric Cards */}
              <KpiCards telemetry={telemetry} />

              {/* Pump Control Panel & Thresholds */}
              <ControlPanel
                telemetry={telemetry}
                onSetMode={handleSetMode}
                onTogglePump={handleTogglePump}
              />

              {/* Real-time Telemetry Trend Chart */}
              <TelemetryChart history={chartHistory} />
            </>
          )}

          {activeTab === 'history' && (
            <LogTable logs={logs} />
          )}

          {activeTab === 'alerts' && (
            <AlertsList
              alerts={alerts}
              onMarkAllRead={() => setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))}
            />
          )}

          {activeTab === 'settings' && (
            <DeviceSettings
              config={config}
              onSaveConfig={(cfg) => setConfig(cfg)}
            />
          )}

          {activeTab === 'azure' && (
            <AzureIntegration />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
