# BÁO CÁO KỊCH BẢN KIỂM THỬ HỆ THỐNG TƯỚI CÂY TỰ ĐỘNG

> Tài liệu này là bản báo cáo cũ và có các ô "ĐẠT" chưa được xác minh trong phiên Wokwi hiện tại. Dùng [ba ca kiểm thử Wokwi hiện hành](BA_KICH_BAN_TEST_WOKWI.md) để chạy và ghi bằng chứng mới.
**Đề tài:** Hệ thống tưới cây tự động qua Internet (Bản Demo ESP32 trên Wokwi & Phần cứng)
**Nhóm thực hiện:** Nhóm 2
**Nền tảng kiểm thử:** Wokwi Simulator trên VS Code / ESP32 DevKit V1

---

## I. TỔNG QUAN PHẦN CỨNG & KẾT NỐI KIỂM THỬ

| Linh kiện | Chân kết nối ESP32 | Chức năng trong mô phỏng Wokwi |
| :--- | :--- | :--- |
| **Biến trở Độ ẩm đất (`potSoil`)** | GPIO 34 (ADC1) | Mô phỏng cảm biến độ ẩm đất (0% - 100%) |
| **Biến trở Cảm biến mưa (`potRain`)** | GPIO 35 (ADC1) | Mô phỏng cảm biến mưa (0% - 100%) |
| **Cảm biến DHT22 (`dht1`)** | GPIO 19 | Đo nhiệt độ & độ ẩm không khí môi trường |
| **Màn hình LCD 1602 I2C (`lcd1`)** | SDA: GPIO 21, SCL: GPIO 22 | Hiển thị thông số thời gian thực (Đất, Mưa, Chế độ, Bơm) |
| **Công tắc gạt chế độ (`sw1`)** | GPIO 25 | Gạt đổi giữa **AUTO** (Tự động) và **MANUAL** (Thủ công) |
| **Nút nhấn bơm tay (`btn1`)** | GPIO 33 (INPUT_PULLUP) | Bật/tắt máy bơm thủ công khi ở chế độ MANUAL |
| **Relay điều khiển bơm (`relay1`)** | GPIO 26 | Đóng ngắt động cơ bơm nước (Wokwi: active-HIGH, `npn`) |
| **Động cơ bước mô phỏng bơm (`pump1`) + driver A4988 (`drvPump`)** | GPIO 18 → COM, NO → STEP | Wokwi không có motor DC/bơm: GPIO18 phát xung liên tục, relay đóng NO thì motor **QUAY = BƠM CHẠY**, relay nhả thì motor **ĐỨNG = BƠM TẮT**. Phần cứng thật thay bằng bơm DC qua NO. |
| **Đèn LED Đỏ cảnh báo (`led1`)** | GPIO 27 | Báo động: **CẢNH BÁO TRỜI ĐANG MƯA** |

---

## II. CHI TIẾT 3 KỊCH BẢN KIỂM THỬ CƠ BẢN

```
                       +-----------------------------+
                       | KHỞI ĐỘNG HỆ THỐNG (WOKWI)  |
                       | Đất = 50%, Mưa = 0%        |
                       | Bơm = TẮT (Motor ĐỨNG YÊN)  |
                       +--------------+--------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
+-------------------------------+                         +-------------------------------+
| KỊCH BẢN 1: TƯỚI TỰ ĐỘNG     |                         | KỊCH BẢN 2: TRỜI MƯA AN TOÀN  |
| - Vặn đất < 35% -> BƠM BẬT   |                         | - Vặn mưa >= 50% -> KHÓA BƠM  |
|   (Motor QUAY)                |                         |   (LED Đỏ SÁNG, Motor ĐỨNG)   |
| - Vặn đất >= 60% -> BƠM TẮT   |                         | - Đất tăng >= 5% do ngấm nước |
|   (Motor ĐỨNG)                |                         |   -> Báo "MƯA LÀM ĐẤT TĂNG"   |
+-------------------------------+                         +-------------------------------+
                                      |
                                      v
                       +-------------------------------+
                       | KỊCH BẢN 3: BƠM TAY & NHẬT KÝ |
                       | - Gạt sw1 -> MANUAL           |
                       | - Nhấn btn1 -> BƠM BẬT (Quay) |
                       | - Nhấn btn1 -> BƠM TẮT (Đứng) |
                       | - Gõ 'l' -> IN NHẬT KÝ RA RAM |
                       +-------------------------------+
```

---

### KỊCH BẢN 1: Kiểm thử Tưới tự động theo Độ ẩm đất (AUTO Mode)

* **Mục tiêu:** Kiểm tra khả năng tự động bật bơm khi đất thiếu nước (độ ẩm thấp) và tự động ngắt bơm khi đất đã đủ ẩm.
* **Điều kiện bắt đầu:**
  - Công tắc `sw1` đang gạt ở chế độ **AUTO** (hoặc gửi ký tự `a` qua Serial).
  - Biến trở `potRain` = 0% (trời không mưa).
  - Biến trở `potSoil` = 50% (bơm đang tắt, motor bơm đứng yên).

#### Các bước thực hiện:
1. **Bước 1.1 (Mô phỏng đất khô hạn):**
   - Dùng chuột xoay biến trở **`DO AM DAT`** ngược chiều kim đồng hồ xuống **dưới 35%** (ví dụ: đặt về mức 20%).
   - *Hiện tượng quan sát:*
     - Relay kích hoạt, phát tiếng cạch.
     - **Motor bơm `pump1` BẮT ĐẦU QUAY** (Máy bơm đang chạy).
     - Màn hình LCD dòng 2 hiển thị: `AUTO BOM:ON  20s` (hiển thị thời gian đếm lùi bảo vệ).
     - Serial Monitor xuất log:
       ```text
       [INFO] Bom BAT | ly do: dat kho | dat: 20%
       ```

2. **Bước 1.2 (Mô phỏng đất đã được tưới đủ nước):**
   - Xoay biến trở **`DO AM DAT`** theo chiều kim đồng hồ lên **trên 60%** (ví dụ: đặt về mức 65%).
   - *Hiện tượng quan sát:*
     - Relay ngắt.
     - **Motor bơm `pump1` DỪNG QUAY** (Máy bơm dừng lại).
     - Màn hình LCD dòng 2 trở về trạng thái: `AUTO BOM:OFF`.
     - Serial Monitor xuất log:
       ```text
       [INFO] Bom TAT | ly do: dat du am | dat: 65%
       ```

* **Kết luận Kịch bản 1:** **ĐẠT (PASS)** nếu bơm bật khi đất < 35% và tự tắt khi đất $\ge$ 60%.

---

### KỊCH BẢN 2: Cảm biến mưa – Chặn tưới khẩn cấp & Cảnh báo ngấm nước

* **Mục tiêu:**
  - Kiểm tra tính năng an toàn: khi có mưa, hệ thống lập tức khóa máy bơm để chống ngập úng và tiết kiệm điện/nước.
  - Kiểm tra tính năng thông minh: phát hiện nước mưa ngấm vào làm độ ẩm đất tăng lên và phát thông báo.
* **Điều kiện bắt đầu:**
  - Đất đang khô (20%) $\rightarrow$ Bơm đang bật (Motor đang quay).

#### Các bước thực hiện:
1. **Bước 2.1 (Phát hiện trời bắt đầu mưa):**
   - Xoay biến trở **`MUA`** lên mức cao **trên 50%** (ví dụ: đặt về 80%).
   - *Hiện tượng quan sát:*
     - **Đèn LED Đỏ Cảnh Báo BẬT SÁNG**.
     - Máy bơm lập tức bị ngắt khẩn cấp: **Motor bơm DỪNG QUAY**.
     - Màn hình LCD cập nhật: `MUA +0% BOM:OFF`.
     - Serial Monitor thông báo:
       ```text
       [WARN] Phat hien troi mua: 80% | tam dung tuoi
       [WARN] Bom TAT | ly do: troi mua | dat: 20%
       ```

2. **Bước 2.2 (Mô phỏng nước mưa ngấm làm đất tăng độ ẩm $\ge 5\%$):**
   - Giữ nguyên biến trở mưa, xoay từ từ biến trở **`DO AM DAT`** tăng từ 20% lên **30%** (tăng thêm 10%).
   - *Hiện tượng quan sát:*
     - Màn hình LCD cập nhật mức chênh lệch: `MUA +10% BOM:OFF`.
     - Serial Monitor lập tức bắn thông báo phát hiện độ ẩm đất tăng do mưa:
       ```text
       [INFO] Mua lam do am dat tang: 20% -> 30%
       ```

3. **Bước 2.3 (Trời tạnh mưa):**
   - Xoay biến trở **`MUA`** về mức thấp **dưới 40%** (ví dụ: về 0%).
   - *Hiện tượng quan sát:*
     - **Đèn LED Đỏ cảnh báo TẮT**.
     - Màn hình LCD trở về hiển thị nhiệt độ bình thường.
     - Serial Monitor báo trời tạnh và tổng kết mức nước mưa đã ngấm vào đất:
       ```text
       [INFO] Troi da tanh | dat: 30% (+10% trong con mua)
       ```

* **Kết luận Kịch bản 2:** **ĐẠT (PASS)** nếu trời mưa lập tức tắt bơm, đèn đỏ sáng, phát thông báo khi độ ẩm đất tăng và thông báo khi tạnh mưa.

---

### KỊCH BẢN 3: Tưới thủ công (MANUAL) & Xuất nhật ký tưới (RAM Log)

* **Mục tiêu:**
  - Kiểm tra khả năng can thiệp trực tiếp của con người qua nút nhấn phần cứng / lệnh Serial.
  - Kiểm tra tính năng lưu trữ và truy xuất lịch sử các lần tưới đã thực hiện.
* **Điều kiện bắt đầu:** Trời không mưa (`potRain` = 0%).

#### Các bước thực hiện:
1. **Bước 3.1 (Chuyển chế độ hoạt động sang Thủ công):**
   - Gạt công tắc **`sw1`** (hoặc gửi ký tự **`m`** trên Serial Monitor).
   - *Hiện tượng quan sát:*
     - Màn hình LCD dòng 2 đổi sang: `MAN  BOM:OFF`.
     - Serial Monitor in log: `[INFO] Che do: MANUAL | nguon: CONG TAC` (hoặc `SERIAL`).

2. **Bước 3.2 (Bật bơm bằng nút nhấn tay):**
   - Nhấn vào nút xanh lá **`BOM TAY`** (hoặc gửi ký tự **`p`** trên Serial).
   - *Hiện tượng quan sát:*
     - **Motor bơm QUAY** (Bơm chạy thủ công).
     - Màn hình LCD dòng 2 hiện: `MAN  BOM:ON`.
     - Serial Monitor in log:
       ```text
       [INFO] Bom BAT | ly do: bat tay | dat: 30%
       ```

3. **Bước 3.3 (Tắt bơm bằng nút nhấn tay):**
   - Nhấn nút xanh lá **`BOM TAY`** lần thứ hai (hoặc gửi ký tự **`p`**).
   - *Hiện tượng quan sát:*
     - **Motor bơm DỪNG** (Bơm tắt).
     - Màn hình LCD dòng 2 hiện: `MAN  BOM:OFF`.
     - Serial Monitor in log:
       ```text
       [INFO] Bom TAT | ly do: tat tay | dat: 30%
       ```

4. **Bước 3.4 (Truy xuất Nhật ký tưới):**
   - Tại ô nhập lệnh của Serial Monitor, gõ ký tự: **`l`** (chữ L thường) rồi nhấn **Enter**.
   - *Hiện tượng quan sát:*
     - Hệ thống xuất toàn bộ bảng lịch sử của các lần tưới từ trước đến nay:
       ```text
       [INFO] NHAT KY TUOI (cu -> moi)
         1. AUTO | bat luc 12s | chay 13s
            Dat: 20% -> 65% | dat kho -> dat du am
         2. AUTO | bat luc 32s | chay 3s
            Dat: 20% -> 20% | dat kho -> troi mua
         3. MANUAL | bat luc 60s | chay 8s
            Dat: 30% -> 30% | bat tay -> tat tay
       ```
     - Cột dữ liệu bao gồm: Thứ tự lần tưới, thời điểm bắt đầu, thời gian chạy (giây), chế độ (AUTO/MANUAL), độ ẩm đất trước và sau khi tưới, lý do bật và lý do dừng.

* **Kết luận Kịch bản 3:** **ĐẠT (PASS)** nếu nút bấm điều khiển bật/tắt bơm dứt khoát và lệnh `l` in ra đầy đủ lịch sử tưới.

---

## III. TÍNH NĂNG AN TOÀN BỔ SUNG (TIMEOUT PROTECTION)

- **Nguyên lý:** Nếu máy bơm đang chạy mà vì bất kỳ lý do gì cảm biến đất không tăng hoặc người dùng quên bấm tắt, sau **20 giây** (trên mô phỏng Wokwi) hoặc **60 giây** (trên mạch thực tế), hệ thống sẽ **tự động cưỡng bức ngắt bơm**.
- **Log xuất hiện trên Serial:**
  ```text
  [WARN] Bom TAT | ly do: qua thoi gian | dat: ...%
  ```
- **Ý nghĩa thực tế:** Bảo vệ chống cháy động cơ bơm, chống vỡ đường ống dẫn nước và chống cạn bồn chứa.

---

## IV. BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ (TEST MATRIX)

| STT | Tên kịch bản | Thao tác kích hoạt | Kết quả thực tế quan sát | Đánh giá |
| :---: | :--- | :--- | :--- | :---: |
| **KB-01** | Bơm tự động khi đất khô | Vặn `DO AM DAT` < 35% | Relay đóng, motor bơm quay, LCD hiện đếm lùi, Serial báo `AUTO_DRY` | **ĐẠT** |
| **KB-02** | Ngắt tự động khi đất đủ ẩm | Vặn `DO AM DAT` $\ge$ 60% | Relay nhả, motor bơm dừng, LCD báo `BOM:OFF`, Serial báo `SOIL_WET` | **ĐẠT** |
| **KB-03** | Chặn tưới khi trời mưa | Vặn `MUA` $\ge$ 50% | LED Đỏ sáng, bơm ngắt ngay lập tức, Serial báo `RAIN` | **ĐẠT** |
| **KB-04** | Cảnh báo mưa ngấm vào đất | Giữ mưa, tăng `DO AM DAT` $\ge 5\%$ | LCD hiện `MUA +X%`, Serial bắn thông báo `MUA LAM DO AM DAT TANG` | **ĐẠT** |
| **KB-05** | Tạnh mưa trở lại bình thường | Vặn `MUA` $\le$ 40% | LED Đỏ tắt, Serial báo `TROI DA TANH` kèm tổng mức nước mưa | **ĐẠT** |
| **KB-06** | Điều khiển bơm bằng nút tay | Gạt `MANUAL`, nhấn `btn1` | Bơm bật/tắt dứt khoát theo từng lần nhấn nút | **ĐẠT** |
| **KB-07** | Xem nhật ký lịch sử tưới | Gõ lệnh `l` vào Serial | In bảng 10 lần tưới gần nhất với đầy đủ thời gian và lý do | **ĐẠT** |
| **KB-08** | Ngắt an toàn quá thời gian | Để bơm chạy quá 20s | Bơm tự ngắt an toàn với lý do `MAX_TIME` | **ĐẠT** |

---

## V. CHECKLIST TRÌNH BÀY & QUAY VIDEO DEMO NỘP BÀI

1. [ ] **Thiết lập giao diện:** Chia đôi màn hình: bên trái là cửa sổ mô phỏng Wokwi, bên phải là cửa sổ Serial Monitor (baudrate 115200).
2. [ ] **Giới thiệu tổng quan (15s):** Chỉ vào các cảm biến (Đất, Mưa, DHT22), công tắc, nút bấm, đèn báo và màn hình LCD.
3. [ ] **Thực hiện Kịch bản 1 (30s):** Vặn biến trở đất khô $\rightarrow$ Bơm chạy (motor quay). Vặn đất ẩm $\rightarrow$ Bơm ngắt (motor dừng).
4. [ ] **Thực hiện Kịch bản 2 (40s):** Bật bơm $\rightarrow$ Vặn mưa $\rightarrow$ Bơm dừng, LED đỏ sáng. Nhích biến trở đất $\rightarrow$ Show dòng chữ thông báo trên Serial. Vặn hết mưa $\rightarrow$ LED đỏ tắt.
5. [ ] **Thực hiện Kịch bản 3 (30s):** Gạt sang MANUAL $\rightarrow$ Bấm nút bật/tắt bơm $\rightarrow$ Gõ chữ `l` trên bàn phím để hiển thị bảng **Nhật ký tưới**.
