#include <LiquidCrystal.h>
#include <DHTesp.h>

// =====================================================
// KHAI BÁO CHÂN
// =====================================================

// DHT22
const int DHT_PIN = 19;

// Potentiometer mô phỏng cảm biến mưa
const int RAIN_PIN = 35;

// Điều khiển chế độ
const int MODE_SWITCH_PIN = 25;
const int MANUAL_BUTTON_PIN = 33;

// Thiết bị đầu ra
const int RELAY_PIN = 26;
const int PUMP_LED_PIN = 27;

// LCD 1602: RS, E, D4, D5, D6, D7
LiquidCrystal lcd(13, 14, 16, 17, 18, 23);

// DHT22
DHTesp dhtSensor;

// =====================================================
// NGƯỠNG HOẠT ĐỘNG
// =====================================================

const float DRY_HUMIDITY = 45.0;   // Dưới 45%: không khí khô
const float STOP_HUMIDITY = 55.0;  // Từ 55%: dừng bơm
const int RAIN_THRESHOLD = 50;     // Từ 50%: xem là trời mưa

// Relay Module trong Wokwi mặc định kích ở mức LOW
const int RELAY_ON = LOW;
const int RELAY_OFF = HIGH;

// =====================================================
// BIẾN TRẠNG THÁI
// =====================================================

float temperature = 0;
float humidity = 0;
int rainPercent = 0;

bool sensorValid = false;
bool pumpState = false;
bool autoMode = true;
bool previousMode = true;
bool previousRainState = false;

// Thời gian đọc cảm biến
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 2000;

// Thời gian cập nhật LCD
unsigned long lastLcdUpdate = 0;
const unsigned long LCD_INTERVAL = 500;

// Chống dội nút nhấn
int lastButtonReading = HIGH;
int stableButtonState = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_DELAY = 50;

// =====================================================
// HÀM ĐIỀU KHIỂN BƠM
// =====================================================

void setPump(bool state, const char *reason) {
  // Chỉ ghi nhật ký khi trạng thái thay đổi
  if (pumpState == state) {
    return;
  }

  pumpState = state;

  digitalWrite(RELAY_PIN, pumpState ? RELAY_ON : RELAY_OFF);
  digitalWrite(PUMP_LED_PIN, pumpState ? HIGH : LOW);

  Serial.println();
  Serial.println("===== NHAT KY TUOI =====");
  Serial.print("Thoi gian: ");
  Serial.print(millis() / 1000);
  Serial.println(" giay");

  Serial.print("Bom: ");
  Serial.println(pumpState ? "BAT" : "TAT");

  Serial.print("Ly do: ");
  Serial.println(reason);

  Serial.println("========================");
}

// =====================================================
// ĐỌC CẢM BIẾN
// =====================================================

void readSensors() {
  if (millis() - lastSensorRead < SENSOR_INTERVAL) {
    return;
  }

  lastSensorRead = millis();

  // Đọc DHT22
  TempAndHumidity data = dhtSensor.getTempAndHumidity();

  if (!isnan(data.temperature) && !isnan(data.humidity)) {
    temperature = data.temperature;
    humidity = data.humidity;
    sensorValid = true;
  } else {
    sensorValid = false;
    Serial.println("Loi: Khong doc duoc DHT22");
  }

  // Đọc cảm biến mưa mô phỏng
  int rainRaw = analogRead(RAIN_PIN);

  rainPercent = map(rainRaw, 0, 4095, 0, 100);
  rainPercent = constrain(rainPercent, 0, 100);

  Serial.println();
  Serial.println("----- DU LIEU CAM BIEN -----");

  if (sensorValid) {
    Serial.print("Nhiet do: ");
    Serial.print(temperature, 1);
    Serial.println(" C");

    Serial.print("Do am khong khi: ");
    Serial.print(humidity, 1);
    Serial.println(" %");
  }

  Serial.print("Muc mua: ");
  Serial.print(rainPercent);
  Serial.println(" %");

  Serial.print("Che do: ");
  Serial.println(autoMode ? "AUTO" : "MANUAL");

  Serial.print("Bom: ");
  Serial.println(pumpState ? "ON" : "OFF");

  Serial.println("---------------------------");
}

// =====================================================
// XỬ LÝ CẢM BIẾN MƯA
// =====================================================

void checkRainNotification() {
  bool raining = rainPercent >= RAIN_THRESHOLD;

  if (raining && !previousRainState) {
    Serial.println();
    Serial.println("CANH BAO: PHAT HIEN TROI MUA");
    Serial.println("He thong se dung bom.");
    Serial.println("Do am khong khi co xu huong tang.");
  }

  if (!raining && previousRainState) {
    Serial.println();
    Serial.println("THONG BAO: TROI DA NGUNG MUA");
  }

  previousRainState = raining;
}

// =====================================================
// CHẾ ĐỘ TỰ ĐỘNG
// =====================================================

void handleAutoMode() {
  if (!sensorValid) {
    setPump(false, "Loi cam bien DHT22");
    return;
  }

  // Trường hợp 2: Trời mưa
  if (rainPercent >= RAIN_THRESHOLD) {
    setPump(false, "Phat hien troi mua");
    return;
  }

  // Trường hợp 1: Trời khô
  if (humidity < DRY_HUMIDITY) {
    setPump(true, "Khong khi kho, bat bom tu dong");
    return;
  }

  // Độ ẩm đã tăng đủ thì tắt bơm
  if (humidity >= STOP_HUMIDITY) {
    setPump(false, "Do am da dat nguong");
  }

  // Khoảng 45–55% giữ nguyên trạng thái để relay
  // không bật/tắt liên tục.
}

// =====================================================
// CHẾ ĐỘ THỦ CÔNG
// =====================================================

void handleManualMode() {
  int buttonReading = digitalRead(MANUAL_BUTTON_PIN);

  if (buttonReading != lastButtonReading) {
    lastDebounceTime = millis();
  }

  if (millis() - lastDebounceTime > DEBOUNCE_DELAY) {
    if (buttonReading != stableButtonState) {
      stableButtonState = buttonReading;

      // Nút nối GPIO33 với GND nên nhấn = LOW
      if (stableButtonState == LOW) {
        if (pumpState) {
          setPump(false, "Nguoi dung tat bom thu cong");
        } else {
          setPump(true, "Nguoi dung bat bom thu cong");
        }
      }
    }
  }

  lastButtonReading = buttonReading;
}

// =====================================================
// HIỂN THỊ LCD
// =====================================================

void printLcdLine(int row, String content) {
  // Giới hạn LCD còn đúng 16 ký tự
  if (content.length() > 16) {
    content = content.substring(0, 16);
  }

  // Thêm khoảng trắng để xóa nội dung cũ
  while (content.length() < 16) {
    content += " ";
  }

  lcd.setCursor(0, row);
  lcd.print(content);
}

void updateLcd() {
  if (millis() - lastLcdUpdate < LCD_INTERVAL) {
    return;
  }

  lastLcdUpdate = millis();

  if (!sensorValid) {
    printLcdLine(0, "LOI DHT22");
    printLcdLine(1, "KIEM TRA DAY");
    return;
  }

  String line1 = "T:";
  line1 += String(temperature, 1);
  line1 += "C H:";
  line1 += String(humidity, 0);
  line1 += "%";

  printLcdLine(0, line1);

  String line2;

  if (!autoMode) {
    line2 = "MAN R:";
    line2 += String(rainPercent);
    line2 += "% P:";
    line2 += pumpState ? "ON" : "OFF";
  } else if (rainPercent >= RAIN_THRESHOLD) {
    line2 = "MUA:";
    line2 += String(rainPercent);
    line2 += "% BOM:OFF";
  } else if (pumpState) {
    line2 = "AUTO KHO BOM:ON";
  } else {
    line2 = "AUTO BOM:OFF";
  }

  printLcdLine(1, line2);
}

// =====================================================
// SETUP
// =====================================================

void setup() {
  Serial.begin(115200);

  // DHT22
  dhtSensor.setup(DHT_PIN, DHTesp::DHT22);

  // Input
  pinMode(RAIN_PIN, INPUT);
  pinMode(MODE_SWITCH_PIN, INPUT);
  pinMode(MANUAL_BUTTON_PIN, INPUT_PULLUP);

  // Tắt bơm trước khi chuyển chân sang OUTPUT để relay không
  // kích thoáng qua trong lúc khởi động.
  digitalWrite(RELAY_PIN, RELAY_OFF);
  digitalWrite(PUMP_LED_PIN, LOW);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(PUMP_LED_PIN, OUTPUT);

  // LCD
  lcd.begin(16, 2);
  lcd.clear();

  printLcdLine(0, "SMART IRRIGATION");
  printLcdLine(1, "DANG KHOI DONG");

  delay(1500);
  lcd.clear();

  // Đọc vị trí công tắc ban đầu
  autoMode = digitalRead(MODE_SWITCH_PIN) == HIGH;
  previousMode = autoMode;

  Serial.println("HE THONG TUOI CAY DA KHOI DONG");
}

// =====================================================
// LOOP
// =====================================================

void loop() {
  // Đọc công tắc chọn chế độ
  autoMode = digitalRead(MODE_SWITCH_PIN) == HIGH;

  // Khi vừa chuyển chế độ
  if (autoMode != previousMode) {
    setPump(false, "Chuyen che do hoat dong");

    Serial.print("DA CHUYEN SANG CHE DO: ");
    Serial.println(autoMode ? "AUTO" : "MANUAL");

    previousMode = autoMode;
  }

  readSensors();
  checkRainNotification();

  if (autoMode) {
    handleAutoMode();
  } else {
    handleManualMode();
  }

  updateLcd();
}
