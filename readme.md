
# TuoiCay-IOT

Đề tài nhóm 2
04. Hệ thống tưới cây tự động qua Internet
Yêu cầu: Độ ẩm đất, bơm/relay mô phỏng; chế độ tự động và thủ công; nhật ký tưới., LCD
Cảm biến mưa có trời mua độ ẩm tăng lên thông báo 
tài liệu tham khảo 
https://www.hivemq.com/demos/websocket-client/
https://learn.microsoft.com/en-us/azure/iot/
https://www.blynk.io/
https://www.allelcoelec.com/blog/Complete-Guide-to-Jumper-Wires-Types,Uses,and-How-to-Choose-Them.html?srsltid=AU7gw4XKFxwfNEpGr65MH_byJ_OMuSTlQhnwdnQoV7bXs6b8-Iny_7RB
https://learn.microsoft.com/en-us/azure/iot/
https://docs.wokwi.com/vscode/getting-started
Yêu cầu chung 
•	ESP32 và tối thiểu 2 thiết bị vào/ra; có ít nhất 2 cảm biến thực hoặc mô phỏng.
•	Wokwi trên VS Code (8đ)
•	Sản phẩm thực tế (10đ) 
•	Truyền dữ liệu qua Wi-Fi/MQTT hoặc giao thức phù hợp; có điều khiển từ xa hoặc tự động. Website nhiều công nghệ lớp biết react,...
•	Dashboard thể hiện dữ liệu, trạng thái, biểu đồ; có lưu dữ liệu lịch sử. (Azure IoT – free, BlynkIOT, NodeRED)
•	Thử nghiệm tối thiểu 3 kịch bản 
•	Nộp sơ đồ kiến trúc, sơ đồ nối dây, mã nguồn, dashboard, báo cáo, kết quả kiểm thử và video demo.

## Mạch và firmware đã triển khai

- [Tiến độ hiện hành và thứ tự công việc tiếp theo](docs/TIEN_DO.md)

- [Chạy Wokwi: Ctrl+Shift+B rồi F1 → Wokwi: Start Simulator](docs/CHAY_WOKWI.md)
- [Sơ đồ đấu thật, điện trở, transistor, diode, cầu chì và tính nguồn](docs/PHAN_CUNG_THUC_TE.md)
- [Sơ đồ điện SVG](docs/hardware-wiring.svg)
- [Kết quả kiểm thử firmware](docs/KIEM_THU_FIRMWARE.md)

Firmware hiện có AUTO/MANUAL, cảm biến đất/mưa/phao, LCD, STOP/RESUME và nhật ký RAM qua Serial. Khởi động luôn khóa bơm; Wokwi chờ 3 giây rồi nhấn R. MQTT/Azure/website vẫn là giai đoạn sau. Không nạp cấu hình mô phỏng vào bơm thật.

## Kế hoạch triển khai và mua sắm

- [Kế hoạch chi tiết: Wokwi, local, thiết bị thật, Azure và dashboard realtime](docs/KE_HOACH_IOT_LOCAL_AZURE.md)
- [Báo cáo mua sắm: linh kiện IC ĐÂY RỒI, dự toán, chia đợt mua và quyết toán](docs/BAO_CAO_MUA_SAM.md)

Tài liệu lập ngày 28/09/2026. Các mốc và kiểm thử là kế hoạch cần thực hiện; giá tham khảo cần xác nhận lại trước khi đặt hàng.
