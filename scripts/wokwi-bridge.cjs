// ============================================================================
// WOKWI & ESP32 SERIAL -> WEBSOCKET & FIREBASE REALTIME BRIDGE
// 1. Ket noi TCP port 4000 cua Wokwi
// 2. Phat WebSocket ws://localhost:8080 cho Local Web (localhost:5173)
// 3. Dong bo du lieu Realtime len Firebase Cloud (iot-garden-2cb4e)
//    de Web tren dien thoai (iot-garden-2cb4e.web.app) cung nhan duoc!
// ============================================================================

const net = require('net');
const path = require('path');
const { WebSocketServer } = require(path.join(__dirname, '../web/node_modules/ws'));

const WOKWI_PORT = 4000;
const WS_PORT = 8080;
const FIREBASE_DB_URL = 'https://iot-garden-2cb4e-default-rtdb.asia-southeast1.firebasedatabase.app';

let lastDataTime = 0;
let isWokwiAlive = false;
let isWokwiConnected = false;
let wokwiClient = null;
let lineBuffer = '';
let lastCmdTime = Date.now();

let lastPump = false;
let pumpStartTime = 0;
let soilAtPumpStart = 0;
let lastHistoryTime = 0;
let lastRaining = false;
let lastHighSoilAlert = 0;
let lastDrySoilAlert = 0;

// Helper: Gui canh bao len Firebase va phat toi Web Browser
async function pushAlertToFirebase(alert) {
  try {
    const payload = {
      ...alert,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      ts: Date.now(),
      read: false
    };
    await fetch(`${FIREBASE_DB_URL}/garden/alerts.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(`[FIREBASE ALERT] >>> [${payload.severity}] ${payload.title}: ${payload.message}`);
    broadcastToBrowsers({
      type: 'alert',
      data: payload
    });
  } catch (err) {
    console.error('[FIREBASE ALERT ERROR]', err.message);
  }
}

// 1. DONG BO DANG CLOUD: FIREBASE REALTIME DATABASE
// ============================================================================
async function pushToFirebase(telemetryData) {
  try {
    const now = Date.now();
    const payload = {
      ...telemetryData,
      updatedAt: now
    };

    // A. GHI ĐÈ TRẠNG THÁI HIỆN TẠI (STATE OVERWRITE - Cập nhật liên tục)
    const resTelem = await fetch(`${FIREBASE_DB_URL}/garden/telemetry.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resTelem.ok) {
      console.error(`[FIREBASE] Loi PUT telemetry (${resTelem.status}):`, await resTelem.text());
    }

    const resStatus = await fetch(`${FIREBASE_DB_URL}/garden/status.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online: true, lastHeartbeat: now })
    });
    if (!resStatus.ok) {
      console.error(`[FIREBASE] Loi PATCH status (${resStatus.status}):`, await resStatus.text());
    }

    // B. LƯU LỊCH SỬ CHUỖI THỜI GIAN (HISTORY - Mỗi 30s ghi 1 mốc để vẽ biểu đồ)
    if (now - lastHistoryTime >= 30000 || lastHistoryTime === 0) {
      lastHistoryTime = now;
      const historyPoint = {
        soil: telemetryData.soil,
        rain: telemetryData.rain,
        temp: telemetryData.temp,
        hum: telemetryData.hum,
        pump: telemetryData.pump,
        mode: telemetryData.mode,
        ts: now
      };
      const resHist = await fetch(`${FIREBASE_DB_URL}/garden/history/${now}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyPoint)
      });
      if (resHist.ok) {
        console.log(`[FIREBASE] >>> Da ghi 1 diem lich su do am/nhiet do vao /garden/history/${now}`);
      } else {
        console.error(`[FIREBASE] Loi ghi history (${resHist.status}):`, await resHist.text());
      }
    }

    // C. GHI NHẬN NHẬT KÝ TƯỚI (IRRIGATION LOG - Khi máy bơm kết thúc tưới)
    const isPumping = Boolean(telemetryData.pump);
    if (!lastPump && isPumping) {
      // Bơm vừa BẬT
      pumpStartTime = now;
      soilAtPumpStart = telemetryData.soil;
      console.log(`[BRIDGE] Phat hien bom BAT -> Bat dau ghi nhan phien tuoi tu do am ${soilAtPumpStart}%`);
      pushAlertToFirebase({
        severity: 'INFO',
        title: `Máy bơm BẬT (${telemetryData.mode})`,
        message: `Bắt đầu chu trình tưới bù nước. Độ ẩm đất khởi điểm: ${soilAtPumpStart}%.`
      });
    } else if (lastPump && !isPumping) {
      // Bơm vừa TẮT -> Ghi vào danh sách nhật ký Firebase
      const duration = Math.max(1, Math.round((now - pumpStartTime) / 1000));
      const logEntry = {
        mode: telemetryData.mode,
        durationSeconds: duration,
        soilBefore: soilAtPumpStart,
        soilAfter: telemetryData.soil,
        startReason: soilAtPumpStart < 35 ? 'Đất khô (<35%)' : 'Bật tay qua Web',
        stopReason: telemetryData.soil >= 60 ? 'Đất đủ ẩm (>=60%)' : (duration >= 20 ? 'Quá thời gian tối đa' : 'Tắt tay qua Web'),
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        ts: now
      };
      const resLog = await fetch(`${FIREBASE_DB_URL}/garden/irrigationLog.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
      if (resLog.ok) {
        console.log('[FIREBASE] >>> Da luu 1 phien tuoi hoan tat vao /garden/irrigationLog:', logEntry);
      } else {
        console.error(`[FIREBASE] Loi ghi irrigationLog (${resLog.status}):`, await resLog.text());
      }

      pushAlertToFirebase({
        severity: 'INFO',
        title: 'Máy bơm TẮT',
        message: `Hoàn tất phiên tưới sau ${duration}s (${logEntry.stopReason}). Độ ẩm hiện tại: ${telemetryData.soil}%.`
      });
    }
    lastPump = isPumping;

    // D. CẢNH BÁO TỰ ĐỘNG THEO SỰ KIỆN THỰC TẾ (MƯA, ĐẤT BÃO HÒA, ĐẤT KHÔ)
    const isRaining = Boolean(telemetryData.raining);
    if (!lastRaining && isRaining) {
      pushAlertToFirebase({
        severity: 'WARN',
        title: 'Phát hiện trời mưa',
        message: `Cảm biến phát hiện lượng mưa ${telemetryData.rain}%. Tự động khóa tưới bảo vệ bộ rễ.`
      });
    } else if (lastRaining && !isRaining) {
      pushAlertToFirebase({
        severity: 'INFO',
        title: 'Trời đã tạnh mưa',
        message: `Cảm biến mưa khô ráo (${telemetryData.rain}%). Hệ thống sẵn sàng hoạt động trở lại.`
      });
    }
    lastRaining = isRaining;

    if (telemetryData.soil >= 85 && (now - lastHighSoilAlert > 45000 || lastHighSoilAlert === 0)) {
      lastHighSoilAlert = now;
      pushAlertToFirebase({
        severity: 'WARN',
        title: 'Cảnh báo: Đất bão hòa nước',
        message: `Độ ẩm đất đạt ${telemetryData.soil}%. Ngừng toàn bộ cấp nước để chống úng rễ.`
      });
    } else if (telemetryData.soil < 35 && (now - lastDrySoilAlert > 45000 || lastDrySoilAlert === 0)) {
      lastDrySoilAlert = now;
      pushAlertToFirebase({
        severity: 'WARN',
        title: 'Cảnh báo: Đất khô cằn',
        message: `Độ ẩm đất giảm xuống ${telemetryData.soil}% (< 35%). Cần cấp nước bổ sung.`
      });
    }

  } catch (err) {
    console.error('[FIREBASE] Loi ket noi mang toi Firebase:', err.message);
  }
}

async function markFirebaseOffline() {
  try {
    await fetch(`${FIREBASE_DB_URL}/garden/status.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online: false, lastHeartbeat: Date.now() })
    });
  } catch (err) {}
}

// Lang nghe lenh tu Web qua Firebase Cloud de chuyen xuong Wokwi
async function pollFirebaseCommands() {
  if (!wokwiClient || !isWokwiConnected) return;
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/garden/control.json`);
    if (res.ok) {
      const ctrl = await res.json();
      if (ctrl && ctrl.updatedAt && ctrl.updatedAt > lastCmdTime) {
        lastCmdTime = ctrl.updatedAt;
        console.log('[FIREBASE -> WOKWI] Nhan lenh tu Cloud:', ctrl);
        if (ctrl.mode) {
          const modeCmd = ctrl.mode === 'AUTO' ? 'a' : 'm';
          wokwiClient.write(modeCmd + '\n');
        }
        if (typeof ctrl.pump === 'boolean') {
          wokwiClient.write('p\n');
        }
        if (ctrl.emergencyStop) {
          wokwiClient.write('s\n');
        }
      }
    }
  } catch (err) {}
}
setInterval(pollFirebaseCommands, 1000);

let lastConfigTime = 0;
// Lang nghe cau hinh nguong tu Firebase Cloud de chuyen xuong Wokwi
async function pollFirebaseConfig() {
  if (!wokwiClient || !isWokwiConnected) return;
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/garden/config.json`);
    if (res.ok) {
      const cfg = await res.json();
      if (cfg && cfg.updatedAt && cfg.updatedAt > lastConfigTime) {
        lastConfigTime = cfg.updatedAt;
        console.log('[FIREBASE -> WOKWI] Nhan cau hinh nguong tu Cloud:', cfg);
        const dry = cfg.soilDry ?? 35;
        const wet = cfg.soilWet ?? 60;
        const rain = cfg.rainThreshold ?? 50;
        const maxSec = cfg.maxPumpSeconds ?? 20;
        const restSec = cfg.restCooldownSeconds ?? 10;
        const cmd = `c,${dry},${wet},${rain},${maxSec},${restSec}\n`;
        wokwiClient.write(cmd);
      }
    }
  } catch (err) {}
}
setInterval(pollFirebaseConfig, 1000);

// ============================================================================
// 2. KHOI TAO WEBSOCKET CHO LOCAL WEB DASHBOARD (ws://localhost:8080)
// ============================================================================
const wss = new WebSocketServer({ port: WS_PORT }, () => {
  console.log(`[BRIDGE] WebSocket Server dang lang nghe tai ws://localhost:${WS_PORT}`);
});

let browserSockets = new Set();

wss.on('connection', (ws) => {
  console.log('[BRIDGE] Web Dashboard da ket noi vao Bridge!');
  browserSockets.add(ws);

  // Gui trang thai song thuc te cho Web Dashboard
  ws.send(JSON.stringify({ type: 'status', connected: isWokwiAlive }));

  // Nhan lenh tu Web Dashboard (nhu 'a', 'm', 'p', 's' hoac goi tin cau hinh)
  ws.on('message', async (message) => {
    const raw = message.toString().trim();
    console.log(`[BRIDGE] Nhan lenh tu Web Local: "${raw}"`);

    try {
      if (raw.startsWith('{') && raw.endsWith('}')) {
        const parsed = JSON.parse(raw);
        if (parsed.type === 'config' && parsed.data) {
          const cfg = parsed.data;
          const dry = cfg.soilDry ?? 35;
          const wet = cfg.soilWet ?? 60;
          const rain = cfg.rainThreshold ?? 50;
          const maxSec = cfg.maxPumpSeconds ?? 20;
          const restSec = cfg.restCooldownSeconds ?? 10;
          const cmd = `c,${dry},${wet},${rain},${maxSec},${restSec}\n`;
          console.log(`[BRIDGE -> WOKWI] Gui lenh cau hinh nguong xuong ESP32: ${cmd.trim()}`);
          if (wokwiClient && isWokwiConnected) {
            wokwiClient.write(cmd);
          }
          // Cap nhat ngay len Firebase Cloud
          await fetch(`${FIREBASE_DB_URL}/garden/config.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...cfg, updatedAt: Date.now() })
          });
          return;
        }
      }
    } catch (e) {
      console.error('[BRIDGE] Loi xu ly goi tin cau hinh:', e.message);
    }

    if (wokwiClient && isWokwiConnected) {
      wokwiClient.write(raw + '\n');
    } else {
      console.log('[BRIDGE] Wokwi chua chay, khong the gui lenh.');
    }
  });

  ws.on('close', () => {
    browserSockets.delete(ws);
    console.log('[BRIDGE] Web Dashboard da ngat ket noi.');
  });
});

// Broadcast toi tat ca cac tab trinh duyet local
function broadcastToBrowsers(data) {
  const payload = JSON.stringify(data);
  for (const client of browserSockets) {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  }
}

// Watchdog Timer kiem tra liveness (neu > 10s khong co du lieu -> Wokwi da PAUSE/STOP)
setInterval(() => {
  const now = Date.now();
  if (isWokwiAlive && (now - lastDataTime > 10000)) {
    console.log('[BRIDGE] Phat hien Wokwi da Pause/Stop (khong co telemetry > 10s) -> Bao OFFLINE');
    isWokwiAlive = false;
    broadcastToBrowsers({ type: 'status', connected: false });
    markFirebaseOffline();
  }
}, 2000);

// ============================================================================
// 3. KET NOI TCP TOI WOKWI (PORT 4000)
// ============================================================================
function connectWokwi() {
  if (wokwiClient) {
    wokwiClient.destroy();
  }

  console.log(`[BRIDGE] Dang thu ket noi toi Wokwi tai localhost:${WOKWI_PORT}...`);
  wokwiClient = new net.Socket();

  wokwiClient.connect(WOKWI_PORT, '127.0.0.1', () => {
    console.log('[BRIDGE] >>> DA KET NOI VOI WOKWI QUA TCP 4000! <<<');
    isWokwiConnected = true;
    wokwiClient.write('s\n');
  });

  wokwiClient.on('data', (chunk) => {
    lastDataTime = Date.now();
    if (!isWokwiAlive) {
      isWokwiAlive = true;
      console.log('[BRIDGE] Nhan duoc tin hieu song tu Wokwi -> Bao ONLINE cho Web & Firebase');
      broadcastToBrowsers({ type: 'status', connected: true });
    }

    lineBuffer += chunk.toString('utf-8');
    const lines = lineBuffer.split(/\r?\n/);
    lineBuffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // In ra terminal
      console.log(`[WOKWI] ${trimmed}`);

      // Kiem tra dong TELEMETRY JSON
      if (trimmed.startsWith('TELEMETRY:')) {
        try {
          const jsonStr = trimmed.substring('TELEMETRY:'.length);
          const telemetryData = JSON.parse(jsonStr);

          // 1. Gui cho Web local
          broadcastToBrowsers({
            type: 'telemetry',
            data: telemetryData,
            raw: trimmed
          });

          // 2. Dong bo ngay len Firebase Cloud
          pushToFirebase(telemetryData);
        } catch (e) {
          console.error('[BRIDGE] Loi parse JSON:', e.message);
        }
      } else if (trimmed.includes('[INFO]') || trimmed.includes('[WARN]')) {
        broadcastToBrowsers({
          type: 'log',
          text: trimmed
        });

        // Tu dong chuyen canh bao tu Serial len Firebase
        if (trimmed.startsWith('[WARN]')) {
          const cleanMsg = trimmed.replace('[WARN]', '').trim();
          pushAlertToFirebase({
            severity: 'WARN',
            title: 'Cảnh báo thiết bị (ESP32)',
            message: cleanMsg
          });
        } else if (trimmed.includes('Mua lam do am dat tang') || trimmed.includes('Troi da tanh')) {
          const cleanMsg = trimmed.replace('[INFO]', '').trim();
          pushAlertToFirebase({
            severity: 'INFO',
            title: 'Sự kiện thời tiết',
            message: cleanMsg
          });
        }
      }
    }
  });

  wokwiClient.on('error', () => {
    isWokwiConnected = false;
    if (isWokwiAlive) {
      isWokwiAlive = false;
      broadcastToBrowsers({ type: 'status', connected: false });
      markFirebaseOffline();
    }
  });

  wokwiClient.on('close', () => {
    if (isWokwiConnected || isWokwiAlive) {
      console.log('[BRIDGE] Mat ket noi TCP voi Wokwi.');
      isWokwiConnected = false;
      isWokwiAlive = false;
      broadcastToBrowsers({ type: 'status', connected: false });
      markFirebaseOffline();
    }
    setTimeout(connectWokwi, 3000);
  });
}

// Bat dau ket noi
connectWokwi();
