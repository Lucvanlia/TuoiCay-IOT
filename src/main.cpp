/*
 * HE THONG TUOI CAY TU DONG - BAN DEMO (Wokwi + phan cung that)
 * ---------------------------------------------------------------
 * Cam bien : Do am dat (GPIO34), Cam bien mua (GPIO35), DHT22 (GPIO19)
 * Dau ra   : Relay bom (GPIO26), LED canh bao mua (GPIO27), LCD1602 I2C (SDA21/SCL22)
 *            Wokwi: GPIO18 phat xung STEP -> relay COM -> NO -> A4988 -> stepper (mo phong may bom)
 * Dau vao  : Cong tac AUTO/MANUAL (GPIO25), Nut bom tay (GPIO33)
 * Lenh Serial (sau nay map 1:1 sang MQTT):
 *   a = AUTO, m = MANUAL, p = bat/tat bom (MANUAL), s = trang thai, l = nhat ky, h = tro giup
 */
#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHTesp.h>
#include <string.h>
#include <Preferences.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "secrets.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
#include <freertos/semphr.h>

#ifndef IRRIGATION_SIMULATION
#define IRRIGATION_SIMULATION 1
#endif
constexpr bool SIM = IRRIGATION_SIMULATION != 0;

// ===================== CHAN =====================
constexpr uint8_t PIN_SOIL = 34, PIN_RAIN = 35, PIN_DHT = 19;
constexpr uint8_t PIN_MODE = 25, PIN_BTN = 33;
constexpr uint8_t PIN_RELAY = 26, PIN_LED = 27;
// Chi dung tren Wokwi: Wokwi khong co motor DC/bom nen dung stepper + A4988 thay the.
// GPIO18 chi phat xung khi bom BAT; relay COM-NO la lop chan xung thu hai.
// Phan cung that: bo chan nay, relay NO dong nguon rieng cho bom DC.
constexpr uint8_t PIN_PUMP_SIM = 18;
constexpr uint32_t PUMP_SIM_HZ = 100;  // 100 buoc/s = 0.5 vong/s (2s quay 1 vong, mat de quan sat ro rang)

// ===================== HIEU CHUAN =====================
// Wokwi: bien tro 0..4095 -> 0..100%.
// That : cam bien dat dien dung (kho ~3000, uot ~1200), module mua AO (kho 4095, uot ~1000) -> PHAI DO LAI.
constexpr int SOIL_RAW_DRY = SIM ? 0 : 3000, SOIL_RAW_WET = SIM ? 4095 : 1200;
constexpr int RAIN_RAW_DRY = SIM ? 0 : 4095, RAIN_RAW_WET = SIM ? 4095 : 1000;

// ===================== NGUONG DONG (LUU NVS PREFERENCES) =====================
int soilDry = 35;                // < 35%  : dat kho -> AUTO bat bom
int soilWet = 60;                // >= 60% : du am   -> tat bom
int rainThreshold = 50;          // >= 50% : phat hien mua -> khoa bom
constexpr int RAIN_SOIL_RISE = 5;           // mua lam dat tang >= 5% -> thong bao
unsigned long pumpMaxMs  = SIM ? 20000 : 60000;   // bom chay toi da 1 lan
unsigned long pumpRestMs = SIM ? 10000 : 120000;  // nghi giua 2 lan tuoi AUTO
constexpr unsigned long SENSOR_MS = 500, DHT_MS = 2500, LCD_MS = 500, REPORT_MS = SIM ? 3000 : 15000;
// Wokwi relay NPN: GPIO HIGH -> COM-NO. Mach that dung Q1 NPN keo IN cua relay 5V active-low:
// GPIO HIGH -> Q1 dan -> IN LOW -> COM-NO. Ca hai deu active-HIGH tai GPIO26.
constexpr bool RELAY_ACTIVE_LOW = false;
Preferences prefs;

// ===================== TRANG THAI =====================
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHTesp dht;

struct {
  int soil = 0, rain = 0;
  float temp = NAN, hum = NAN;
  bool raining = false;
} s;

bool autoMode = true, pumpOn = false, everStopped = false, isEmergencyStopped = false;
bool statusDirty = true;
unsigned long lastReportMs = 0;
unsigned long pumpStartMs = 0, pumpStopMs = 0;
int soilAtStart = 0, rainStartSoil = 0, rainNotifySoil = 0, lastSwitch = HIGH;
const char *startReason = "";

void setPump(bool on, const char *reason);
void setEmergencyStop(bool stop, const char *source);

// Nhat ky tuoi: vong dem 10 lan gan nhat (RAM). Sau nay day len cloud de luu lich su.
struct LogEntry {
  unsigned long startS, durS;
  bool isAuto;
  int soilBefore, soilAfter;
  const char *startWhy, *stopWhy;
};
constexpr int LOG_SIZE = 10;
LogEntry logBuf[LOG_SIZE];
int logHead = 0, logCount = 0;

// FreeRTOS Handles (Giao tiep an toan giua cac task)
QueueHandle_t logQueue = NULL;
SemaphoreHandle_t pumpMutex = NULL;

// ===================== BOM & NHAT KY =====================
const char *reasonText(const char *code) {
  if (!strcmp(code, "AUTO_DRY")) return "dat kho";
  if (!strcmp(code, "SOIL_WET")) return "dat du am";
  if (!strcmp(code, "RAIN")) return "troi mua";
  if (!strcmp(code, "MAX_TIME")) return "qua thoi gian";
  if (!strcmp(code, "MANUAL_ON")) return "bat tay";
  if (!strcmp(code, "MANUAL_OFF")) return "tat tay";
  if (!strcmp(code, "MODE_CHANGE")) return "doi che do";
  return code;
}

void setSimPumpPulses(bool on) {
  if (!SIM) return;
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(PIN_PUMP_SIM, on ? 128 : 0);
#else
  ledcWrite(0, on ? 128 : 0);
#endif
}

void addLog(unsigned long now, const char *stopWhy) {
  LogEntry entry = {pumpStartMs / 1000, (now - pumpStartMs) / 1000, autoMode,
                    soilAtStart, s.soil, startReason, stopWhy};
  logBuf[logHead] = entry;
  logHead = (logHead + 1) % LOG_SIZE;
  if (logCount < LOG_SIZE) logCount++;

  // Day vao FreeRTOS Queue de Network Task tren Core 0 xu ly gui len Cloud
  if (logQueue != NULL) {
    xQueueSend(logQueue, &entry, 0); // Non-blocking send
  }
}

void setEmergencyStop(bool stop, const char *source) {
  if (stop == isEmergencyStopped) return;
  isEmergencyStopped = stop;
  if (stop) {
    setPump(false, "EMERGENCY_STOP");
    Serial.printf("[WARN] %s: KHOA DUNG KHAN CAP (STOP)!\r\n", source);
  } else {
    Serial.printf("[INFO] %s: GO KHOA KHAN CAP (RESUME).\r\n", source);
  }
  statusDirty = true;
}

void setPump(bool on, const char *reason) {
  if (on && isEmergencyStopped) {
    Serial.println("[WARN] Tu choi bat bom: He thong dang bi KHOA KHAN CAP!");
    return;
  }

  // Khoa Mutex tranh xung dot khi ca loopTask va safetyTask cung tac dong bom
  if (pumpMutex && xSemaphoreTake(pumpMutex, pdMS_TO_TICKS(50)) != pdTRUE) {
    return;
  }

  if (on == pumpOn) {
    if (pumpMutex) xSemaphoreGive(pumpMutex);
    return;
  }
  const unsigned long now = millis();
  if (!on) setSimPumpPulses(false);  // chan xung truoc khi relay mo
  pumpOn = on;
  digitalWrite(PIN_RELAY, (on != RELAY_ACTIVE_LOW) ? HIGH : LOW);
  if (on) setSimPumpPulses(true);
  if (on) {
    pumpStartMs = now; soilAtStart = s.soil; startReason = reason;
  } else {
    pumpStopMs = now; everStopped = true; addLog(now, reason);
  }
  statusDirty = true;
  Serial.printf("[%s] Bom %s | ly do: %s | dat: %d%%\r\n",
                (!on && (!strcmp(reason, "RAIN") || !strcmp(reason, "MAX_TIME"))) ? "WARN" : "INFO",
                on ? "BAT" : "TAT", reasonText(reason), s.soil);

  if (pumpMutex) xSemaphoreGive(pumpMutex);
}

void printLog() {
  Serial.println("[INFO] NHAT KY TUOI (cu -> moi)");
  if (!logCount) Serial.println("  Chua co lan tuoi nao.");
  for (int i = 0; i < logCount; i++) {
    const LogEntry &e = logBuf[(logHead - logCount + i + LOG_SIZE) % LOG_SIZE];
    Serial.printf("  %d. %s | bat luc %lus | chay %lus\r\n", i + 1,
                  e.isAuto ? "AUTO" : "MANUAL", e.startS, e.durS);
    Serial.printf("     Dat: %d%% -> %d%% | %s -> %s\r\n",
                  e.soilBefore, e.soilAfter, reasonText(e.startWhy), reasonText(e.stopWhy));
  }
  Serial.println();
}

// ===================== CHE DO & DIEU KHIEN TAY =====================
void setMode(bool isAuto, const char *source) {
  if (isAuto == autoMode) {
    Serial.printf("[INFO] Che do hien tai da la %s roi (%s)\r\n", isAuto ? "AUTO" : "MANUAL", source);
    return;
  }
  setPump(false, "MODE_CHANGE");
  autoMode = isAuto;
  statusDirty = true;
  Serial.printf("[INFO] Che do: %s | nguon: %s\r\n", isAuto ? "AUTO" : "MANUAL", source);
}

void manualToggle(const char *source) {
  if (isEmergencyStopped) { Serial.printf("[WARN] %s: Tu choi bat bom: He thong dang bi KHOA KHAN CAP!\r\n", source); return; }
  if (autoMode)   { Serial.printf("[WARN] %s: chuyen MANUAL de bom tay\r\n", source); return; }
  if (pumpOn)     { setPump(false, "MANUAL_OFF"); return; }
  if (s.raining)  { Serial.println("[WARN] Tu choi bat bom: dang mua"); return; }
  if (s.soil >= soilWet) { Serial.println("[WARN] Tu choi bat bom: dat da du am"); return; }
  setPump(true, "MANUAL_ON");
}

// ===================== CAM BIEN =====================
int readPercent(uint8_t pin, int rawLow, int rawHigh) {
  long sum = 0;
  for (int i = 0; i < 8; i++) sum += analogRead(pin);  // trung binh 8 mau cho do nhieu
  return constrain(map(sum / 8, rawLow, rawHigh, 0, 100), 0, 100);
}

void readSensors() {
  static unsigned long lastRead = 0, lastDht = 0;
  const unsigned long now = millis();
  if (now - lastRead >= SENSOR_MS) {
    lastRead = now;
    s.soil = readPercent(PIN_SOIL, SOIL_RAW_DRY, SOIL_RAW_WET);
    s.rain = readPercent(PIN_RAIN, RAIN_RAW_DRY, RAIN_RAW_WET);
  }
  if (now - lastDht >= DHT_MS) {  // DHT22 can >= 2s giua 2 lan doc
    lastDht = now;
    TempAndHumidity d = dht.getTempAndHumidity();
    static uint8_t dhtFailures = 0;
    if (dht.getStatus() == DHTesp::ERROR_NONE) {
      s.temp = d.temperature;
      s.hum = d.humidity;
      dhtFailures = 0;
    } else {
      // Neu chi bi nhieu 1-2 nhip (dac thu cua chuan 1-wire DHT), giu gia tri hop le gan nhat
      // Chi bao mat tin hieu neu loi lien tiep >= 5 lan (~12s)
      if (++dhtFailures >= 5) {
        s.temp = NAN;
        s.hum = NAN;
      }
    }
  }
}

// Mua: chan bom + thong bao khi bat dau/het mua va khi mua lam do am dat tang
void updateRain() {
  const bool was = s.raining;
  if (!s.raining && s.rain >= rainThreshold) s.raining = true;
  else if (s.raining && s.rain <= (rainThreshold - 10)) s.raining = false;

  if (s.raining && !was) {
    rainStartSoil = rainNotifySoil = s.soil;
    statusDirty = true;
    Serial.printf("[WARN] Phat hien troi mua: %d%% | tam dung tuoi\r\n", s.rain);
  }
  if (s.raining && s.soil >= rainNotifySoil + RAIN_SOIL_RISE) {
    Serial.printf("[INFO] Mua lam do am dat tang: %d%% -> %d%%\r\n", rainStartSoil, s.soil);
    rainNotifySoil = s.soil;
  }
  if (!s.raining && was) {
    statusDirty = true;
    Serial.printf("[INFO] Troi da tanh | dat: %d%% (%+d%% trong con mua)\r\n", s.soil, s.soil - rainStartSoil);
  }
  digitalWrite(PIN_LED, s.raining ? HIGH : LOW);
}

// ===================== LOGIC TUOI =====================
void control() {
  if (isEmergencyStopped) return;

  // 1) An toan - ap dung cho ca AUTO va MANUAL
  if (pumpOn) {
    if (s.raining)                                  setPump(false, "RAIN");
    else if (s.soil >= soilWet)                     setPump(false, "SOIL_WET");
    else if (millis() - pumpStartMs >= pumpMaxMs)   setPump(false, "MAX_TIME");
  }
  // 2) AUTO: dat kho + khong mua + da nghi du -> bat bom
  const bool rested = !everStopped || millis() - pumpStopMs >= pumpRestMs;
  if (autoMode && !pumpOn && !s.raining && s.soil < soilDry && rested) setPump(true, "AUTO_DRY");
}

// ===================== CAP NHAT NGUONG (TU DONG DONG BO NVS) =====================
void applyConfig(int dry, int wet, int rain, int maxSec, int restSec) {
  if (dry < 5) dry = 5;
  if (dry > 90) dry = 90;
  if (wet <= dry) wet = dry + 5;
  if (wet > 95) wet = 95;
  if (rain < 10) rain = 10;
  if (rain > 90) rain = 90;
  if (maxSec < 5) maxSec = 5;
  if (maxSec > 300) maxSec = 300;
  if (restSec < 2) restSec = 2;
  if (restSec > 600) restSec = 600;

  soilDry = dry;
  soilWet = wet;
  rainThreshold = rain;
  pumpMaxMs = (unsigned long)maxSec * 1000UL;
  pumpRestMs = (unsigned long)restSec * 1000UL;

  prefs.putInt("soilDry", soilDry);
  prefs.putInt("soilWet", soilWet);
  prefs.putInt("rainOn", rainThreshold);
  prefs.putULong("pumpMax", pumpMaxMs);
  prefs.putULong("pumpRest", pumpRestMs);

  Serial.printf("[INFO] Da cap nhat nguong NVS: Dat kho <%d%%, Du am >=%d%%, Mua >=%d%%, Max bom %lus, Nghi %lus\r\n",
                soilDry, soilWet, rainThreshold, pumpMaxMs / 1000, pumpRestMs / 1000);

  // Kiem tra an toan ngay lap tuc sau khi doi nguong:
  if (pumpOn && s.soil >= soilWet) {
    setPump(false, "SOIL_WET");
  } else if (autoMode && !pumpOn && !s.raining && s.soil < soilDry) {
    setPump(true, "AUTO_DRY");
  }

  statusDirty = true;
}

// ===================== NUT / CONG TAC / SERIAL =====================
void readInputs() {
  // Cong tac: chi xu ly khi gat (canh), de lenh tu xa (Serial/MQTT) van doi duoc che do
  static int sampledSwitch = HIGH;
  static unsigned long switchChangedAt = 0;
  const int sw = digitalRead(PIN_MODE);
  if (sw != sampledSwitch) { sampledSwitch = sw; switchChangedAt = millis(); }
  if (sw != lastSwitch && millis() - switchChangedAt > 30) {
    lastSwitch = sw;
    Serial.printf("[INFO] Cong tac GPIO25: %s -> %s\r\n",
                  sw == HIGH ? "HIGH" : "LOW", sw == HIGH ? "AUTO" : "MAN");
    setMode(sw == HIGH, "CONG TAC");
  }

  // Nut nhan: chong doi 50ms, nhan = LOW
  static int lastRead = HIGH, stable = HIGH;
  static unsigned long changedAt = 0;
  const int r = digitalRead(PIN_BTN);
  if (r != lastRead) { lastRead = r; changedAt = millis(); }
  if (millis() - changedAt > 50 && r != stable) {
    stable = r;
    if (stable == LOW) manualToggle("NUT NHAN");
  }
}

void report() {
  char t[12] = "--", h[12] = "--";
  if (!isnan(s.temp)) snprintf(t, sizeof t, "%.1f", s.temp);
  if (!isnan(s.hum)) snprintf(h, sizeof h, "%.1f", s.hum);
  Serial.printf("\r\n[INFO] TRANG THAI | %lus\r\n", millis() / 1000);
  Serial.printf("  Dat: %d%% | Mua: %d%% (%s)\r\n", s.soil, s.rain, s.raining ? "DANG MUA" : "KHONG MUA");
  Serial.printf("  Nhiet do: %s C | Do am KK: %s%%\r\n", t, h);
  Serial.printf("  Che do: %s | Bom: %s\r\n", autoMode ? "AUTO" : "MANUAL", pumpOn ? "BAT" : "TAT");
  Serial.printf("  Nguong hien tai: Dat kho <%d%%, Du am >=%d%%, Mua >=%d%%, Max bom %lus, Nghi %lus\r\n",
                soilDry, soilWet, rainThreshold, pumpMaxMs / 1000, pumpRestMs / 1000);
  Serial.printf("TELEMETRY:{\"soil\":%d,\"rain\":%d,\"temp\":%s,\"hum\":%s,\"pump\":%s,\"mode\":\"%s\",\"raining\":%s,\"cfg\":{\"soilDry\":%d,\"soilWet\":%d,\"rain\":%d,\"maxPump\":%lu,\"rest\":%lu}}\r\n\r\n",
                s.soil, s.rain, isnan(s.temp) ? "null" : t, isnan(s.hum) ? "null" : h,
                pumpOn ? "true" : "false", autoMode ? "AUTO" : "MANUAL", s.raining ? "true" : "false",
                soilDry, soilWet, rainThreshold, pumpMaxMs / 1000, pumpRestMs / 1000);
  statusDirty = false;
  lastReportMs = millis();
}

void printHelp() {
  Serial.println("[INFO] LENH SERIAL");
  Serial.println("  a: AUTO | m: MANUAL | p: bat/tat bom tay");
  Serial.println("  s: trang thai | l: nhat ky | h: tro giup");
  Serial.println("  c,<dry>,<wet>,<rain>,<maxSec>,<restSec>: cai dat nguong (VD: c,10,20,50,20,10)");
}

void processSerialCommand(const String &cmd) {
  if (cmd.equalsIgnoreCase("a")) { setMode(true, "SERIAL"); return; }
  if (cmd.equalsIgnoreCase("m")) { setMode(false, "SERIAL"); return; }
  if (cmd.equalsIgnoreCase("p")) { manualToggle("SERIAL"); return; }
  if (cmd.equalsIgnoreCase("s")) { report(); return; }
  if (cmd.equalsIgnoreCase("l")) { printLog(); return; }
  if (cmd.equalsIgnoreCase("h")) { printHelp(); return; }

  // Format lenh nguong ngan gon: c,10,20,50,20,10
  if (cmd.startsWith("c,") || cmd.startsWith("C,")) {
    int dry = 0, wet = 0, rain = 0, maxSec = 0, restSec = 0;
    if (sscanf(cmd.c_str() + 2, "%d,%d,%d,%d,%d", &dry, &wet, &rain, &maxSec, &restSec) >= 2) {
      if (rain <= 0) rain = rainThreshold;
      if (maxSec <= 0) maxSec = pumpMaxMs / 1000;
      if (restSec <= 0) restSec = pumpRestMs / 1000;
      applyConfig(dry, wet, rain, maxSec, restSec);
      return;
    }
  }

  // Format lenh nguong JSON: CFG:{"soilDry":10,"soilWet":20,...}
  if (cmd.startsWith("CFG:") || cmd.startsWith("cfg:")) {
    int dry = soilDry, wet = soilWet, rain = rainThreshold;
    int maxSec = pumpMaxMs / 1000, restSec = pumpRestMs / 1000;
    int idx;
    if ((idx = cmd.indexOf("\"soilDry\":")) >= 0) dry = cmd.substring(idx + 10).toInt();
    if ((idx = cmd.indexOf("\"soilWet\":")) >= 0) wet = cmd.substring(idx + 10).toInt();
    if ((idx = cmd.indexOf("\"rainThreshold\":")) >= 0) rain = cmd.substring(idx + 16).toInt();
    if ((idx = cmd.indexOf("\"maxPumpSeconds\":")) >= 0) maxSec = cmd.substring(idx + 17).toInt();
    else if ((idx = cmd.indexOf("\"maxPump\":")) >= 0) maxSec = cmd.substring(idx + 10).toInt();
    if ((idx = cmd.indexOf("\"restCooldownSeconds\":")) >= 0) restSec = cmd.substring(idx + 22).toInt();
    else if ((idx = cmd.indexOf("\"rest\":")) >= 0) restSec = cmd.substring(idx + 7).toInt();

    applyConfig(dry, wet, rain, maxSec, restSec);
    return;
  }
}

String serialBuffer = "";

void handleSerial() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\r' || c == '\n') {
      serialBuffer.trim();
      if (serialBuffer.length() > 0) {
        processSerialCommand(serialBuffer);
      }
      serialBuffer = "";
    } else {
      // Neu chua co chuoi lenh dai va nhan phim lenh 1 ky tu -> thuc thi ngay lap tuc
      if (serialBuffer.length() == 0 && strchr("aAmMpPsSlLhH", c)) {
        String singleCmd = "";
        singleCmd += c;
        processSerialCommand(singleCmd);
      } else if (serialBuffer.length() < 120) {
        serialBuffer += c;
      }
    }
  }
}

// ===================== LCD =====================
void lcdLine(uint8_t row, const char *text) {
  char buf[17];
  snprintf(buf, sizeof buf, "%-16s", text);
  lcd.setCursor(0, row);
  lcd.print(buf);
}

void updateLcd() {
  static unsigned long last = 0;
  if (millis() - last < LCD_MS) return;
  last = millis();

  char l1[17], l2[17];
  snprintf(l1, sizeof l1, "Dat%3d%% Mua%3d%%", s.soil, s.rain);
  const char *mode = autoMode ? "AUTO" : "MAN ";
  if (s.raining) {
    snprintf(l2, sizeof l2, "MUA:KHOA BOM:OFF");
  } else if (pumpOn) {
    const unsigned long run = millis() - pumpStartMs;
    const unsigned long left = run >= pumpMaxMs ? 0 : (pumpMaxMs - run) / 1000;
    snprintf(l2, sizeof l2, "%s BOM:ON %3lus", mode, left);
  } else if (isnan(s.temp)) {
    snprintf(l2, sizeof l2, "%s BOM:OFF --C", mode);
  } else {
    snprintf(l2, sizeof l2, "%s BOM:OFF %.0fC", mode, s.temp);
  }
  lcdLine(0, l1);
  lcdLine(1, l2);
}

// ===================== FREERTOS NETWORK & FIREBASE CLOUD TASK (CORE 0) =====================
static unsigned long lastHandledControlTime = 0;

void syncFirebaseTelemetry(WiFiClientSecure &client) {
  if (WiFi.status() != WL_CONNECTED) return;

  // 1. Cap nhat Heartbeat Status (Online)
  HTTPClient https;
  https.setTimeout(2500);
  String url = "https://" + String(system_secrets::FIREBASE_HOST) + "/garden/status.json";
  if (https.begin(client, url)) {
    https.addHeader("Content-Type", "application/json");
    https.PATCH("{\"online\":true,\"lastHeartbeat\":{\".sv\":\"timestamp\"}}");
    https.end();
  }

  // 2. Cap nhat Telemetry
  url = "https://" + String(system_secrets::FIREBASE_HOST) + "/garden/telemetry.json";
  if (https.begin(client, url)) {
    https.addHeader("Content-Type", "application/json");

    char tempBuf[12] = "null", humBuf[12] = "null";
    if (!isnan(s.temp)) snprintf(tempBuf, sizeof(tempBuf), "%.1f", s.temp);
    if (!isnan(s.hum)) snprintf(humBuf, sizeof(humBuf), "%.1f", s.hum);

    char payload[360];
    snprintf(payload, sizeof(payload),
             "{\"soil\":%d,\"rain\":%d,\"temp\":%s,\"hum\":%s,\"pump\":%s,\"mode\":\"%s\",\"isStopped\":%s,\"raining\":%s,\"tankOk\":true,\"rssi\":%d,\"ip\":\"%s\",\"updatedAt\":{\".sv\":\"timestamp\"}}",
             s.soil, s.rain, tempBuf, humBuf,
             pumpOn ? "true" : "false",
             autoMode ? "AUTO" : "MANUAL",
             isEmergencyStopped ? "true" : "false",
             s.raining ? "true" : "false",
             WiFi.RSSI(),
             WiFi.localIP().toString().c_str());

    https.PUT(payload);
    https.end();
  }
}

void checkFirebaseCommands(WiFiClientSecure &client) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient https;
  https.setTimeout(2000);
  String url = "https://" + String(system_secrets::FIREBASE_HOST) + "/garden/control.json";
  if (https.begin(client, url)) {
    int code = https.GET();
    if (code == 200) {
      String json = https.getString();
      int idx = json.indexOf("\"updatedAt\":");
      if (idx >= 0) {
        String tsStr = "";
        for (int i = idx + 12; i < json.length(); i++) {
          char c = json.charAt(i);
          if (c >= '0' && c <= '9') tsStr += c;
          else if (tsStr.length() > 0) break;
        }
        unsigned long cmdTime = 0;
        if (tsStr.length() >= 10) {
          cmdTime = tsStr.substring(0, 10).toInt();
        }

        if (cmdTime > lastHandledControlTime) {
          lastHandledControlTime = cmdTime;
          Serial.printf("[NET-TASK] Nhan lenh tu Firebase Cloud: %s\r\n", json.c_str());

          if (json.indexOf("\"emergencyStop\":true") >= 0) {
            setEmergencyStop(true, "FIREBASE_WEB");
          } else if (json.indexOf("\"emergencyStop\":false") >= 0) {
            setEmergencyStop(false, "FIREBASE_WEB");
          }

          if (json.indexOf("\"mode\":\"AUTO\"") >= 0) {
            setMode(true, "FIREBASE_WEB");
          } else if (json.indexOf("\"mode\":\"MANUAL\"") >= 0) {
            setMode(false, "FIREBASE_WEB");
          }

          if (!autoMode && !isEmergencyStopped) {
            if (json.indexOf("\"pump\":true") >= 0) {
              setPump(true, "FIREBASE_WEB");
            } else if (json.indexOf("\"pump\":false") >= 0) {
              setPump(false, "FIREBASE_WEB");
            }
          }
        }
      }
    }
    https.end();
  }
}

void sendFirebaseIrrigationLog(WiFiClientSecure &client, const LogEntry &entry) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient https;
  https.setTimeout(3000);
  String url = "https://" + String(system_secrets::FIREBASE_HOST) + "/garden/irrigationLog.json";
  if (https.begin(client, url)) {
    https.addHeader("Content-Type", "application/json");
    char logPayload[256];
    snprintf(logPayload, sizeof(logPayload),
             "{\"mode\":\"%s\",\"durationSeconds\":%lu,\"soilBefore\":%d,\"soilAfter\":%d,\"startReason\":\"%s\",\"stopReason\":\"%s\",\"timestamp\":{\".sv\":\"timestamp\"}}",
             entry.isAuto ? "AUTO" : "MANUAL",
             entry.durS, entry.soilBefore, entry.soilAfter,
             reasonText(entry.startWhy), reasonText(entry.stopWhy));
    int httpCode = https.POST(logPayload);
    Serial.printf("[NET-TASK] <<< Ghi nhat ky tuoi len Firebase Cloud: Code %d\r\n", httpCode);
    https.end();
  }
}

void networkTask(void *pvParameters) {
  Serial.printf("[NET-TASK] Khoi tao tren Core %d (Priority %d, Stack 12288B)\r\n",
                xPortGetCoreID(), uxTaskPriorityGet(NULL));

  const char *ssid = SIM ? "Wokwi-GUEST" : system_secrets::WIFI_SSID;
  const char *pass = SIM ? "" : system_secrets::WIFI_PASS;
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, pass);
  Serial.printf("[NET-TASK] Dang khoi tao WiFi: %s (%s) ...\r\n", ssid, SIM ? "Wokwi Virtual" : "Hardware 2.4GHz");

  unsigned long lastTelemetrySent = 0;
  unsigned long lastControlChecked = 0;

  WiFiClientSecure client;
  client.setInsecure(); // Disable SSL cert check for speed & low RAM overhead

  for (;;) {
    // 1. Kiem tra nhat ky tuoi tu Core 1 qua Queue
    LogEntry entry;
    if (logQueue != NULL && xQueueReceive(logQueue, &entry, pdMS_TO_TICKS(100)) == pdPASS) {
      sendFirebaseIrrigationLog(client, entry);
    }

    const unsigned long now = millis();

    // 2. Dinh ky gui Telemetry va Heartbeat len Firebase moi 2.5 giay
    if (WiFi.status() == WL_CONNECTED && now - lastTelemetrySent >= 2500) {
      lastTelemetrySent = now;
      syncFirebaseTelemetry(client);
    }

    // 3. Dinh ky kiem tra lenh dieu khien tu Web Dashboard moi 2 giay
    if (WiFi.status() == WL_CONNECTED && now - lastControlChecked >= 2000) {
      lastControlChecked = now;
      checkFirebaseCommands(client);
    }

    // 4. LUON NGU NHUONG LOI: vTaskDelay giup IDLE0 reset watchdog
    vTaskDelay(pdMS_TO_TICKS(150));
  }
}

// ===================== FREERTOS EMERGENCY SAFETY TASK (CORE 1) =====================
// Theo video 3DIOT (Phan 3):
// - Viec quan trong nhat (ngat bom khan cap) dat muc uu tien cao nhat (Priority 3).
// - Quy tac vang: Task uu tien cao BAT BUOC phai ngu nhieu nhat (vTaskDelay 20ms)
//   de khong lam chet doi (starvation) cac task khac nhu loopTask (Priority 1).
void emergencySafetyTask(void *pvParameters) {
  Serial.printf("[SAFETY-TASK] Khoi tao tren Core %d (Priority %d - Khan cap)\r\n",
                xPortGetCoreID(), uxTaskPriorityGet(NULL));
  for (;;) {
    if (pumpOn) {
      const unsigned long runTime = millis() - pumpStartMs;
      if (runTime >= pumpMaxMs) {
        setPump(false, "MAX_TIME");
        Serial.println("[SAFETY-TASK (Priority 3)] Preemption! Ngat bom khan cap do chay qua gio.");
      } else if (s.raining) {
        setPump(false, "RAIN");
        Serial.println("[SAFETY-TASK (Priority 3)] Preemption! Ngat bom khan cap do troi mua.");
      }
    }
    // Ngu 20ms: 1 giay chi thuc 50 lan, 99.8% thoi gian tra loi cho loopTask
    vTaskDelay(pdMS_TO_TICKS(20));
  }
}

// ===================== SETUP / LOOP =====================
void setup() {
  // Dat muc TAT truoc khi chuyen OUTPUT de relay khong giat luc khoi dong
  digitalWrite(PIN_RELAY, RELAY_ACTIVE_LOW ? HIGH : LOW);
  pinMode(PIN_RELAY, OUTPUT);
  digitalWrite(PIN_RELAY, RELAY_ACTIVE_LOW ? HIGH : LOW);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_MODE, INPUT_PULLUP);
  pinMode(PIN_BTN, INPUT_PULLUP);

  if (SIM) {  // LEDC san sang nhung duty 0: bom OFF khong co xung STEP
#if ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcAttach(PIN_PUMP_SIM, PUMP_SIM_HZ, 8);
    ledcWrite(PIN_PUMP_SIM, 0);
#else
    ledcSetup(0, PUMP_SIM_HZ, 8);
    ledcAttachPin(PIN_PUMP_SIM, 0);
    ledcWrite(0, 0);
#endif
  }

  Serial.begin(115200);

  // Khoi tao NVS Preferences va load nguong da luu
  prefs.begin("garden", false);
  soilDry = prefs.getInt("soilDry", 35);
  soilWet = prefs.getInt("soilWet", 60);
  rainThreshold = prefs.getInt("rainOn", 50);
  pumpMaxMs = prefs.getULong("pumpMax", SIM ? 20000 : 60000);
  pumpRestMs = prefs.getULong("pumpRest", SIM ? 10000 : 120000);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcdLine(0, "TUOI CAY IOT");
  lcdLine(1, "DANG KHOI DONG..");
  dht.setup(PIN_DHT, DHTesp::DHT22);
  delay(2500);  // lan doc dau co ca DHT22 trong khoi trang thai khoi dong

  lastSwitch = digitalRead(PIN_MODE);
  autoMode = lastSwitch == HIGH;
  readSensors();
  Serial.printf("\r\n[INFO] He thong san sang | %s\r\n", SIM ? "WOKWI" : "PHAN CUNG");
  Serial.printf("[INFO] Nguong hoat dong: Dat kho <%d%%, Du am >=%d%%, Mua >=%d%%, Max bom %lus, Nghi %lus\r\n",
                soilDry, soilWet, rainThreshold, pumpMaxMs / 1000, pumpRestMs / 1000);

  // ===================== KHOI TAO FREERTOS =====================
  // 1. Khoi tao Mutex va Queue FreeRTOS (Giao tiep an toan giua cac task)
  pumpMutex = xSemaphoreCreateMutex();
  logQueue = xQueueCreate(LOG_SIZE, sizeof(LogEntry));

  // 2. Tao Network Task tren Core 0 (Priority 1, Stack 12288 bytes)
  xTaskCreatePinnedToCore(
      networkTask,
      "netTask",
      12288,
      NULL,
      1,
      NULL,
      0  // Ghim vao Core 0
  );

  // 3. Tao Emergency Safety Task tren Core 1 (Priority 3, Stack 2048 bytes)
  xTaskCreatePinnedToCore(
      emergencySafetyTask,
      "safetyTask",
      2048,
      NULL,
      3, // Priority 3: Cao hon loopTask (Priority 1)
      NULL,
      1  // Ghim vao Core 1
  );

  report();
}

void loop() {
  readInputs();
  handleSerial();
  readSensors();
  updateRain();
  control();
  updateLcd();

  if (statusDirty || millis() - lastReportMs >= REPORT_MS) report();
}
