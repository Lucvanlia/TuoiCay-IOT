# Báo cáo dự toán và kiểm soát mua sắm — tưới cây IoT

Ngày tra cứu: 28/09/2026. Phạm vi: một bộ ESP32, một vùng tưới DC, đã có laptop/Wi-Fi. Giá dưới đây là giá hiển thị từ các trang được truy xuất, một số kết quả là bản lưu của công cụ tìm kiếm; **không phải báo giá đã xác nhận hay bảo đảm tồn kho**. Cần xác nhận lại giá, VAT, phí giao và đúng phiên bản khi đặt hàng.

Liên quan: [kế hoạch triển khai và nối dây](KE_HOACH_IOT_LOCAL_AZURE.md).

**Cập nhật sau thiết kế mạch:** các tổng dưới đây là dự toán ban đầu, chưa phải BOM cuối. Bản [phần cứng chi tiết](PHAN_CUNG_THUC_TE.md) thêm danh sách điện trở/tụ/cầu chì rõ ràng và dự trù nguồn 12V/5A theo giả định tải. Dòng P07 12V/3A và tổng khoảng 950.000 đồng phải được tính lại sau xác nhận bơm và báo giá vật tư mới; chưa đặt hàng.

## 1. Các linh kiện có trang IC ĐÂY RỒI

Đơn vị tiền: VND. Giá tạm tính giữ nguyên giá niêm yết đọc được, chưa cộng phụ phí riêng.

| Mã | Linh kiện / nguồn | SL | Đơn giá | Thành tiền | Điều kiện trước khi chốt |
|---|---|---:|---:|---:|---|
| P01 | [ESP32 NodeMCU-32S CH340](https://icdayroi.com/kit-phat-trien-wifi-ble-esp32-nodemcu-32s-ch340) | 1 | 179.000 | 179.000 | Xác nhận ESP32 cổ điển, pinout, USB và chân hàn |
| P02 | [Cảm biến đất điện dung](https://icdayroi.com/cam-bien-do-am-dat-dien-dung) | 2 | 14.000 | 28.000 | Một dùng, một dự phòng; trang ghi nguồn 3,3–5,5V, analog 0–3V; hỏi kèm cáp |
| P03 | [Cảm biến mưa kèm relay 12V](https://icdayroi.com/cam-bien-mua-kem-relay) | 1 | 40.000 | 40.000 | Trang truy xuất là bản lưu cũ; xác nhận tồn kho, tấm mưa và tiếp điểm khô |
| P04 | [Module 1 relay 5V kích thấp](https://icdayroi.com/module-1-relay-5v-kich-muc-thap) | 1 | 15.000 | 15.000 | Có COM/NO/NC; xác nhận tải DC motor, dòng IN; dùng tầng NPN |
| P05 | [LCD1602 tích hợp I2C](https://icdayroi.com/lcd-1602-tich-hop-san-module-chuyen-doi-i2c) | 1 | 49.000 | 49.000 | Mua bản có I2C; không mua thêm backpack trùng |
| P06 | [Bơm: trang có URL “5V”, nội dung ghi 12V](https://icdayroi.com/bom-nuoc-5v) | 1 | 40.000 | 40.000 | **Chưa chốt mua:** cần ảnh nhãn 12V, dòng khởi động, lưu lượng, cột áp, cách mồi |
| P07 | [Adapter 12V3A loại tốt](https://icdayroi.com/adapter-12v3a-loai-tot) | 1 | 85.000 | 85.000 | Nguồn kín, đúng cực jack; 3A chỉ được chốt sau kiểm tra tải bơm |
| P08 | LM2596 buck 3A, [giá trên trang cửa hàng](https://icdayroi.com/) | 1 | 19.000 | 19.000 | Xác nhận SKU; chỉnh 5,0V trước khi nối logic, kiểm tra nhiệt |
| | **Tổng các dòng có giá nguồn** | | | **455.000** | Gồm cảm biến đất dự phòng |

Trang bơm mô tả đầu vào 17mm, đầu ra 8mm và không chạy khô. Không đặt ống theo phỏng đoán; hỏi kích thước ngoài đầu nối và đường kính trong ống phù hợp. Nếu nhà bán xác nhận hàng thực là 5V thì phải thiết kế lại nguồn/công suất tương ứng, không cấp 12V. Giá bơm 40.000 chỉ được giữ trong dự toán có điều kiện. [Nguồn bơm](https://icdayroi.com/bom-nuoc-5v).

Cảm biến mưa có relay dùng như **đầu vào** ESP32, relay bơm P04 là **đầu ra** khác; không bỏ P04 vì thấy P03 đã có relay. Phương án này lấy được mưa có/không, không có biểu đồ mức mưa analog.

Không ưu tiên đầu đo đất điện trở khi đã có điện dung giá thấp và có analog; đầu đo điện trở ở [trang thay thế](https://icdayroi.com/cam-bien-do-am-dat) có giá 15.000 và cần chú ý mức ngõ ra. Không mua combo tự tưới độc lập rồi bỏ ESP32 khỏi vòng điều khiển vì không đáp ứng mục tiêu firmware/website của đề.

## 2. Vật tư bắt buộc còn cần báo giá

Các số sau là **mức phân bổ ngân sách do kế hoạch đề xuất**, chưa xác minh SKU, giá hay tồn kho tại IC ĐÂY RỒI. Có thể hỏi cùng cửa hàng; nếu thiếu mới tìm nơi khác có thông số tương đương.

| Mã | Vật tư / số lượng | Dự toán cả dòng | Tiêu chí nhận hàng |
|---|---|---:|---|
| E01 | 1 module chuyển mức I2C hai chiều | 15.000 | 3,3↔5V, phù hợp open-drain I2C |
| E02 | 1 bộ NPN + điện trở base/pull-down/pull-up | 10.000 | Driver relay theo mục điện; đủ pull-up cho mưa/phao |
| E03 | 1 diode dập xung bơm + tụ lọc nguồn | 15.000 | Dòng/áp đủ motor thật; dự kiến diode cỡ 3A |
| E04 | Cầu chì, đế và công tắc cắt bơm DC | 20.000 | Rating theo đo tải, có phụ tùng cầu chì |
| E05 | 1 phao báo cạn tiếp điểm | 35.000 | Vật liệu dùng được trong nước, bố trí đóng khi đủ nước |
| E06 | 1 bộ breadboard phù hợp bề rộng ESP32 | 30.000 | Có chỗ cắm dây hai bên board hoặc dùng hai mảnh |
| E07 | 1 bộ dây Dupont đực-đực/đực-cái/cái-cái | 35.000 | Đủ loại đầu cho board, LCD và cảm biến |
| E08 | 1 cáp USB dữ liệu đúng cổng board | 25.000 | Có data, không chỉ cấp nguồn |
| E09 | Ống, đầu chuyển, kẹp, bình nước/đầu tưới | 50.000 | Phù hợp bơm P06, chống tuột/rò và siphon |
| E10 | Hộp, ốc đỡ, đầu luồn dây | 60.000 | Ngăn nước bắn, có cách bố trí thoát nhiệt |
| E11 | Dây công suất, jack DC, terminal, board hàn | 25.000 | Không dùng breadboard cho dòng motor |
| E12 | Nút STOP, LED, điện trở, biến trở thử | 15.000 | Đủ phụ kiện thử và điều khiển tại chỗ |
| | **Tổng dự toán vật tư bổ sung** | **335.000** | Phải lấy giá thực trước đặt |

Phao cạn và mạch bảo vệ được tính trong cấu hình khuyến nghị dù README không bắt buộc. Không cắt các dòng này để tiết kiệm khi dùng bơm thật. Cảm biến đất dự phòng có thể bỏ nếu ngân sách rất chặt, tiết kiệm 14.000.

## 3. Cân đối ngân sách và mua theo giai đoạn

| Khoản | Số tiền dự trù | Cách tính/ghi chú |
|---|---:|---|
| Phần cứng có nguồn giá | 455.000 | P01–P08 |
| Vật tư chưa có báo giá | 335.000 | E01–E12 |
| **Cộng hàng dự kiến** | **790.000** | Chưa phải đơn hàng chắc chắn |
| Phí giao tạm tính | 40.000 | Thay bằng phí thật, có thể tăng khi chia nhiều đơn |
| Dự phòng khoảng 15% tiền hàng | 119.000 | Làm tròn từ 118.500; dùng cho lệch giá, phụ phí/thuế chưa rõ, thay nguồn |
| **Ngân sách phần cứng khuyến nghị** | **949.000 ≈ 950.000** | Nếu phụ phí vượt dự phòng, cập nhật tổng trước mua |

Đợt 1 khoảng **376.000**: P01, P02, P05, E01, E06, E07, E08, E12. Đủ kiểm tra ESP32, độ ẩm và LCD; chưa đủ bản mưa/bơm hoàn chỉnh. Đợt 2 khoảng **414.000**: các dòng còn lại, chỉ chốt sau khi xác minh P06 và khả năng nguồn. Hai đợt cộng 790.000 tiền hàng; giao hàng/dự phòng tính ngoài.

| Phương án | Ngân sách | Được gì và giới hạn |
|---|---|---|
| Mô phỏng + local | 0 tiền linh kiện; license Wokwi riêng | Đủ phát triển logic/web; không chứng minh phần điện và nước thật |
| Đọc cảm biến thật trước | 376.000 tiền hàng + giao | ESP32/đất/LCD; bơm và mưa vẫn cần mô phỏng |
| Bộ thật khuyến nghị | Khoảng 950.000 gồm dự phòng/giao tạm tính | Đủ hai sensor, LCD, bơm, mưa, phao và vật tư |
| Có thêm dụng cụ | Cộng 250.000–500.000 dự toán | Đồng hồ đo, mỏ hàn, thiếc/kìm nếu chưa có; ưu tiên mượn phòng lab |
| Vận hành 3 tháng | Khoảng 1.400.000 + license + dụng cụ | 949.000 phần cứng + 3×150.000 quỹ cloud dự kiến |

Các tổng chưa gồm laptop, Internet sẵn có, công lao động, tên miền riêng, nâng cấp ngoài trời hay cảm biến lưu lượng. Dụng cụ và license ghi riêng vì có thể dùng chung; không phân bổ trùng cho từng thành viên.

**Khuyến nghị quyết định:** chọn bộ khoảng 950.000, ưu tiên đồ cấp nguồn/bảo vệ hơn camera, màn hình màu, pin mặt trời hay thêm nhiều cảm biến chưa phục vụ tiêu chí chấm. Chưa cần mua flow sensor nếu chỉ báo thời gian tưới; nếu muốn báo lít nước thực đo phải khảo sát flow sensor đúng dải lưu lượng và dự toán thêm, không dùng thời gian bơm để tuyên bố đo chính xác.

## 4. Azure: chi phí vận hành phải tính riêng

Giả định một thiết bị, telemetry 30 giây, 1–3 người xem, khoảng 86.400 mẫu/tháng trước sự kiện, payload nhỏ và raw giữ 30 ngày. Không có cam kết toàn bộ cloud miễn phí.

| Dịch vụ | Lựa chọn dự kiến | Khoản phải kiểm soát |
|---|---|---|
| IoT Hub | F1 nếu subscription còn quota | 8.000 đơn vị/ngày, khối 0,5KB; không đủ cho telemetry 1–10 giây liên tục |
| SignalR | Free, Serverless | 20 kết nối, 20.000 tin/ngày; nhiều tab/client tăng fan-out |
| Static Web Apps | Free nếu đáp ứng nhu cầu hiện tại | Kiểm tra quota/tính năng khi triển khai; tên miền riêng không cần cho demo |
| Functions | Plan serverless phù hợp runtime/trigger | Execution, memory-time, cold start và điều kiện free grant phụ thuộc plan/tài khoản |
| Storage | Table + Blob/checkpoint | Dung lượng, số thao tác, retention, export; không mặc định 0 đồng |
| Monitoring | Application Insights/log | Ingestion và retention; tránh ghi mọi payload vào nhiều log |
| Network | Truyền dữ liệu ra | Egress theo vùng/mức sử dụng |

Quỹ vận hành đề xuất **150.000 VND/tháng** để theo dõi, đây là **ngân sách nội bộ**, không phải giá Azure đã tính theo region hoặc trần thanh toán được bảo đảm. Chi phí thật cần xuất Azure Pricing Calculator với subscription/region/plan cụ thể và đo sau 24–72 giờ. Nếu không thể nằm trong quỹ thì giảm log/tần suất hoặc chọn lại dịch vụ trước khi tiếp tục vận hành dài ngày.

Nguồn: [giá IoT Hub](https://azure.microsoft.com/en-ca/pricing/details/iot-hub/), [quota IoT Hub](https://learn.microsoft.com/uk-ua/azure/iot-hub/iot-hub-devguide-quotas-throttling), [giá SignalR](https://azure.microsoft.com/en-gb/pricing/details/signalr-service/), [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/).

Đặt budget 150.000/tháng với cảnh báo 50%/80%/100%; đối chiếu actual và forecast mỗi ngày trong tuần thử. **Budget chỉ cảnh báo, không tự cắt dịch vụ hoặc chặn hóa đơn.** Sau demo export dữ liệu/bằng chứng, lên lịch xóa resource group khi không cần; quyết định xóa phải tính việc mất dữ liệu. [Hướng dẫn budget Microsoft](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets).

Wokwi: điền biến `W = giá license thực tế theo tài khoản × số tháng cần dùng`. Tổng dự án dự kiến `949.000 + số_tháng_cloud × 150.000 + W + dụng_cụ_chưa_có`. Chưa có giá license đã xác nhận nên không đưa một số giả vào tổng. [Trang gói Wokwi](https://wokwi.com/pricing).

## 5. Checklist hỏi người bán trước khi mua

Chưa liên hệ hay đặt hàng thay người dùng. Nội dung dưới đây là danh sách kiểm tra để mang tới cửa hàng:

- Xác nhận đúng board ESP32 cổ điển, cổng USB/driver, có hàn header chưa; không tự thay C3/S3.
- Hai cảm biến đất điện dung có kèm dây không; nguồn và AO đúng trang mô tả; đầu đo có cần chống ẩm phần mạch không.
- Cảm biến mưa là bản 12V có relay, có đủ tấm cảm biến và cáp; COM/NO/NC là tiếp điểm khô tách nguồn.
- Bơm tại URL “5V” hiện thực tế bao nhiêu volt; gửi ảnh nhãn, dòng chạy/khởi động, cột áp, lưu lượng, kích thước đầu nối và yêu cầu mồi/chìm.
- Adapter 12V/3A có đủ khởi động bơm đồng thời logic không; jack và cực tính; chính sách đổi nếu không đúng thông số.
- Relay bơm phù hợp tải motor DC thực tế; ngõ IN và mức OFF rõ ràng; LCD có I2C sẵn.
- Báo giá đủ chuyển mức, transistor/điện trở, diode/tụ, phao, cầu chì/công tắc, dây và cơ khí; không bỏ vật tư nhỏ.
- Tổng có/không VAT, vận chuyển, thời gian giao, tồn từng dòng, bảo hành/đổi trả và khả năng thay SKU phải được thông báo.

## 6. Nhận hàng, ghi nhận chi thực và quyết toán

1. Đối chiếu SL/SKU với đơn, chụp nhãn và hóa đơn; đo nguồn/cực tính trước khi nối mạch.
2. Nghiệm thu board USB/Serial, raw cảm biến khô/ướt, LCD scan I2C, mưa khô/ướt, phao và relay chưa nối motor.
3. Đo bơm có nước theo hướng dẫn, ghi dòng khởi động/ổn định, lưu lượng và cột áp thử; nếu sai thông số thì dừng ghép hệ thống và xử lý đổi hàng.
4. Ghi ai thanh toán, thiết bị thuộc nhóm hay đồ mượn; theo dõi tiền dự phòng còn lại.

Mẫu bảng chi thực tế (điền sau mua; không dùng giá kế hoạch làm hóa đơn):

| Ngày | Mã dòng | Người chi | SL thực | Đơn giá thực | Giao/thuế phân bổ | Tổng thực | Chênh dự toán | Hóa đơn/ghi chú |
|---|---|---|---|---|---|---|---|---|
| Chưa mua | — | — | — | — | — | — | — | — |

`Tổng thực dòng = SL thực × đơn giá thực + phụ phí phân bổ`; `chênh = tổng thực − ngân sách dòng tương ứng`. Giao hàng chỉ tính một lần cho mỗi đơn; vật tư hỏng/thay ghi dòng riêng. Dự phòng chưa tiêu không tính là chi thực.

Mẫu quyết toán: tổng linh kiện thực + tổng vận chuyển/thuế chưa nằm trong giá + dụng cụ mua riêng + license thực + Azure hóa đơn thực; trừ hoàn tiền. So với hạn mức nhóm duyệt và giải thích từng khoản vượt. Với nhóm N người chia đều, phần mỗi người là tổng chi chung thực/N, sau đó trừ số đã ứng; giữ đồ cá nhân/mượn ngoài phép chia trừ khi nhóm thống nhất.

## 7. Những điểm còn phải xác nhận

- Ngân sách tối đa, số thành viên/hạn nộp và những linh kiện đã có.
- SKU bơm 12V thực tế, dòng tải, ống/cột áp phù hợp chậu.
- Tồn kho hiện tại, giá checkout và phụ kiện E01–E12.
- License Wokwi VS Code/gateway và Azure subscription/region/khả năng tạo F1.
- Loại cây, đất, dung tích chậu/bình để hiệu chuẩn và chọn lượng tưới.

Các điểm này không cản việc triển khai G0–G2 của kế hoạch; chúng là điều kiện phải chốt trước mua và cấp nguồn cho bơm thật.
