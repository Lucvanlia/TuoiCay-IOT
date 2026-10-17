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

// ===================== NGUONG =====================
constexpr int SOIL_DRY = 35;                // < 35%  : dat kho -> AUTO bat bom
constexpr int SOIL_WET = 60;                // >= 60% : du am   -> tat bom
constexpr int RAIN_ON = 50, RAIN_OFF = 40;  // tre (hysteresis) chong nhap nhay
constexpr int RAIN_SOIL_RISE = 5;           // mua lam dat tang >= 5% -> thong bao
constexpr unsigned long PUMP_MAX_MS  = SIM ? 20000 : 60000;   // bom chay toi da 1 lan
constexpr unsigned long PUMP_REST_MS = SIM ? 10000 : 120000;  // nghi giua 2 lan tuoi AUTO
constexpr unsigned long SENSOR_MS = 500, DHT_MS = 2500, LCD_MS = 500, REPORT_MS = SIM ? 3000 : 15000;
// Wokwi relay NPN: GPIO HIGH -> COM-NO. Mach that dung Q1 NPN keo IN cua relay 5V active-low:
// GPIO HIGH -> Q1 dan -> IN LOW -> COM-NO. Ca hai deu active-HIGH tai GPIO26.
constexpr bool RELAY_ACTIVE_LOW = false;

// ===================== TRANG THAI =====================
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHTesp dht;

struct {
  int soil = 0, rain = 0;
  float temp = NAN, hum = NAN;
  bool raining = false;
} s;

bool autoMode = true, pumpOn = false, everStopped = false;
bool statusDirty = true;
unsigned long lastReportMs = 0;
unsigned long pumpStartMs = 0, pumpStopMs = 0;
int soilAtStart = 0, rainStartSoil = 0, rainNotifySoil = 0, lastSwitch = HIGH;
const char *startReason = "";

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
  logBuf[logHead] = {pumpStartMs / 1000, (now - pumpStartMs) / 1000, autoMode,
                     soilAtStart, s.soil, startReason, stopWhy};
  logHead = (logHead + 1) % LOG_SIZE;
  if (logCount < LOG_SIZE) logCount++;
}

void setPump(bool on, const char *reason) {
  if (on == pumpOn) return;
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
  if (isAuto == autoMode) return;
  setPump(false, "MODE_CHANGE");
  autoMode = isAuto;
  statusDirty = true;
  Serial.printf("[INFO] Che do: %s | nguon: %s\r\n", isAuto ? "AUTO" : "MANUAL", source);
}

void manualToggle(const char *source) {
  if (autoMode)   { Serial.printf("[WARN] %s: chuyen MANUAL de bom tay\r\n", source); return; }
  if (pumpOn)     { setPump(false, "MANUAL_OFF"); return; }
  if (s.raining)  { Serial.println("[WARN] Tu choi bat bom: dang mua"); return; }
  if (s.soil >= SOIL_WET) { Serial.println("[WARN] Tu choi bat bom: dat da du am"); return; }
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
    const bool ok = dht.getStatus() == DHTesp::ERROR_NONE;
    s.temp = ok ? d.temperature : NAN;
    s.hum = ok ? d.humidity : NAN;
  }
}

// Mua: chan bom + thong bao khi bat dau/het mua va khi mua lam do am dat tang
void updateRain() {
  const bool was = s.raining;
  if (!s.raining && s.rain >= RAIN_ON) s.raining = true;
  else if (s.raining && s.rain <= RAIN_OFF) s.raining = false;

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
  // 1) An toan - ap dung cho ca AUTO va MANUAL
  if (pumpOn) {
    if (s.raining)                                  setPump(false, "RAIN");
    else if (s.soil >= SOIL_WET)                    setPump(false, "SOIL_WET");
    else if (millis() - pumpStartMs >= PUMP_MAX_MS) setPump(false, "MAX_TIME");
  }
  // 2) AUTO: dat kho + khong mua + da nghi du -> bat bom
  const bool rested = !everStopped || millis() - pumpStopMs >= PUMP_REST_MS;
  if (autoMode && !pumpOn && !s.raining && s.soil < SOIL_DRY && rested) setPump(true, "AUTO_DRY");
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
  Serial.printf("TELEMETRY:{\"soil\":%d,\"rain\":%d,\"temp\":%s,\"hum\":%s,\"pump\":%s,\"mode\":\"%s\",\"raining\":%s}\r\n\r\n",
                s.soil, s.rain, isnan(s.temp) ? "null" : t, isnan(s.hum) ? "null" : h,
                pumpOn ? "true" : "false", autoMode ? "AUTO" : "MANUAL", s.raining ? "true" : "false");
  statusDirty = false;
  lastReportMs = millis();
}

void printHelp() {
  Serial.println("[INFO] LENH SERIAL");
  Serial.println("  a: AUTO | m: MANUAL | p: bat/tat bom tay");
  Serial.println("  s: trang thai | l: nhat ky | h: tro giup");
}

void handleSerial() {
  while (Serial.available()) {
    switch (tolower(Serial.read())) {
      case 'a': setMode(true, "SERIAL"); break;
      case 'm': setMode(false, "SERIAL"); break;
      case 'p': manualToggle("SERIAL"); break;
      case 's': report(); break;
      case 'l': printLog(); break;
      case 'h': printHelp(); break;
      default: break;  // bo qua \r \n va ky tu la
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
    const unsigned long left = run >= PUMP_MAX_MS ? 0 : (PUMP_MAX_MS - run) / 1000;
    snprintf(l2, sizeof l2, "%s BOM:ON %3lus", mode, left);
  } else if (isnan(s.temp)) {
    snprintf(l2, sizeof l2, "%s BOM:OFF --C", mode);
  } else {
    snprintf(l2, sizeof l2, "%s BOM:OFF %.0fC", mode, s.temp);
  }
  lcdLine(0, l1);
  lcdLine(1, l2);
}

// ===================== SETUP / LOOP =====================
void setup() {
  // Dat muc TAT truoc khi chuyen OUTPUT de relay khong giat luc khoi dong
  digitalWrite(PIN_RELAY, RELAY_ACTIVE_LOW ? HIGH : LOW);
  pinMode(PIN_RELAY, OUTPUT);
  digitalWrite(PIN_RELAY, RELAY_ACTIVE_LOW ? HIGH : LOW);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_MODE, INPUT);
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
