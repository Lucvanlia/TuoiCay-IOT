export type SystemMode = 'AUTO' | 'MANUAL';

export interface TelemetryData {
  soilMoisture: number; // 0 - 100%
  rainPercentage: number; // 0 - 100%
  isRaining: boolean;
  temperature: number; // °C
  humidity: number; // % RH
  tankOk: boolean;
  pumpOn: boolean;
  pumpRuntimeSeconds: number;
  mode: SystemMode;
  isStopped: boolean;
  rssi: number;
  ip: string;
  lastUpdated: Date;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  mode: SystemMode;
  durationSeconds: number;
  soilBefore: number;
  soilAfter: number;
  startReason: string;
  stopReason: string;
}

export interface AlertItem {
  id: string;
  timestamp: string;
  severity: 'INFO' | 'WARN' | 'DANGER';
  title: string;
  message: string;
  read: boolean;
}

export interface ChartPoint {
  time: string;
  soil: number;
  temp: number;
  pump: boolean;
}

export interface ThresholdConfig {
  soilDry: number; // default 35%
  soilWet: number; // default 60%
  rainThreshold: number; // default 50%
  maxPumpSeconds: number; // default 20s in sim, 60s in real
  restCooldownSeconds: number; // default 10s in sim, 120s in real
}

export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: UserRole;
}

export interface UserPermissionItem {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  addedAt?: string;
  addedBy?: string;
}
