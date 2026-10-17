// ============================================================================
// WOKWI & ESP32 SERIAL -> WEBSOCKET LOCAL BRIDGE
// Ket noi TCP port 4000 cua Wokwi va phat WebSocket ws://localhost:8080
// Ho tro Heartbeat Watchdog tu dong nhan biet Wokwi PAUSE/STOP
// ============================================================================

const net = require('net');
const path = require('path');
const { WebSocketServer } = require(path.join(__dirname, '../web/node_modules/ws'));

const WOKWI_PORT = 4000;
const WS_PORT = 8080;

let lastDataTime = 0;
let isWokwiAlive = false;
let isWokwiConnected = false;
let wokwiClient = null;
let lineBuffer = '';

// 1. Khoi tao WebSocket Server cho trinh duyet Web Dashboard
const wss = new WebSocketServer({ port: WS_PORT }, () => {
  console.log(`[BRIDGE] WebSocket Server dang lang nghe tai ws://localhost:${WS_PORT}`);
});

let browserSockets = new Set();

wss.on('connection', (ws) => {
  console.log('[BRIDGE] Web Dashboard da ket noi vao Bridge!');
  browserSockets.add(ws);

  // Gui trang thai song thuc te (Watchdog liveness) cho Web Dashboard
  ws.send(JSON.stringify({ type: 'status', connected: isWokwiAlive }));

  // Nhan lenh tu Web Dashboard (nhu 'a', 'm', 'p', 's') va gui xuong Wokwi
  ws.on('message', (message) => {
    const cmd = message.toString().trim();
    console.log(`[BRIDGE] Nhan lenh tu Web: "${cmd}"`);
    if (wokwiClient && isWokwiConnected) {
      wokwiClient.write(cmd + '\n');
    } else {
      console.log('[BRIDGE] Wokwi chua chay, khong the gui lenh.');
    }
  });

  ws.on('close', () => {
    browserSockets.delete(ws);
    console.log('[BRIDGE] Web Dashboard da ngat ket noi.');
  });
});

// Broadcast toi tat ca cac tab trinh duyet
function broadcastToBrowsers(data) {
  const payload = JSON.stringify(data);
  for (const client of browserSockets) {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  }
}

// Watchdog Timer kiem tra liveness (neu > 4.5s khong co du lieu -> Wokwi da PAUSE/STOP)
setInterval(() => {
  const now = Date.now();
  if (isWokwiAlive && (now - lastDataTime > 4500)) {
    console.log('[BRIDGE] Phat hien Wokwi da Pause/Stop (khong co telemetry > 4.5s) -> Báo OFFLINE');
    isWokwiAlive = false;
    broadcastToBrowsers({ type: 'status', connected: false });
  }
}, 1500);

// 2. Ket noi TCP toi Wokwi (RFC2217 port 4000)
function connectWokwi() {
  if (wokwiClient) {
    wokwiClient.destroy();
  }

  console.log(`[BRIDGE] Dang thu ket noi toi Wokwi tai localhost:${WOKWI_PORT}...`);
  wokwiClient = new net.Socket();

  wokwiClient.connect(WOKWI_PORT, '127.0.0.1', () => {
    console.log('[BRIDGE] >>> DA KET NOI VOI WOKWI QUA TCP 4000! <<<');
    isWokwiConnected = true;
  });

  wokwiClient.on('data', (chunk) => {
    lastDataTime = Date.now();
    if (!isWokwiAlive) {
      isWokwiAlive = true;
      console.log('[BRIDGE] Nhan duoc tin hieu song tu Wokwi -> Bao ONLINE cho Web');
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
          broadcastToBrowsers({
            type: 'telemetry',
            data: telemetryData,
            raw: trimmed
          });
        } catch (e) {
          console.error('[BRIDGE] Loi parse JSON:', e.message);
        }
      } else if (trimmed.includes('[INFO]') || trimmed.includes('[WARN]')) {
        broadcastToBrowsers({
          type: 'log',
          text: trimmed
        });
      }
    }
  });

  wokwiClient.on('error', () => {
    isWokwiConnected = false;
    if (isWokwiAlive) {
      isWokwiAlive = false;
      broadcastToBrowsers({ type: 'status', connected: false });
    }
  });

  wokwiClient.on('close', () => {
    if (isWokwiConnected || isWokwiAlive) {
      console.log('[BRIDGE] Mat ket noi TCP voi Wokwi.');
      isWokwiConnected = false;
      isWokwiAlive = false;
      broadcastToBrowsers({ type: 'status', connected: false });
    }
    setTimeout(connectWokwi, 3000);
  });
}

// Bat dau ket noi
connectWokwi();
