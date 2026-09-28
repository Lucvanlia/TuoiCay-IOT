# Nghiệm thu linh kiện trong Wokwi

Tài liệu này chỉ dành cho mạch mô phỏng. Sơ đồ đấu thiết bị thật, transistor, diode, cầu chì và nguồn nằm tại [PHAN_CUNG_THUC_TE.md](PHAN_CUNG_THUC_TE.md).

## Trạng thái dây

| Khối | Chân ESP32 | Mức hoạt động | Kết nối Wokwi |
|---|---:|---|---|
| Biến trở độ ẩm | GPIO34 | ADC; raw cao là đất khô | VCC 3V3, GND, SIG→34 |
| Công tắc mưa | GPIO27 | LOW là mưa | chân 1→3V3, chân 2→27, chân 3→GND, kéo lên 10k |
| Công tắc phao | GPIO33 | LOW là đủ nước | chân 1→GND, chân 2→33, chân 3→3V3, kéo lên 10k |
| STOP | GPIO32 | LOW khi nhấn | nút xuống GND, kéo lên 10k |
| MODE | GPIO18 | LOW khi nhấn | nút xuống GND, kéo lên 10k |
| WATER | GPIO19 | LOW khi nhấn | nút xuống GND, kéo lên 10k |
| RESUME | GPIO23 | LOW khi nhấn | nút xuống GND, kéo lên 10k |
| Relay mô phỏng | GPIO26 | HIGH là ON | GPIO26→IN trực tiếp; module đặt pnp |
| Tiếp điểm relay | COM/NO/NC | NO=bơm chạy, NC=bơm tắt | COM→5V; NO/NC qua hai điện trở 330Ω và LED |
| LED báo khóa | GPIO25 | HIGH là sáng | GPIO25→330Ω→A; C→GND |
| LCD I2C | GPIO21/22 | SDA/SCL | kéo lên 3V3 bằng 4,7k |

Relay module Wokwi đã có tầng transistor bên trong, nên GPIO26 nối trực tiếp tới IN. Khi lắp thật, không sao chép đoạn này: dùng tầng NPN 2,2k/10k, diode dập xung và nguồn/cầu chì trong tài liệu phần cứng.

Firmware còn bật INPUT_PULLUP như lớp dự phòng, nhưng các điện trở kéo lên ngoài vẫn có trên sơ đồ và bắt buộc khi lắp thật.

Hai chân bên phải của mỗi nút không cần thêm dây: 1.l nối sẵn với 1.r và 2.l nối sẵn với 2.r bên trong nút. Chế độ xray đã bật để thấy liên kết này. Các GPIO ESP32 không được khai báo trong Config.h phải để trống.

Để sơ đồ không tạo cảm giác điện trở bị treo, đầu dưới của từng trở kéo lên nối ngay vào chân tín hiệu tại nút/công tắc; trở SDA/SCL nối tại chân LCD. Đây là cùng một net với GPIO tương ứng, nhưng thể hiện rõ junction trên bản vẽ.

## Trình tự chạy

1. Nhấn Ctrl+Shift+B, chọn **Build Wokwi (Unicode-safe)** và đợi SUCCESS.
2. Kiểm tra hai file .firmware/build/esp32doit-devkit-v1/firmware.bin và .elf tồn tại.
3. Nhấn F1 → **Wokwi: Start Simulator**. Chờ hơn 3 giây rồi nhấn R.
4. Serial phải in ACK RESUME; LCD chuyển khỏi STOP_LATCH.

## Các trường hợp phải thử

| Ca | Thao tác | Kết quả bắt buộc |
|---|---|---|
| Boot an toàn | vừa khởi động, chưa nhấn R | relay/LED bơm tắt, LED đỏ sáng, STOP_LATCH |
| Đất khô AUTO | R, biến trở gần phía raw cao, đợi 10 giây | bơm chạy tối đa 5 giây |
| Đất ướt | xoay biến trở về raw thấp khi bơm chạy | bơm tắt tại ≥55%, trạng thái SOIL_WET |
| Mưa | gạt MƯA sang phải | bơm tắt ngay, RAIN_BLOCK; gạt trái vẫn chờ 10 giây |
| Cạn nước | gạt PHAO sang phải | bơm tắt và khóa, TANK_EMPTY; gạt lại phải nhấn R |
| STOP | nhấn S lúc bơm chạy | bơm tắt ngay, không tự chạy lại |
| MANUAL | nhấn M, rồi W | chỉ chạy 5 giây nếu an toàn và đất chưa quá ướt |
| Đổi mode giữa phiên | nhấn M khi đang tưới | bơm tắt, MODE_CHANGE |
| Cảm biến lỗi | đưa biến trở sát hai đầu làm raw ngoài 101..3999 | bơm tắt, SENSOR_FAULT, cần R sau khi hợp lệ |
| Giới hạn | lặp tưới | cooldown 10 giây trong simulation; tổng tối đa 60 giây/giờ |

[Kịch bản tự động core.test.yaml](../wokwi-scenarios/core.test.yaml) thử boot/rearm, MANUAL, WATER, STOP và AUTO đất khô khi có Wokwi CLI/token. Mưa và phao vẫn thử bằng hai công tắc vì slide-switch chưa có automation control chính thức.
