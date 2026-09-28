# Chạy mạch tưới cây trong Wokwi VS Code

Checklist từng linh kiện và các ca lỗi: [NGHIEM_THU_WOKWI.md](NGHIEM_THU_WOKWI.md).

## Chạy ngay

1. Mở **thư mục gốc** có `platformio.ini` và `wokwi.toml`, không chỉ mở thư mục `src`.
2. Nhấn **Ctrl+Shift+B** → `Build Wokwi (Unicode-safe)` và đợi SUCCESS. Task gọi `scripts/build.ps1`, ánh xạ ổ tạm rồi tự gỡ vì compiler ESP32 đang lỗi với chữ “ẹ” trong đường dẫn.
3. Nhấn **F1 → Wokwi: Start Simulator**. Nếu extension hỏi license thì kích hoạt tài khoản/license của bạn.
4. Để switch MƯA bên trái (khô), PHAO bên trái (đủ nước), biến trở ở giữa. Chờ3 giây rồi nhấn **R / RESUME**.
5. Bấm vào sơ đồ để phím tắt có focus. **M** đổi AUTO/MANUAL; **W** tưới5 giây ở MANUAL; **S** STOP; **R** RESUME. Nút có điện trở kéo lên10kΩ, không để GPIO trôi.

Hoặc build qua PowerShell ở thư mục gốc:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1
```

Không dùng nút PlatformIO Build thông thường ở đường dẫn có dấu này nếu vẫn gặp `H?Thong... Invalid argument`; dùng task đã thêm. Script không di chuyển/xóa dự án và không nạp firmware vào board.

## Mạch đang có

Firmware do script tạo nằm trong `.firmware/build/<environment>/`. `wokwi.toml` trỏ tới bản simulation tại đây. Thư mục này tách khỏi `.pio/build`, nơi đã quan sát thấy đầu ra biến mất sau build khi làm việc cùng IDE. Script đặt rồi khôi phục biến `PLATFORMIO_BUILD_DIR` theo [tài liệu PlatformIO](https://docs.platformio.org/en/stable/envvars.html#platformio-build-dir).

- ESP32 + biến trở mô phỏng độ ẩm đất + switch mô phỏng mưa + switch phao.
- LCD1602 I2C, relay/LED xanh mô phỏng bơm, LED đỏ báo khóa.
- Nút STOP/MODE/WATER/RESUME; sáu pull-up10k; điện trở LED330Ω; nhánh điều khiển relay2,2k/10k; pull-up I2C4,7k.
- Các phần transistor, chuyển mức và công suất **phải lắp theo** [sơ đồ đấu thật](PHAN_CUNG_THUC_TE.md), không sao chép phần bus I2C/relay được đơn giản hóa trong Wokwi.

LED xanh nằm phía NO của relay, không phải cảm biến lưu lượng. Thử thủ công phải thấy nó tắt khi boot, sáng trong lệnh WATER, tắt khi STOP. `transistor="pnp"` được chọn theo phần Operation của [tài liệu relay Wokwi](https://docs.wokwi.com/parts/wokwi-relay-module) để mô phỏng toàn khối HIGH→ON; nếu phiên bản simulator thay đổi hành vi, kiểm tra lại bảng chân trị trước khi tiếp tục, không đảo cực output bản hardware một cách tùy ý.

## Logic đã triển khai

| Tình huống | Hành vi |
|---|---|
| Khởi động/reset | Bơm OFF, STOP khóa; phải RESUME tại chỗ |
| AUTO, đất<35% liên tục10 giây | Tưới5 giây nếu mọi bảo vệ cho phép |
| Đất≥55% khi tưới | Dừng sớm |
| Hết5 giây | Dừng và đợi ngấm; không dùng delay dài để giữ motor |
| Có mưa | Dừng ở vòng điều khiển tiếp theo; đợi khô liên tục rồi mới cho phép |
| Cạn nước/đứt dây phao | Dừng, khóa; có nước lại vẫn cần RESUME |
| Sensor lỗi/raw ngoài dải/chưa hiệu chuẩn | Dừng và khóa; xử lý rồi RESUME |
| STOP | Khóa mọi WATER/AUTO cho đến RESUME; giữ nút STOP không thể RESUME |
| MANUAL | Không tự tưới do đất khô; W cho một xung5 giây; vẫn áp bảo vệ/độ ẩm tối đa |
| Đổi chế độ khi đang tưới | Kết thúc phiên hiện tại và áp dụng thời gian nghỉ |
| Tổng runtime | Tối đa60 giây trong cửa sổ1 giờ của phiên chạy, tính cả MANUAL |

Giới hạn giờ dùng RAM, reset sẽ mất bộ đếm; bù lại reset luôn khóa và cần người kiểm tra/RESUME, không tự tưới lại. Chưa có RTC/lưu quota xuyên mất điện, không dùng reset để tăng lượng tưới. Các lệnh Serial là điều khiển tại chỗ, chưa phải giao thức điều khiển từ Internet.

| Tham số | Wokwi | Hardware |
|---|---:|---:|
| Chờ boot tối thiểu trước RESUME | 3s | 60s |
| Chờ ngấm | 10s | 60s |
| Mưa hết, thời gian khô tối thiểu | 10s | 300s |
| Một xung WATER/AUTO | 5s | 5s |
| Trần request trong core | 10s | 10s |
| Hiệu chuẩn ban đầu | dry3200, wet1000 | Phải hiệu chuẩn và lưu NVS |

Wokwi: raw càng cao càng khô, theo công thức `100*(3200−raw)/(3200−1000)`. Đừng vặn hết hai đầu khi thử bình thường: raw≤100 hoặc≥4000 sẽ bị xem là lỗi. Theo dõi số `raw`/`soilPct` trên Serial; thử khô ở raw khoảng2800–3200. Phần trăm là chỉ số tương đối của đất sau hiệu chuẩn, không phải VWC chuẩn phòng lab.

## Serial và nhật ký

Serial115200, gửi lệnh kết thúc bằng Enter/newline:

```text
status
resume
auto
manual
water
stop
log
help
```

Telemetry JSON mỗi2 giây; events lúc mưa, đất tăng ít nhất10 điểm trong một khoảng kiểm tra30 giây, bắt đầu/kết thúc tưới. `log` hiển thị32 phiên gần nhất trong RAM với thời gian uptime, thời lượng, chế độ và lý do dừng. **Nhật ký này mất sau reset**, chưa phải database lịch sử của website. Calibration lưu NVS ở bản hardware; Wokwi không ghi NVS calibration.

Chưa triển khai MQTT, Wi-Fi, Azure, website hoặc giờ NTP ở bản firmware này; phần đó nằm trong kế hoạch giai đoạn sau. Không gắn khóa Azure thật vào mô phỏng hiện tại.

## Nạp board thật và hiệu chuẩn

Build đúng board (chưa nạp):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1 -Environment hardware
# Hoặc, chỉ khi board mua đúng NodeMCU-32S:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1 -Environment hardware-nodemcu32s
```

Không nạp env mô phỏng vào bơm thật. Chỉ nạp sau khi thực hiện kiểm tra điện theo tài liệu phần cứng; dùng env tương ứng và cổng COM thật. Script đã hỗ trợ upload qua cùng ổ ánh xạ tạm; ví dụ dưới đây CHỈ chạy khi board thật đã nối và COM5 đúng là cổng của nó:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1 -Environment hardware -Upload -Port COM5
```

Script từ chối upload env simulation hoặc all. Không có lệnh upload nào được thực hiện trong lần thiết kế này.

Hiệu chuẩn khi nguồn motor đã cắt bằng SW1:

1. Gắn đầu đo vào đất khô thực tế, cùng độ sâu sử dụng; quan sát `status` ổn định → `cal dry`.
2. Gắn vào đất tưới đủ và để thoát nước, không ngâm phần mạch sensor; ổn định → `cal wet`.
3. `cal save`: yêu cầu dry>wet, chênh ít nhất300 raw, hai điểm trong101..3999. Sai thì đo lại, không sửa để ép qua kiểm tra.
4. Khởi động lại để xác nhận NVS giữ calibration. Chờ60s, kiểm tra nước/mưa, `resume`. Bắt đầu với xung ngắn và đo lượng nước.

## Các kịch bản tự thử trên Wokwi

| Bước | Thao tác | Mong đợi |
|---|---|---|
| 1 | Start simulation, chưa bấmR | LED bơm tắt; LCD STOP_LATCH |
| 2 | M, R sau3s, W ở đất<55% | MANUAL, bơm sáng5s rồi tắt |
| 3 | W lại ngay | Từ chối do cooldown, không kéo dài phiên trước |
| 4 | M về AUTO, vặn đất<35%, chờ | Sau cooldown +10s đủ khô, tưới một xung |
| 5 | Khi tưới, gạt MƯA sang phải | Bơm tắt; RAIN_BLOCK; vềkhô phải chờ10s |
| 6 | Gạt PHAO sang phải | TANK_EMPTY; vềtrái vẫn cầnR |
| 7 | Khi tưới bấmS rồi nhả | Bơm tắt, không tự bật lại; R mới gỡ khóa |
| 8 | Vặn biến trở về0 hoặc tối đa | SENSOR_FAULT; đưa về dải hợp lệ rồiR |
| 9 | Nhấn reset ESP32 khi tưới | Output OFF, khóa boot, không tiếp tục phiên cũ |
| 10 | Gõlog | Có phiên bắt đầu/kết thúc và lý do; reset sẽ xóa RAM |

## Kiểm tra tự động và phạm vi xác minh

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-controller.ps1
```

Script biên dịch chính `include/Controller.h` bằng compiler C++ trên PC; hỗ trợ g++ trong PATH hoặc ScopeCppSDK MSVC đã có trên máy này. Các ca gồm boot, dry qualification, wet threshold, STOP, cạn, sensor invalid, mưa, MANUAL, mode change, quota, wrap millis và reset.

Build/test core không thay cho chạy UI Wokwi hoặc đo điện thật. Ghi kết quả kiểm chứng thực tế trong [KIEM_THU_FIRMWARE.md](KIEM_THU_FIRMWARE.md).

## Mô hình đất–nước để kiểm thử vòng kín

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-plant.ps1
python scripts/check-project.py --require-firmware
```

Test chạy chính controller C++ với cả hai bộ thời gian hardware/simulation, mỗi lượt tương đương 30 phút tăng tốc. Độ ẩm thay đổi theo bơm và mưa giả định; không phải mô hình cây thật hoặc kết quả Wokwi UI. Log lưu vào `evidence/plant-0.jsonl` và `evidence/plant-1.jsonl`. Xem [tiến độ](TIEN_DO.md) trước khi chuyển sang G2.
