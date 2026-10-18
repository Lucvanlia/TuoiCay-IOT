import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, off, push, query, limitToLast } from 'firebase/database';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import type { UserRole, UserPermissionItem, ThresholdConfig } from './types';

// Cấu hình Firebase đọc từ file môi trường .env.local (Bảo mật, không bị commit lên Git)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCi7dIhnj9BbILc8ZlifpZ4c9Cz9jq5tMs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'iot-garden-2cb4e.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://iot-garden-2cb4e-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'iot-garden-2cb4e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'iot-garden-2cb4e.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '294272058287',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:294272058287:web:604b89a72266a561aea55a',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-T365XSL11D'
};

// Khởi tạo app
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ============================================================================
// CÁC HÀM TIỆN ÍCH CHO REALTIME DATABASE (VƯỜN THÔNG MINH)
// Đường dẫn: /garden
// ============================================================================

export interface GardenTelemetry {
  soil: number;
  rain: number;
  raining: boolean;
  temp: number;
  hum: number;
  pump: boolean;
  mode: 'AUTO' | 'MANUAL';
  tankOk?: boolean;
  rssi?: number;
  updatedAt?: number;
}

export interface GardenControl {
  mode?: 'AUTO' | 'MANUAL';
  pump?: boolean;
  emergencyStop?: boolean;
  updatedAt?: number;
}

// 1. Lắng nghe dữ liệu Telemetry từ ESP32 gửi lên
export function listenTelemetry(onData: (data: GardenTelemetry) => void, onError?: (err: Error) => void) {
  const telemetryRef = ref(rtdb, 'garden/telemetry');
  onValue(telemetryRef, (snapshot: any) => {
    if (snapshot.exists()) {
      onData(snapshot.val());
    }
  }, (err: any) => {
    if (onError) onError(err);
  });

  return () => off(telemetryRef);
}

// 2. Gửi lệnh điều khiển từ Web xuống ESP32
export async function sendControl(control: GardenControl) {
  const controlRef = ref(rtdb, 'garden/control');
  await update(controlRef, {
    ...control,
    updatedAt: Date.now()
  });
}

// 3. Lắng nghe trạng thái Online/Offline của thiết bị
export function listenDeviceStatus(onStatus: (online: boolean, lastHeartbeat?: number) => void) {
  const statusRef = ref(rtdb, 'garden/status');
  onValue(statusRef, (snapshot: any) => {
    if (snapshot.exists()) {
      const val = snapshot.val();
      const last = val.lastHeartbeat || 0;
      // Nếu có tín hiệu trong vòng 30 giây gần nhất coi như Online
      const isOnline = Boolean(val.online) && (Date.now() - last < 30000);
      onStatus(isOnline, last);
    } else {
      onStatus(false);
    }
  });

  return () => off(statusRef);
}

// 4. Ghi nhận nhật ký tưới nước (Irrigation Log) - Lưu trữ bền vững trên Cloud
export async function recordIrrigationLog(log: {
  mode: 'AUTO' | 'MANUAL';
  durationSeconds: number;
  soilBefore: number;
  soilAfter: number;
  startReason: string;
  stopReason: string;
}) {
  const logRef = ref(rtdb, 'garden/irrigationLog');
  const now = Date.now();
  await push(logRef, {
    ...log,
    timestamp: new Date().toLocaleTimeString('vi-VN'),
    ts: now
  });
}

// 5. Lắng nghe danh sách nhật ký tưới nước (giới hạn 15 bản ghi gần nhất theo tối ưu firebase.md)
export function listenIrrigationLogs(onLogs: (logs: any[]) => void) {
  const logQuery = query(ref(rtdb, 'garden/irrigationLog'), limitToLast(15));
  const unsub = onValue(logQuery, (snapshot: any) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map((key) => ({
        id: key,
        ...data[key]
      })).reverse();
      onLogs(list);
    }
  });

  return () => unsub();
}

// 6. Lắng nghe chuỗi điểm lịch sử thời gian thực để vẽ biểu đồ (20 điểm gần nhất)
export function listenHistory(onHistory: (points: Array<{ time: string; soil: number; temp: number; pump: boolean }>) => void) {
  const historyQuery = query(ref(rtdb, 'garden/history'), limitToLast(20));
  const unsub = onValue(historyQuery, (snapshot: any) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map((key) => {
        const item = data[key];
        const dateObj = new Date(item.ts || Number(key));
        const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return {
          time: timeStr,
          soil: Number(item.soil) || 0,
          temp: Number(item.temp) || 0,
          pump: Boolean(item.pump)
        };
      });
      onHistory(list);
    }
  });

  return () => unsub();
}

// 7. Ghi nhận cảnh báo hệ thống lên Cloud
export async function recordAlert(alert: {
  severity: 'INFO' | 'WARN' | 'DANGER';
  title: string;
  message: string;
}) {
  try {
    const alertsRef = ref(rtdb, 'garden/alerts');
    const now = Date.now();
    await push(alertsRef, {
      ...alert,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      ts: now,
      read: false
    });
  } catch (e) {
    console.warn('[FIREBASE] Loi ghi alert:', e);
  }
}

// 8. Lắng nghe danh sách cảnh báo từ Cloud (20 cảnh báo gần nhất)
export function listenAlerts(onAlerts: (alerts: any[]) => void) {
  const alertsQuery = query(ref(rtdb, 'garden/alerts'), limitToLast(20));
  const unsub = onValue(alertsQuery, (snapshot: any) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map((key) => ({
        id: key,
        timestamp: data[key].timestamp || new Date(data[key].ts || Date.now()).toLocaleTimeString('vi-VN'),
        severity: data[key].severity || 'INFO',
        title: data[key].title || 'Thông báo',
        message: data[key].message || '',
        read: Boolean(data[key].read)
      })).reverse();
      onAlerts(list);
    }
  });

  return () => unsub();
}

// 9. Đánh dấu tất cả cảnh báo đã đọc trên Cloud
export async function markAllAlertsReadInFirebase(alertIds: string[]) {
  try {
    const updates: Record<string, boolean> = {};
    for (const id of alertIds) {
      updates[`alerts/${id}/read`] = true;
    }
    await update(ref(rtdb, 'garden'), updates);
  } catch (e) {
    console.warn('[FIREBASE] Loi cap nhat read alert:', e);
  }
}

// ============================================================================
// XÁC THỰC NGƯỜI DÙNG (FIREBASE AUTH)
// ============================================================================

export async function loginWithGoogle(): Promise<User> {
  const res = await signInWithPopup(auth, googleProvider);
  return res.user;
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ============================================================================
// QUẢN LÝ PHÂN QUYỀN NGƯỜI DÙNG (ROLE-BASED ACCESS CONTROL - RBAC)
// Node: /garden/roles
// ============================================================================

export const sanitizeKey = (str: string) => str.toLowerCase().replace(/[.#$\[\]]/g, '_');

// 10. Lắng nghe danh sách phân quyền người dùng
export function listenAllUserRoles(onRoles: (roles: UserPermissionItem[]) => void) {
  const rolesRef = ref(rtdb, 'garden/roles');
  const unsub = onValue(rolesRef, (snapshot: any) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list: UserPermissionItem[] = Object.keys(data).map((key) => ({
        id: key,
        email: data[key].email || '',
        displayName: data[key].displayName || '',
        role: (data[key].role || 'VIEWER') as UserRole,
        addedAt: data[key].addedAt || '',
        addedBy: data[key].addedBy || ''
      }));
      onRoles(list);
    } else {
      onRoles([]);
    }
  });

  return () => unsub();
}

// 11. Cập nhật hoặc thêm vai trò người dùng
export async function setUserRole(email: string, role: UserRole, displayName?: string, addedBy?: string) {
  const key = sanitizeKey(email);
  const userRef = ref(rtdb, `garden/roles/${key}`);
  await set(userRef, {
    email: email.trim().toLowerCase(),
    role,
    displayName: displayName || email.split('@')[0],
    addedAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN'),
    addedBy: addedBy || 'Admin'
  });
}

// 12. Xóa vai trò người dùng
export async function removeUserRole(id: string) {
  const userRef = ref(rtdb, `garden/roles/${id}`);
  await set(userRef, null);
}

// 13. Lưu cấu hình ngưỡng thiết bị lên Firebase Cloud (/garden/config)
export async function saveDeviceConfig(config: ThresholdConfig) {
  const cfgRef = ref(rtdb, 'garden/config');
  await set(cfgRef, {
    ...config,
    updatedAt: Date.now()
  });
}

// 14. Lắng nghe cấu hình ngưỡng thiết bị từ Firebase Cloud
export function listenDeviceConfig(onConfig: (cfg: ThresholdConfig) => void) {
  const cfgRef = ref(rtdb, 'garden/config');
  const unsub = onValue(cfgRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      onConfig({
        soilDry: Number(data.soilDry ?? 35),
        soilWet: Number(data.soilWet ?? 60),
        rainThreshold: Number(data.rainThreshold ?? 50),
        maxPumpSeconds: Number(data.maxPumpSeconds ?? 20),
        restCooldownSeconds: Number(data.restCooldownSeconds ?? 10)
      });
    }
  });
  return () => unsub();
}
