# HƯỚNG DẪN LẮP RÁP PHẦN CỨNG & HIỆU CHUẨN MẠCH TƯỚI CÂY IOT

> Tài liệu hướng dẫn chi tiết dành cho bạn khi linh kiện thực tế được giao về, giúp bạn tự tin đấu nối dây thành công ngay lần đầu tiên mà không bị chập cháy hay lỗi reset bo mạch.

---

## 1. Danh sách linh kiện cần chuẩn bị

| STT | Tên linh kiện | Thông số khuyến nghị | Vai trò |
| :---: | :--- | :--- | :--- |
| **1** | **Kit ESP32** | ESP32 DOIT DevKit V1 (30 chân) hoặc NodeMCU-32S | Bộ vi điều khiển trung tâm (Core) |
| **2** | **Cảm biến độ ẩm đất** | Cảm biến điện dung **Capacitive Soil Moisture v1.2** (màu đen) | Đo độ ẩm đất (chống ăn mòn, bền hơn loại chân cắm mạ chì) |
| **3** | **Cảm biến phát hiện mưa** | Module mạch so sánh LM393 + Tấm mạch cảm biến giọt nước (chọn chân **AO**) | Phát hiện lượng mưa rơi |
| **4** | **Cảm biến nhiệt ẩm** | **DHT22** (AM2302) hoặc DHT11 | Đo nhiệt độ và độ ẩm không khí |
| **5** | **Module Relay 1 kênh** | Relay 5V có opto cách ly quang (Active-LOW) | Công tắc kích nguồn đóng/ngắt máy bơm |
| **6** | **Màn hình LCD1602 + I2C** | LCD 16x2 đã hàn sẵn mạch chuyển tiếp I2C Backpack (địa chỉ mặc định `0x27`) | Hiển thị thông số thời gian thực |
| **7** | **Máy bơm nước mini** | Máy bơm chìm mini DC 5V hoặc 12V (kèm ống dẫn nước 6-8mm) | Bơm nước tưới cây |
| **8** | **Nguồn cấp điện** | Adapter 5V / 2A (hoặc Adapter 12V kèm mạch hạ áp Buck LM2596 ra 5V) | Cấp nguồn ổn định cho toàn mạch |
| **9** | **Linh kiện phụ trợ** | - 1 Diode **1N4007** (dập xung ngược motor)<br>- 1 Nút nhấn nhả (bơm tay)<br>- 1 Công tắc gạt 2 chân (chế độ AUTO/MAN)<br>- 1 LED đỏ 5mm + Điện trở 220Ω (báo mưa)<br>- Dây cắm breadboard đực-cái, đực-đực | Đấu nối và tương tác tại chỗ |

---

## 2. Bảng đấu nối chân chi tiết (Pinout Mapping)

> ⚠️ **Quy tắc vàng**:
> - Chân **3V3** của ESP32 chỉ dùng cấp cho các cảm biến tín hiệu analog (Độ ẩm đất, Mưa).
> - Chân **VIN** (hoặc 5V) lấy nguồn từ Adapter 5V cấp cho Relay và LCD1602.
> - **Tất cả các chân GND phải nối chung với nhau (Common Ground)**.

| Tên Module | Chân trên Module | Chân kết nối trên ESP32 / Nguồn | Ghi chú quan trọng |
| :--- | :--- | :--- | :--- |
| **Cảm biến đất điện dung** | **VCC**<br>**GND**<br>**AOUT (AO)** | **3V3** (ESP32)<br>**GND** (ESP32)<br>**GPIO 34** (ADC1_CH6) | Cấp nguồn 3.3V để ngõ ra điện áp an toàn cho ADC ESP32 (0 - 3.3V). |
| **Cảm biến mưa LM393** | **VCC**<br>**GND**<br>**AO** (Analog Out)<br>*DO* | **3V3** (ESP32)<br>**GND** (ESP32)<br>**GPIO 35** (ADC1_CH7)<br>*Bỏ trống (không nối)* | Lấy tín hiệu analog chân AO để đo lượng mưa %. Chân DO không dùng. |
| **Cảm biến DHT22** | **VCC** (chân 1)<br>**DATA** (chân 2)<br>**GND** (chân 4) | **3V3** hoặc **5V**<br>**GPIO 19**<br>**GND** | Nối thêm điện trở kéo lên 4.7kΩ hoặc 10kΩ giữa chân DATA và VCC nếu module chưa có sẵn. |
| **Màn hình LCD1602 I2C** | **GND**<br>**VCC**<br>**SDA**<br>**SCL** | **GND**<br>**VIN (5V)**<br>**GPIO 21**<br>**GPIO 22** | Chỉnh biến trở vi chỉnh màu xanh sau lưng LCD nếu màn hình sáng nhưng chữ bị mờ. |
| **Module Relay 5V** | **DC+ (VCC)**<br>**DC- (GND)**<br>**IN** | **VIN (5V)**<br>**GND**<br>**GPIO 26** | Relay có cách ly quang, điều khiển an toàn qua GPIO 26. |
| **Công tắc AUTO / MAN** | **Chân 1**<br>**Chân 2** | **GPIO 25**<br>**GND** | Gạt đóng về GND = MANUAL; Hở = AUTO (dùng kéo lên nội bộ). |
| **Nút nhấn BƠM TAY** | **Chân 1**<br>**Chân 2** | **GPIO 33**<br>**GND** | Nhấn nhả kích bơm tay trong chế độ MANUAL. |
| **LED Đỏ báo mưa** | **Anode (+, chân dài)**<br>**Cathode (-, chân ngắn)** | Nối qua trở **220Ω** vào **GPIO 27**<br>**GND** | Sáng lên khi phát hiện mưa. |

---

## 3. Sơ đồ mạch cấp nguồn & Đấu nối máy bơm an toàn

Máy bơm là tải cảm kháng (Inductive Load). Khi ngắt relay, cuộn dây máy bơm sẽ sinh ra dòng cảm ứng ngược (Back-EMF) có thể làm sụt áp nguồn khiến ESP32 bị reset bất ngờ (Brownout Reset). Hãy làm theo sơ đồ sau:

```
[ Nguồn Adapter 5V / 2A ]
     │
     ├─── (+) 5V ──────┬─────> ESP32 chân VIN
     │                 ├─────> Relay chân VCC
     │                 ├─────> LCD1602 chân VCC
     │                 │
     │                 └─────> Tiếp điểm Relay [COM]
     │                                    │
     │                               Relay [NO] (Thường mở)
     │                                    │
     │                         ┌──────────┴──────────┐
     │                         │ (+) Dây đỏ Máy Bơm  │
     │                         │                     │
     │                     [Diode 1N4007]       [MÁY BƠM DC]
     │                     (Vạch bạc ở PUMP+)        │
     │                         │                     │
     │                         │ (-) Dây đen Máy Bơm │
     │                         └──────────┬──────────┘
     │                                    │
     └─── (-) GND ─────┬──────────────────┴──────────> Nối chung MASS (STAR-GND)
                       ├─────> ESP32 chân GND
                       ├─────> Relay chân GND
                       └─────> LCD chân GND
```

> 💡 **Mẹo cực kỳ hữu ích:**
> - Hàn 1 con diode **1N4007** song song trực tiếp tại 2 đầu dây máy bơm:
>   - Đầu có vạch trắng bạc (Cathode) nối vào dây **DƯƠNG (+)** của máy bơm.
>   - Đầu còn lại (Anode) nối vào dây **ÂM (-)** của máy bơm.
> - Việc này giúp triệt tiêu 100% tia lửa điện tại tiếp điểm relay và chống sụt áp nguồn bảo vệ vi điều khiển ESP32!

---

## 4. Cách hiệu chuẩn độ ẩm đất thực tế (Calibration)

Cảm biến độ ẩm đất điện dung v1.2 khi cắm vào đất thật sẽ xuất giá trị ADC (0 - 4095) khác với biến trở ảo trên Wokwi:
- **Trong không khí khô cong (Đất 0%):** Cảm biến đọc giá trị ADC khoảng `3000` đến `3200`.
- **Khi nhúng đầu cảm biến ngập vào cốc nước (Đất 100%):** Cảm biến đọc giá trị ADC khoảng `1200` đến `1400`.

### Cách kiểm tra đo đạc thực tế:
1. Mở Serial Monitor với tốc độ **115200 baud**.
2. Để cảm biến khô ngoài không khí: Ghi nhận số ADC thô.
3. Nhúng cảm biến vào cốc nước (chỉ nhúng phần lưỡi cắm màu trắng, không nhúng phần vi mạch linh kiện): Ghi nhận số ADC thô.
4. Mở file [src/main.cpp](file:///d:/HeThongTuoiTuDong/TuoiCayThongMinh/src/main.cpp) dòng 35:
   ```cpp
   constexpr int SOIL_RAW_DRY = SIM ? 0 : 3000, SOIL_RAW_WET = SIM ? 4095 : 1200;
   ```
   Điền số đo thực tế của bạn vào mốc `3000` và `1200` là xong!

---

## 5. Quy trình nạp code xuống bo mạch thật

Khi cắm cáp USB nối ESP32 với máy tính:
1. Kiểm tra cổng COM trong Device Manager (ví dụ `COM3` hoặc `COM5`).
2. Mở terminal tại thư mục dự án và chạy lệnh sau để nạp firmware bản phần cứng:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/build.ps1 -Environment hardware -Upload -Port COM3
   ```
   *(Thay `COM3` bằng cổng COM thực tế của máy tính bạn)*
3. Sau khi nạp xong:
   - LCD sẽ sáng và hiển thị `TUOI CAY IOT` -> `DANG KHOI DONG..` -> `Dat xx% Mua xx%`.
   - Mở giao diện Web **[https://iot-garden-2cb4e.web.app](https://iot-garden-2cb4e.web.app)**: Bạn có thể cài đặt ngưỡng kích hoạt, thời gian bơm và giám sát đồ thị từ điện thoại hoặc máy tính một cách mượt mà!
