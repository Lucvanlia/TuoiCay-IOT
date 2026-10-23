import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { ControlPanel } from './components/ControlPanel';
import { TelemetryChart } from './components/TelemetryChart';
import { LogTable } from './components/LogTable';
import { AlertsList } from './components/AlertsList';
import { DeviceSettings } from './components/DeviceSettings';
import { UserRoleManagement } from './components/UserRoleManagement';
import { LoginModal } from './components/LoginModal';
import { WifiOff } from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  listenTelemetry,
  sendControl,
  listenDeviceStatus,
  listenIrrigationLogs,
  listenHistory,
  listenAlerts,
  markAllAlertsReadInFirebase,
  loginWithGoogle,
  logoutFirebase,
  onAuthChanged,
  listenAllUserRoles,
  setUserRole as setFirebaseUserRole,
  removeUserRole as removeFirebaseUserRole,
  saveDeviceConfig,
  listenDeviceConfig
} from './firebase';
import {
  TelemetryData,
  SystemMode,
  LogEntry,
  AlertItem,
  ChartPoint,
  ThresholdConfig,
  UserRole,
  UserPermissionItem,
  AppUser
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [simMode, setSimMode] = useState<boolean>(false);
  const [bridgeConnected, setBridgeConnected] = useState<boolean>(false);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AppUser | User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [rolesList, setRolesList] = useState<UserPermissionItem[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('VIEWER');
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
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // Reference for soil at pump start
  const soilAtStartRef = useRef<number>(telemetry.soilMoisture);
  const pumpStartReasonRef = useRef<string>('Đất khô');

  // Live WebSocket Bridge Connection (ws://localhost:8080)
  // Chi ket noi khi dang chay tren moi truong dev cuc bo (localhost)
  // tranh viec Chrome hien popup Private Network Access khi nguoi dung vao trang web tren Cloud
  useEffect(() => {
    const isLocalHost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (simMode || !isLocalHost) {
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
            } else if (msg.type === 'alert' && msg.data) {
              setAlerts((prev) => {
                const exists = prev.some(a => a.id === msg.data.id || (a.title === msg.data.title && a.timestamp === msg.data.timestamp));
                if (exists) return prev;
                return [msg.data, ...prev];
              });
            } else if (msg.type === 'log' && typeof msg.text === 'string') {
              const text = msg.text;
              if (text.startsWith('[WARN]')) {
                const newAlert: AlertItem = {
                  id: `warn-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString('vi-VN'),
                  severity: 'WARN',
                  title: 'Cảnh báo thiết bị (ESP32)',
                  message: text.replace('[WARN]', '').trim(),
                  read: false
                };
                setAlerts((prev) => [newAlert, ...prev]);
              }
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

  // Khoi phuc dang nhap tu localStorage neu co
  useEffect(() => {
    try {
      const saved = localStorage.getItem('garden_auth_user');
      if (saved) {
        const parsed: AppUser = JSON.parse(saved);
        if (parsed && parsed.role) {
          setCurrentUser(parsed);
          setUserRole(parsed.role);
        }
      }
    } catch (e) {
      console.error('[AUTH] Loi doc tai khoan tu bo nho cuc bo:', e);
    }
  }, []);

  // Firebase Auth state listener
  useEffect(() => {
    const unsub = onAuthChanged((u) => {
      if (u) {
        setCurrentUser(u);
      } else {
        const saved = localStorage.getItem('garden_auth_user');
        if (!saved) {
          setCurrentUser(null);
        }
      }
    });
    return () => unsub();
  }, []);

  // Lắng nghe danh sách vai trò người dùng (Firebase RBAC)
  useEffect(() => {
    const unsub = listenAllUserRoles((list) => {
      setRolesList(list);
    });
    return () => unsub();
  }, []);

  // Tính toán role hiện tại của người dùng
  useEffect(() => {
    if (!currentUser) {
      setUserRole('VIEWER');
      return;
    }

    // Neu dang nhap qua AppUser (Manual/Demo) co san role
    if ('role' in currentUser && (currentUser as AppUser).role) {
      setUserRole((currentUser as AppUser).role);
      return;
    }

    const email = currentUser.email?.toLowerCase();
    if (!email) {
      setUserRole('VIEWER');
      return;
    }

    const found = rolesList.find((r) => r.email.toLowerCase() === email);
    if (found) {
      setUserRole(found.role);
    } else {
      // Nếu danh sách phân quyền trên Firebase chưa có ai, tự động gán ADMIN cho tài khoản đầu tiên
      if (rolesList.length === 0) {
        setUserRole('ADMIN');
        setFirebaseUserRole(
          email,
          'ADMIN',
          currentUser.displayName || undefined,
          'Hệ thống tự động kích hoạt Admin đầu tiên'
        ).catch((err) => console.error('[AUTH] Khởi tạo admin đầu tiên lỗi:', err));
      } else {
        setUserRole('VIEWER');
      }
    }
  }, [currentUser, rolesList]);

  // Xu ly dang nhap Custom (Username/Password 3 Roles)
  const handleCustomLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    setUserRole(user.role);
    try {
      localStorage.setItem('garden_auth_user', JSON.stringify(user));
    } catch (e) {
      console.error('[AUTH] Loi luu tai khoan cuc bo:', e);
    }
  };

  // Xu ly dang xuat (xoa ca Firebase lan LocalStorage)
  const handleLogout = async () => {
    try {
      localStorage.removeItem('garden_auth_user');
      await logoutFirebase();
    } catch (e) {
      console.warn('[AUTH] Loi logout:', e);
    }
    setCurrentUser(null);
    setUserRole('VIEWER');
  };

  // Bảo vệ route: Nếu vai trò là VIEWER mà đang ở tab Cấu hình hoặc Phân quyền thì chuyển về Tổng quan
  useEffect(() => {
    if (userRole === 'VIEWER' && (activeTab === 'settings' || activeTab === 'roles')) {
      setActiveTab('overview');
    }
    if (userRole === 'OPERATOR' && activeTab === 'roles') {
      setActiveTab('overview');
    }
  }, [userRole, activeTab]);

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

    const unsubLogs = listenIrrigationLogs((cloudLogs) => {
      if (cloudLogs && cloudLogs.length > 0) {
        setLogs(cloudLogs);
      }
    });

    const unsubHistory = listenHistory((cloudPoints) => {
      if (cloudPoints && cloudPoints.length > 0) {
        setChartHistory(cloudPoints);
      }
    });

    const unsubAlerts = listenAlerts((cloudAlerts) => {
      if (cloudAlerts && cloudAlerts.length > 0) {
        setAlerts(cloudAlerts);
      }
    });

    const unsubConfig = listenDeviceConfig((cloudCfg) => {
      if (cloudCfg) {
        setConfig(cloudCfg);
      }
    });

    return () => {
      unsubTelemetry();
      unsubStatus();
      unsubLogs();
      unsubHistory();
      unsubAlerts();
      unsubConfig();
    };
  }, []);

  // Theo dõi sự kiện thực tế để kích hoạt cảnh báo tức thì (Live Alert Watcher)
  const prevTelemRef = useRef<TelemetryData | null>(null);
  const initialAlertCheckedRef = useRef<boolean>(false);

  useEffect(() => {
    const nowTime = new Date().toLocaleTimeString('vi-VN');

    // Kiểm tra trạng thái bất thường ngay lần đầu nhận Telemetry
    if (!initialAlertCheckedRef.current && (telemetry.soilMoisture > 0 || telemetry.rainPercentage > 0)) {
      initialAlertCheckedRef.current = true;
      const initialAlerts: AlertItem[] = [];

      if (telemetry.isRaining || telemetry.rainPercentage >= 50) {
        initialAlerts.push({
          id: `rain-init-${Date.now()}`,
          timestamp: nowTime,
          severity: 'WARN',
          title: 'Phát hiện trời mưa',
          message: `Cảm biến phát hiện lượng mưa ${telemetry.rainPercentage}%. Khóa tưới tự động bảo vệ bộ rễ.`,
          read: false
        });
      }
      if (telemetry.soilMoisture >= 85) {
        initialAlerts.push({
          id: `soil-wet-init-${Date.now()}`,
          timestamp: nowTime,
          severity: 'WARN',
          title: 'Cảnh báo: Đất bão hòa nước',
          message: `Độ ẩm đất đạt ${telemetry.soilMoisture}%. Ngừng toàn bộ hoạt động cấp nước để chống úng rễ.`,
          read: false
        });
      } else if (telemetry.soilMoisture < 35 && telemetry.soilMoisture > 0) {
        initialAlerts.push({
          id: `soil-dry-init-${Date.now()}`,
          timestamp: nowTime,
          severity: 'WARN',
          title: 'Cảnh báo: Đất khô cằn',
          message: `Độ ẩm đất chỉ còn ${telemetry.soilMoisture}% (< 35%). Cần cấp nước bổ sung cho cây.`,
          read: false
        });
      }

      if (initialAlerts.length > 0) {
        setAlerts((prevA) => [...initialAlerts, ...prevA]);
      }
    }

    // Theo dõi biến thiên trạng thái giữa các lần cập nhật Telemetry
    if (prevTelemRef.current) {
      const prev = prevTelemRef.current;

      // 1. Chuyển trạng thái Mưa (Bắt đầu / Tạnh mưa)
      if (!prev.isRaining && telemetry.isRaining) {
        const newAlert: AlertItem = {
          id: `rain-${Date.now()}`,
          timestamp: nowTime,
          severity: 'WARN',
          title: 'Phát hiện trời mưa',
          message: `Cảm biến phát hiện lượng mưa ${telemetry.rainPercentage}%. Khóa tưới tự động bảo vệ bộ rễ.`,
          read: false
        };
        setAlerts((prevA) => [newAlert, ...prevA.filter(a => a.id !== newAlert.id)]);
      } else if (prev.isRaining && !telemetry.isRaining) {
        const newAlert: AlertItem = {
          id: `rain-stop-${Date.now()}`,
          timestamp: nowTime,
          severity: 'INFO',
          title: 'Trời đã tạnh mưa',
          message: `Cảm biến mưa khô ráo (${telemetry.rainPercentage}%). Hệ thống sẵn sàng tưới trở lại.`,
          read: false
        };
        setAlerts((prevA) => [newAlert, ...prevA.filter(a => a.id !== newAlert.id)]);
      }

      // 2. Chuyển trạng thái Đất (Bão hòa >= 85% / Khô < 35%)
      if (prev.soilMoisture < 85 && telemetry.soilMoisture >= 85) {
        const newAlert: AlertItem = {
          id: `soil-wet-${Date.now()}`,
          timestamp: nowTime,
          severity: 'WARN',
          title: 'Cảnh báo: Đất bão hòa nước',
          message: `Độ ẩm đất đạt ${telemetry.soilMoisture}% (rất cao). Ngừng cấp nước để chống úng rễ.`,
          read: false
        };
        setAlerts((prevA) => [newAlert, ...prevA.filter(a => a.id !== newAlert.id)]);
      } else if (prev.soilMoisture >= 35 && telemetry.soilMoisture < 35) {
        const newAlert: AlertItem = {
          id: `soil-dry-${Date.now()}`,
          timestamp: nowTime,
          severity: 'WARN',
          title: 'Cảnh báo: Đất khô cằn',
          message: `Độ ẩm đất giảm còn ${telemetry.soilMoisture}% (< 35%). Cần cấp nước bổ sung cho cây.`,
          read: false
        };
        setAlerts((prevA) => [newAlert, ...prevA.filter(a => a.id !== newAlert.id)]);
      }

      // 3. Chuyển trạng thái Máy bơm (BẬT / TẮT)
      if (!prev.pumpOn && telemetry.pumpOn) {
        const newAlert: AlertItem = {
          id: `pump-on-${Date.now()}`,
          timestamp: nowTime,
          severity: 'INFO',
          title: `Máy bơm BẬT (${telemetry.mode})`,
          message: `Bắt đầu chu trình tưới bù ẩm. Độ ẩm đất khởi điểm: ${telemetry.soilMoisture}%.`,
          read: false
        };
        setAlerts((prevA) => [newAlert, ...prevA.filter(a => a.id !== newAlert.id)]);
      } else if (prev.pumpOn && !telemetry.pumpOn) {
        const newAlert: AlertItem = {
          id: `pump-off-${Date.now()}`,
          timestamp: nowTime,
          severity: 'INFO',
          title: 'Máy bơm TẮT',
          message: `Hoàn tất chu trình tưới. Độ ẩm đất hiện tại: ${telemetry.soilMoisture}%.`,
          read: false
        };
        setAlerts((prevA) => [newAlert, ...prevA.filter(a => a.id !== newAlert.id)]);
      }
    }

    prevTelemRef.current = telemetry;
  }, [telemetry.soilMoisture, telemetry.isRaining, telemetry.rainPercentage, telemetry.pumpOn, telemetry.mode]);

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
    if (userRole === 'VIEWER') {
      alert('🔒 YÊU CẦU ĐĂNG NHẬP:\nBạn đang ở chế độ Xem (Khách / Demo). Vui lòng ĐĂNG NHẬP bằng tài khoản Quản trị để điều khiển chế độ của thiết bị thật.');
      return;
    }
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
    if (userRole === 'VIEWER') {
      alert('🔒 YÊU CẦU ĐĂNG NHẬP:\nBạn đang ở chế độ Xem (Khách / Demo). Vui lòng ĐĂNG NHẬP bằng tài khoản Quản trị để bật/tắt máy bơm thiết bị thật.');
      return;
    }
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
    if (userRole === 'VIEWER') {
      alert('🔒 YÊU CẦU ĐĂNG NHẬP:\nBạn đang ở chế độ Xem (Khách / Demo). Vui lòng ĐĂNG NHẬP bằng tài khoản Quản trị để thực hiện lệnh dừng khẩn cấp.');
      return;
    }
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
    if (userRole === 'VIEWER') {
      alert('🔒 YÊU CẦU ĐĂNG NHẬP:\nBạn đang ở chế độ Xem (Khách / Demo). Vui lòng ĐĂNG NHẬP bằng tài khoản Quản trị để gỡ khóa hệ thống.');
      return;
    }
    if (!simMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('a');
    }
    sendControl({ emergencyStop: false }).catch(() => {});
    setTelemetry((prev) => ({
      ...prev,
      isStopped: false
    }));
  };

  // Lưu cấu hình ngưỡng cảm biến và đồng bộ xuống ESP32 / Firebase Cloud
  const handleSaveConfig = async (newCfg: ThresholdConfig) => {
    setConfig(newCfg);
    // 1. Gửi qua WebSocket nếu đang kết nối Bridge Local
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'config', data: newCfg }));
    }
    // 2. Lưu đồng bộ lên Firebase Realtime Database
    try {
      await saveDeviceConfig(newCfg);
    } catch (e) {
      console.error('[CONFIG] Lỗi lưu cấu hình lên Firebase:', e);
    }
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
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        userRole={userRole}
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
          userRole={userRole}
          onToggleMobileMenu={() => setMobileOpen(true)}
          onLogin={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* Main Body per tab */}
        <main style={{ padding: '28px', flex: 1 }}>
          {activeTab === 'overview' && (
            <>
              {/* Thong bao che do Khach / Viewer */}
              {userRole === 'VIEWER' && (
                <div style={{
                  padding: '14px 20px',
                  marginBottom: '20px',
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>👀</span>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', margin: 0 }}>
                        Chế độ Xem Trực Quan (Demo Wokwi / Khách)
                      </h4>
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0 0' }}>
                        Bạn đang xem số liệu thời gian thực. Để điều khiển máy bơm mạch thật và cài đặt ngưỡng, vui lòng <b>Đăng nhập Quản trị</b>.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    style={{
                      padding: '7px 16px',
                      backgroundColor: '#38bdf8',
                      color: '#071610',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Đăng nhập Hệ thống (3 Roles / Google)
                  </button>
                </div>
              )}

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
                userRole={userRole}
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
              onMarkAllRead={() => {
                setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
                markAllAlertsReadInFirebase(alerts.map((a) => a.id));
              }}
            />
          )}

          {activeTab === 'settings' && userRole !== 'VIEWER' && (
            <DeviceSettings
              config={config}
              onSaveConfig={handleSaveConfig}
            />
          )}

          {activeTab === 'roles' && userRole === 'ADMIN' && (
            <UserRoleManagement
              currentUser={currentUser}
              currentUserRole={userRole}
              rolesList={rolesList}
              onSetRole={async (email, role, displayName) => {
                await setFirebaseUserRole(
                  email,
                  role,
                  displayName,
                  currentUser?.displayName || currentUser?.email || 'Admin'
                );
              }}
              onRemoveRole={async (id) => {
                await removeFirebaseUserRole(id);
              }}
              onLogin={() => setIsLoginModalOpen(true)}
            />
          )}
        </main>

        {/* Modal Dang Nhap 3 Roles & Google */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleCustomLoginSuccess}
          onGoogleLogin={async () => {
            await loginWithGoogle();
          }}
        />
      </div>
    </div>
  );
};

export default App;
