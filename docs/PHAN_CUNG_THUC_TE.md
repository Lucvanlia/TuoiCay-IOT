# Mạch đấu thật và tính công suất — phiên bản 1

Thiết kế này đi cùng `diagram.json` và firmware hiện tại. Đây là thiết kế kỹ thuật để lắp thử, **chưa được đo hoặc nghiệm thu trên phần cứng**. Chưa có mã/nhãn bơm nên giá trị nguồn, cầu chì và tải dưới đây có điều kiện. Wokwi không kiểm chứng được nhiệt, dòng khởi động, motor kẹt hay độ an toàn ngoài trời.

Xem [sơ đồ điện dạng SVG](hardware-wiring.svg) và [cách chạy Wokwi](CHAY_WOKWI.md). Bản này cụ thể hóa và điều chỉnh kế hoạch trước: khi boot/reset luôn khóa STOP và cần RESUME tại chỗ; chưa có điều khiển Internet trong firmware này.

## 1. Phạm vi điện được thiết kế

- ESP32 **DOIT DevKit V1 hoặc NodeMCU-32S loại cổ điển**, logic 3,3V.
- Một bơm **DC 12V**, thiết kế ví dụ cho dòng chạy ≤1A, dòng khởi động ≤2A. Không áp dụng nguyên xi cho bơm 5V, 24V, AC, tải lớn hơn hoặc bơm có driver đặc biệt.
- Nguồn adapter kín **12V/5A** là lựa chọn dự phòng theo ví dụ tính ở mục 5; không có nghĩa ép 5A vào bơm. Bơm lấy dòng theo tải. Điện áp phải đúng 12V.
- Buck LM2596 điều chỉnh **5,0V**, cấp nhánh logic. 3V3 lấy từ regulator board ESP32 cho cảm biến và pull-up.
- Bơm đi qua tiếp điểm relay **NO**, không đi qua chân GPIO, regulator ESP32 hoặc breadboard.
- Mạch sử dụng chung GND theo kiểu tách nhánh về điểm nguồn; đây không phải thiết kế cách ly galvanic toàn hệ thống.

## 2. Danh sách linh kiện thụ động và linh kiện bảo vệ

Điện trở màng kim loại 1%, **1/4W** cho toàn bộ các dòng R dưới đây. Giá trị được chọn theo dòng tín hiệu, không dùng điện trở nối tiếp bơm để hạ áp.

| Ký hiệu | Giá trị / loại | SL | Vai trò |
|---|---|---:|---|
| R1 | 2,2kΩ | 1 | GPIO26 → base Q1; giới hạn dòng base |
| R2 | 10kΩ | 1 | Base Q1 → GND; mặc định transistor OFF |
| R3 | 4,7kΩ | 1 | Relay IN → 5V; mặc định relay active-low OFF |
| R4–R9 | 10kΩ | 6 | Kéo GPIO mưa, phao, STOP, MODE, WATER, RESUME lên 3V3 |
| R10 | 1kΩ | 1 | AO đất → ADC34; cùng tụ lọc |
| R11 | 100kΩ | 1 | ADC34 → GND; hạn chế chân đo bị thả nổi khi hở dây |
| R12 | 330Ω | 1 | GPIO25 → LED đỏ → GND |
| R13–R16 | 4,7kΩ | 4 | Pull-up hai phía hai kênh I2C BSS138; tính cả điện trở sẵn trên module |
| R17 | 2,2kΩ | 1 tùy chọn | Báo điện áp bơm: PUMP+ → R17 → LED → GND |
| Q1 | P2N2222A hoặc NPN tương đương có datasheet | 1 | Chỉ kéo IN relay, **không kéo trực tiếp motor/cuộn relay trần** |
| Q2, Q3 | BSS138 hoặc module chuyển mức I2C hai chiều | 2 / 1 module | Chuyển SDA/SCL 3,3↔5V |
| D1 | 1N5408, 3A; kiểm tra rating theo tải | 1 | Dập xung cảm ứng ở motor DC đóng/cắt chậm |
| C1 | 100nF ceramic ≥16V | 1 | ADC34 → GND sau R10 |
| C2 | 100nF ceramic ≥16V | 1 | Gần VCC/GND cảm biến đất |
| C3 | 470µF/16V low-ESR | 1 | Nhánh 5V gần board ESP32, đúng cực |
| C4 | 100nF ceramic ≥16V | 1 | Nhánh 5V gần relay |
| C5 | 470µF/25V | 1 | Nhánh 12V gần cụm công suất, đúng cực |
| C6 | 100nF ceramic ≥16V | 1 | Gần nguồn LCD/backpack |
| C7 | 100nF ceramic ≥50V | 1 có điều kiện | Chống nhiễu chổi than ngay hai cực motor; theo loại bơm |
| F0 | Cầu chì DC T3,15A + đế | 1 dự kiến | Nhánh chung sau adapter, bảo vệ dây chính |
| F1 | Cầu chì DC T2A + đế | 1 dự kiến | Nhánh motor theo ví dụ 1A chạy/2A khởi động |
| F2 | Cầu chì DC T1A + đế | 1 dự kiến | Nhánh đầu vào buck 12V |
| SW0/SW1 | Công tắc nguồn / cắt bơm, rating DC ≥12V/5A | 2 | Cắt điện vật lý, độc lập firmware |

Cầu chì phải có điện áp và khả năng cắt **DC** phù hợp nguồn; giá trị T là loại trễ, cần đối chiếu đường cong thời gian–dòng của sản phẩm thật. Các giá trị F0/F1/F2 chưa phải lựa chọn cuối nếu chưa đo tải. Cầu chì bảo vệ ngắn mạch/dây, không đảm bảo phát hiện motor kẹt: motor kẹt dưới ngưỡng cầu chì vẫn có thể quá nóng.

Module relay phải có transistor/diode bảo vệ cuộn dây sẵn. Nếu dùng relay trần thì cần thiết kế driver cuộn và diode riêng, không dùng nguyên xi Q1/R1 ở đây. D1 ở motor vẫn cần dù module relay đã có diode cuộn dây.

## 3. Netlist lắp thật: nối theo tên chân, không theo vị trí hình

### Nguồn và tải

```text
Adapter +12V → F0 → SW0 → BUS_12V
Adapter GND → STAR_GND

BUS_12V → F1 → SW1 (cắt bơm) → K1.COM
K1.NO → PUMP+; K1.NC để trống
PUMP- → dây riêng → STAR_GND
D1 cathode (đầu có vạch) → PUMP+
D1 anode → PUMP-
C7 → hai cực motor (nếu motor chổi than và phù hợp hướng dẫn)

BUS_12V → F2 → buck.IN+
STAR_GND → buck.IN-
buck.OUT+ (đã đo 5,0V) → BUS_5V
buck.OUT- → GND logic → STAR_GND
BUS_5V → chân 5V/VIN đúng board, LCD.VCC, K1.VCC, HV chuyển mức
ESP32.3V3 → cảm biến đất.VCC, LV chuyển mức, các pull-up GPIO
GND logic → ESP32.GND, sensor.GND, LCD.GND, K1.GND, Q1.E
C3 giữa 5V/GND; C5 giữa 12V/GND; đặt gần tải tương ứng
```

Không đưa 12V vào VIN của ESP32 chỉ vì thấy chữ VIN. Board này dùng chân nguồn 5V theo pinout nhà sản xuất. Khi nạp USB, ngắt nhánh buck cấp vào 5V board trừ khi đã xác minh chống backfeed; vẫn nối GND đúng thiết kế. Không tự nối song song hai nguồn 5V.

### Tầng kích relay

```text
GPIO26 → R1 2,2k → Q1.B
Q1.B → R2 10k → GND
Q1.E → GND
Q1.C → K1.IN
K1.IN → R3 4,7k → 5V
K1.VCC → 5V; K1.GND → GND
```

Chọn K1 **active-low**: GPIO26 HIGH → Q1 dẫn → IN LOW → COM nối NO → bơm chạy. GPIO LOW/Hi-Z lúc reset → R2 giữ Q1 OFF → R3 kéo IN HIGH → bơm tắt. Đo thử bảng chân trị bằng đồng hồ khi chưa nối motor.

Không lấy 5V từ IN để đưa thẳng về GPIO. Với P2N2222A của onsemi, xác minh số chân theo đúng package/datasheet; các sản phẩm mang tên 2N2222 khác có thể bố trí chân khác. [Datasheet Q1](https://www.onsemi.com/pdf/datasheet/p2n2222a-d.pdf).

### Đầu vào và LCD

| GPIO | Đấu thật |
|---:|---|
| 34 | AO đất → R10 1k → GPIO34; tại GPIO34 có C1 100nF và R11 100k xuống GND |
| 27 | Pull-up R4 10k về 3V3; tiếp điểm mưa đóng về GND khi ướt |
| 33 | Pull-up R5 10k về 3V3; phao đóng về GND khi **đủ nước**, hở khi cạn |
| 32 | Pull-up R6 10k về 3V3; nút STOP nhấn nối GND |
| 18 | Pull-up R7 10k về 3V3; nút MODE nhấn nối GND |
| 19 | Pull-up R8 10k về 3V3; nút WATER nhấn nối GND |
| 23 | Pull-up R9 10k về 3V3; nút RESUME nhấn nối GND |
| 25 | R12 330Ω → anode LED đỏ; cathode → GND |
| 21/22 | SDA/SCL qua chuyển mức hai chiều rồi đến LCD; không đi thẳng bus 5V |

Mỗi kênh I2C dùng BSS138: **gate→3V3, source→phía GPIO 3V3, drain→phía LCD 5V**, pull-up 4,7k từ source lên3V3 và từ drain lên5V. Lặp lại cho SDA và SCL. Nếu module đã có pull-up, đo/đọc sơ đồ trước khi thêm: mục tiêu điện trở tương đương mỗi phía khoảng 4,7–10k ở bus ngắn 100kHz, không ghép quá nhiều điện trở song song. Kiểm tra thời gian lên cạnh nếu kéo dây dài. LCD dùng mapping PCF8574 chuẩn, địa chỉ 0x27 hoặc 0x3F; backpack khác cần sửa driver.

Cảm biến mưa BOM trước là bản có relay 12V: cấp 12V đúng thông số cho mạch mưa, nhưng **chỉ dùng tiếp điểm khô** COM/NO/NC làm đầu vào ESP32. Đo khô/ướt để chọn NO hoặc NC sao cho ướt→GPIO27 LOW. Không đấu chân DO có thể mang12V. Chưa có giám sát nguồn mạch mưa: hỏng/mất nguồn mưa có thể bị hiểu là khô; cần kiểm tra định kỳ hoặc thêm giám sát riêng cho vận hành dài hạn.

R11 giúp lỗi hở AO có xu hướng về0, nhưng không chứng minh phát hiện mọi lỗi sensor. Firmware khóa khi raw ≤100 hoặc ≥4000, dữ liệu cũ, hoặc chưa hiệu chuẩn. Một lỗi vẫn tạo số trong dải có thể không được phát hiện.

## 4. Tính điện trở và giới hạn transistor

| Mạch | Tính mẫu | Kết luận |
|---|---|---|
| Base Q1 | (3,3−0,8)/2.200 ≈1,14mA; R2 lấy khoảng0,08mA | Dòng base hữu ích khoảng1mA |
| R3 pull-up relay | 5/4.700 ≈1,06mA khi kéo LOW | Cộng vào dòng IN module khi tính Q1 |
| Q1 collector | Nếu module IN ≤8mA, tổng collector khoảng9,1mA | Forced beta khoảng9, phù hợp mục tiêu kích bão hòa; phải đo VCE khi bật |
| R1 công suất | 2,5²/2.200 ≈2,84mW | 1/4W dư cho tín hiệu này |
| Pull-up10k | 3,3/10.000 =0,33mA; P≈1,09mW | Phù hợp tiếp điểm/nút ngắn |
| LED đỏ GPIO | (3,3−2,0)/330 ≈3,9mA; P_R≈5,1mW | Không dùng LED công suất trực tiếp |
| LED báo12V tùy chọn | (12−2)/2.200 ≈4,55mA; P_R≈45mW | R17 1/4W đủ theo giả định |
| I2C pull-up4k7 | 3,3/4.700≈0,70mA; 5/4.700≈1,06mA | Kiểm tra khả năng sink và tổng điện trở có sẵn |

Nếu dòng IN lớn hơn giới hạn giả định, phải tính lại R1/driver hoặc đổi module; không ép GPIO kéo cuộn relay. Kiểm tra Q1 dẫn có điện áp C–E thấp và IN đạt mức LOW theo module; module active-high không tương thích cấu hình hiện tại.

## 5. Tính nguồn, dây và bảo vệ motor

Ví dụ thiết kế, **không phải số đo của bơm đã mua**:

| Nhánh | Dòng giả định | Công suất |
|---|---:|---:|
| Bơm12V khi chạy | 1A | 12W |
| Bơm12V lúc khởi động | 2A | 24W tức thời |
| Toàn bộ logic5V, dự phòng Wi-Fi/LCD/relay | 0,8A | 4W |
| Mạch mưa12V | 0,06A | 0,72W |

Giả sử buck hiệu suất85%: `I_logic_phía12V = 4/(12×0,85) ≈0,392A`. Dòng nguồn lúc khởi động khoảng `2+0,392+0,06 =2,452A`. Dự phòng25% → **3,065A**, vì vậy chọn cấp thương mại **12V/5A**, không chốt3A ở ví dụ này. Nếu số đo thực nhỏ hơn và adapter đáp ứng xung tải tốt có thể tính lại; nếu dòng motor lớn hơn thì phải tăng cả driver/tiếp điểm/dây/bảo vệ tương ứng.

Buck chạy4W ở85% hiệu suất tỏa nhiệt khoảng `4/0,85−4 =0,71W`. Nhãn LM2596 “3A” không đảm bảo mọi module clone chịu3A liên tục trong hộp kín. Nghiệm thu5V dưới tải, nhiệt độ linh kiện và không reset ESP32 qua20 lần bật bơm. [Datasheet LM2596](https://www.ti.com/lit/ds/symlink/lm2596.pdf).

Ví dụ dây đồng0,5mm², cách nguồn1m tức vòng đi/về2m: `R≈0,0175×2/0,5=0,07Ω`; dòng2A làm sụt khoảng0,14V và tỏa0,28W toàn vòng. Đây là tính sụt áp, không thay bảng ampacity theo loại dây/nhiệt/đầu nối. Dùng dây nguồn ít nhất0,5mm² trong ví dụ ngắn này, terminal tốt; kiểm tra thêm sụt áp tiếp điểm và jack.

Relay cần rating **DC và tải cảm/motor** theo dòng khởi động/kẹt. Chữ10A AC trên vỏ không đủ để chốt. D1 cathode vào PUMP+, anode vào PUMP−; đặt gần bơm, chân ngắn. 1N5408 thuộc họ diode3A dùng được cho freewheel khi đóng/cắt chậm, không thiết kế PWM tần số cao bằng relay/diode này. [Datasheet diode](https://www.vishay.com/docs/88516/1n5400.pdf).

SW1 cắt bơm trực tiếp phải thao tác được khi phần mềm treo hoặc tiếp điểm K1 bị dính. Watchdog3 giây trong code là lớp hỗ trợ, không thay công tắc cắt điện; nếu dùng không người giám sát cần thêm bảo vệ dòng/timeout độc lập và nghiệm thu phù hợp tải. Không thể gọi mạch này là đạt chuẩn chứng nhận chỉ nhờ mô phỏng.

## 6. Khác biệt Wokwi và bản đấu thật

| Wokwi hiện tại | Đấu thật bắt buộc |
|---|---|
| Biến trở SIG nối thẳng ADC | Sensor điện dung + R10/R11/C1; hiệu chuẩn raw lại |
| Switch mưa/phao | Tiếp điểm sensor thật với đúng polarity; không đưa12V vào GPIO |
| Relay là khối logic HIGH→ON sau R2,2k/pulldown | Q1/R1/R2/R3 + module active-low; không cắm R1 trực tiếp IN thay transistor |
| LCD I2C mô phỏng nối thẳng và pull-up3V3 | BSS138 hai kênh với pull-up hai phía; không kéo bus ESP32 lên5V |
| LED xanh qua330Ω được đóng bởi tiếp điểm | Motor12V có nguồn riêng, cầu chì, diode và dây công suất |
| Không mô phỏng nhiệt/động cơ/tụ nguồn | Đo điện, dòng tải và nhiệt thật |

Wokwi xác nhận logic đầu vào/đầu ra; linh kiện analog có giới hạn mô phỏng nên không đưa một chuỗi RC/transistor giả vào rồi tuyên bố đã kiểm chứng điện. [Giới hạn resistor trong Wokwi](https://docs.wokwi.com/parts/wokwi-resistor).

## 7. Quy trình lắp và nghiệm thu

1. Chụp nhãn/mã bơm, hỏi dòng khởi động/kẹt, nguồn/relay/diode đúng hãng; cập nhật lại mục5.
2. Không cắm ESP32: đo adapter/cực tính; chỉnh buck5,0V, kiểm tra ngắn mạch và cầu chì.
3. Cấp USB cho ESP32, mạch công suất chưa có motor. Kiểm tra GPIO26 LOW lúc boot/reset và output Q1/relay đúng bảng chân trị.
4. Kiểm tra pull-up GPIO khoảng3,3V, không chân ESP32 nào bị kéo5V; quét LCD qua chuyển mức.
5. Nạp env `hardware` hoặc `hardware-nodemcu32s`, thử sensor/STOP/phao, hiệu chuẩn đất. Bản hardware không tự bỏ khóa khi boot.
6. Cấp nguồn motor riêng, có nước theo yêu cầu mồi/chìm; chỉ thử xung2–5 giây, có SW1 trong tầm tay. Không thử dòng kẹt bằng cách cố tình giữ motor lâu.
7. Đo dòng bằng dụng cụ có khả năng bắt dòng khởi động; đồng hồ số thường có thể bỏ lỡ đỉnh. Đo cả5V/3V3 lúc bật bơm; đối chiếu dải điện áp của board/linh kiện.
8. Thử ít nhất20 lần bơm, mưa giữa phiên, phao cạn, rút AO, reset khi tưới; ghi điện áp/dòng/nhiệt, kết quả thực tế.
9. Chống siphon bằng vị trí ống/van phù hợp; cắt điện mà nước vẫn chảy thì phải sửa thủy lực. Giữ mạch/hộp/adapter khỏi nước, tạo vòng dây nhỏ giọt và strain relief.

Ngân sách cũ790.000 tiền hàng là sơ bộ; phương án thêm cầu chì, tụ/driver cụ thể và adapter5A có thể thay đổi tổng. Không dùng ngân sách cũ làm lý do bỏ linh kiện bảo vệ. Bơm/nguồn chưa xác nhận nên chưa chốt công suất và đơn mua cuối.
