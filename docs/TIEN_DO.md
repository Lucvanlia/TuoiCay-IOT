# Tiến độ triển khai theo kế hoạch

Cập nhật ngày 28/09/2026. Đây là trạng thái triển khai thực tế; [kế hoạch tổng thể](KE_HOACH_IOT_LOCAL_AZURE.md) giữ phần thiết kế và các mục tiêu còn lại.

## Phần đã triển khai

| Hạng mục | Trạng thái / bằng chứng |
|---|---|
| Firmware ESP32 | AUTO/MANUAL, STOP/RESUME, đất/mưa/phao, LCD, hiệu chuẩn NVS, giới hạn tưới |
| Wokwi | `diagram.json` hoàn thiện cả hai phía MƯA/PHAO và hai tiếp điểm NO/NC; relay mô phỏng nối trực tiếp đúng logic; cần kiểm chứng UI thực tế |
| Build trên đường dẫn có dấu | `scripts/build.ps1`, task Ctrl+Shift+B; có env DOIT/NodeMCU thật riêng |
| Sơ đồ đấu thật | [Phần cứng](PHAN_CUNG_THUC_TE.md), [SVG](hardware-wiring.svg), [PNG](hardware-wiring.png) |
| Unit test controller | 12 ca nền và 200.000 bước nhiễu xác định; 800.055 kiểm tra đạt |
| Mô hình đất–nước vòng kín | Chạy core C++ thật với cấu hình hardware và simulation, mỗi lượt tương đương 30 phút; không thay kiểm tra Wokwi/đất thật |
| Tài liệu | [Hướng dẫn chạy](CHAY_WOKWI.md), [biên bản kiểm thử](KIEM_THU_FIRMWARE.md), kiểm tra liên kết local bằng script |

## Cổng nghiệm thu theo kế hoạch

- **G0:** môi trường và build đã kiểm chứng; phần quan sát firmware trong UI Wokwi chưa có bằng chứng nên chưa đóng toàn bộ mốc.
- **G1:** logic và sơ đồ đã triển khai; host test đạt. Còn chạy simulator VS Code, xác minh polarity relay, LCD và thao tác các nút; thử 30 phút simulator thực. Host test tăng tốc không được ghi thành 30 phút Wokwi.
- **G2:** MQTT, backend SQLite và React dashboard **chưa triển khai**. Đây là mốc tiếp theo sau nghiệm thu Wokwi; có thể phát triển UI bằng simulator độc lập nếu chưa có license/gateway.
- **G3/G4:** chưa có linh kiện thật/thông số bơm được xác nhận; chưa mua, nạp hoặc đo điện.
- **G5:** chưa tạo tài nguyên Azure hoặc triển khai cloud.

## Quyết định kỹ thuật hiện hành

1. Khởi động/reset luôn khóa STOP; chỉ RESUME tại chỗ mới cho phép tưới. Runtime một giờ hiện nằm trong RAM, không tự phục hồi sau mất điện.
2. Firmware Wokwi dùng xung 5 giây, nghỉ 10 giây; firmware hardware dùng xung 5 giây, nghỉ 60 giây và chờ khô sau mưa 300 giây.
3. Hardware bắt buộc lấy cả điểm khô và ướt trước `cal save`. Chỉ số đất là tương đối; chưa chốt ngưỡng theo một loài cây cụ thể.
4. Nguồn 12V/3A trong dự toán đầu là phương án cũ. Bản tính điện chi tiết dự trù 12V/5A **cho giả định** dòng bơm chạy 1A/khởi động 2A. Phải xác nhận tải rồi chốt nguồn, dây, cầu chì và cập nhật tổng tiền.
5. Sơ đồ Wokwi đơn giản hóa transistor/chuyển mức. Lắp ngoài đời theo netlist phần cứng, không nối trực tiếp GPIO với relay 5V hoặc bus LCD 5V.

## Thứ tự công việc tiếp theo

1. Ctrl+Shift+B, F1 → Wokwi: Start Simulator; chạy bảng thao tác trong hướng dẫn, ghi log/ảnh thật và cập nhật biên bản.
2. Chốt hợp đồng JSON v1 dùng chung firmware/backend, gồm deviceId, bootId, seq, timestamp/uptime và trạng thái cảm biến hợp lệ.
3. G2: Mosquitto có password/ACL; backend ingest + SQLite dedupe; API/WebSocket; React panel; simulator gửi telemetry để phát triển trước.
4. Thêm network task tách khỏi vòng kiểm soát bơm; TTL/commandId/ACK, không để reconnect chặn ngắt bơm. Kiểm thử mất broker, lệnh trùng và stale.
5. Có mã bơm/board thực thì chốt BOM, hiệu chuẩn và nghiệm thu điện; sau đó mới đưa bản đã thử lên Azure.
