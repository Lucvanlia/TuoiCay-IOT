# Biên bản kiểm thử firmware và tài liệu

Ngày: 28/09/2026. Không có thiết bị thật kết nối trong đợt kiểm tra này. Những mục chưa chạy được ghi riêng để không nhầm build/test C++ với nghiệm thu điện.

## Kiểm thử đã chạy

| Kiểm tra | Kết quả |
|---|---|
| Build PlatformIO: `esp32doit-devkit-v1`, `hardware`, `hardware-nodemcu32s` | **PASS: 3/3** sau sửa mạch, 31 giây nhờ cache; không upload |
| Tài liệu và cấu trúc mạch | Script kiểm tra Markdown, chân bắt buộc, trị số điện trở, logic relay, SVG và JSON tasks; số lượng hiện tại được in khi chạy |
| Tệp Wokwi | **PASS:** `firmware.bin` và `firmware.elf` được tham chiếu trong `wokwi.toml` đã tồn tại |
| Controller C++ trên PC, dùng trực tiếp `include/Controller.h` | **PASS: 800.055 kiểm tra, 0 lỗi** |
| 12 ca chức năng nền | Boot khóa; AUTO/đất ẩm; STOP; cạn; sensor invalid; mưa; MANUAL; đổi mode; quota; qualification; tràn millis; reboot |
| 200.000 bước tác động xác định | Kiểm tra bơm chỉ ON khi đầu vào an toàn, không quá ngưỡng ẩm, xung không kéo dài, quota trong sai số một chu kỳ kiểm soát |
| Mô hình đất–nước, cấu hình hardware | **PASS:** 1.800 giây thời gian giả lập, 2 phiên bắt đầu/2 kết thúc, xung dài nhất 5.000ms, 0 lỗi |
| Mô hình đất–nước, cấu hình Wokwi | **PASS:** 1.800 giây thời gian giả lập, 2 phiên bắt đầu/2 kết thúc, xung dài nhất 5.000ms, 0 lỗi |

Log mô hình: [hardware](../evidence/plant-0.jsonl), [simulation](../evidence/plant-1.jsonl). Trong mô hình, độ ẩm tăng khi bơm/mưa và giảm theo hệ số giả định; không dùng hệ số này để chọn lượng nước cho cây thật. Có sự kiện mưa, cạn, mất dữ liệu cảm biến và STOP; sau khi hết lỗi cạn/sensor/STOP, chỉ re-arm tại các mốc người vận hành được giả lập. Các ca ngắt giữa phiên nằm trong unit test.

Mỗi `CHECK` là một khẳng định kiểm tra; 800.055 khẳng định không phải 800.055 kịch bản độc lập.

## Sửa trong lần rà soát

- Hoàn thiện báo cáo bị thiếu và thêm trang tiến độ để kế hoạch ban đầu không bị hiểu là hiện trạng.
- `log` bị từ chối khi bơm đang chạy, tránh xuất một loạt lịch sử Serial làm trì hoãn vòng kiểm soát.
- LCD chỉ báo khởi tạo thành công nếu I2C vẫn hoạt động sau chuỗi khởi tạo.
- Hiển thị thời gian còn lại dùng timestamp sau xử lý lệnh, tránh phép trừ thời gian cũ khi phiên vừa bắt đầu.
- Script test có thể gọi từ thư mục khác mà vẫn tìm đúng header/test trong repository.
- Đã quan sát `.pio/build` mất binary sau lần kiểm tra đầu; chưa xác định chắc tiến trình gây ra. Script build dùng `.firmware/build` riêng và cấu hình Wokwi cùng đường dẫn để tránh phụ thuộc thư mục cache này.
- Sau khi thư mục dự án được đổi sang đường dẫn không dấu, đã build lại Wokwi: firmware simulation mới tạo thành công tại `.firmware/build/esp32doit-devkit-v1/firmware.bin`.
- Relay Wokwi nối GPIO26 trực tiếp vì module mô phỏng đã có transistor; mạng NPN 2,2k/10k chỉ dùng trong mạch thật. Input có pull-up nội dự phòng và điện trở kéo lên ngoài.
- Serial trả ACK cho STOP và đổi mode; Serial Monitor luôn mở khi simulator khởi động.

Đã gọi lại script Controller từ `D:\` thay vì thư mục dự án: vẫn đạt 800.055 kiểm tra, 0 lỗi. Kiểm tra cấu trúc mạch bằng script không xác nhận đặc tính điện hoặc hoạt động của relay trong Wokwi.

## Chưa xác minh

| Hạng mục | Trạng thái |
|---|---|
| Wokwi VS Code chạy UI, LCD, polarity relay và phím tắt | **CHƯA CHẠY/CHƯA CÓ BẰNG CHỨNG** |
| NVS calibration qua reset thiết bị | **CHƯA CHẠY TRÊN BOARD** |
| Dòng khởi động motor, sụt áp, nhiệt, cầu chì, transistor | **CHƯA ĐO** |
| Bơm thật 20 chu kỳ, thử nước 24 giờ | **CHƯA CHẠY** |
| MQTT, website, Azure | **CHƯA TRIỂN KHAI** |

## Lệnh tái lập

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-controller.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-plant.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1 -Environment all
python scripts/check-project.py --require-firmware
```

Build tạo firmware, không upload. Script kiểm tra Markdown chỉ xác minh liên kết tới file local, dấu code fence và UTF-8; không kiểm tra lại giá hay khả năng truy cập URL Internet.
