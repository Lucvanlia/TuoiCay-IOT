import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, off } from 'firebase/database';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

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
