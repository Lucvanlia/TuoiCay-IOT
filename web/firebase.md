# Hướng dẫn tối ưu tài nguyên: Azure IoT Hub + Azure Functions + Firebase Realtime Database

Áp dụng cho hệ thống tưới cây tự động dùng ESP32 (code `main.cpp`: đọc đất, mưa, DHT22; điều khiển bơm; lệnh `a / m / p`).

> Các con số giá và hạn mức bên dưới lấy theo tài liệu công khai tại thời điểm viết. Hãy kiểm tra lại trên trang giá của Azure và Firebase trước khi chốt gói.

---

## 1. Mỗi dịch vụ làm gì

| Dịch vụ | Vai trò | Nên dùng cho | Không nên dùng cho |
|---|---|---|---|
| **Azure IoT Hub** | Cổng vào của thiết bị: xác thực từng ESP32, nhận telemetry qua MQTT, gửi lệnh xuống thiết bị | Nhận dữ liệu, quản lý danh tính thiết bị, kênh lệnh | Lưu trữ lâu dài, phục vụ app trực tiếp |
| **Azure Functions** | Xử lý phần "keo dán" giữa các dịch vụ: kiểm tra dữ liệu, gộp lô, ghi vào Firebase, gửi cảnh báo | Logic nhẹ, chạy theo sự kiện | Vòng lặp chờ, xử lý từng tin một cách tốn kém |
| **Firebase Realtime DB** | Đẩy trạng thái tới app/dashboard theo thời gian thực | Node `state` hiện tại, `cmd`, lịch sử ngắn hạn | Lưu dữ liệu thô nhiều tháng, phân tích nặng |

### Luồng dữ liệu đề xuất

```
ESP32 --MQTT--> IoT Hub --(endpoint built-in)--> Azure Function --update()--> Firebase RTDB --> App/Dashboard

App --HTTPS--> Azure Function (HTTP trigger) --> IoT Hub (direct method / C2D) --> ESP32
```

Ghi chú: nếu đây chỉ là đồ án/demo một vài thiết bị, ba dịch vụ cùng lúc là hơi nhiều. Bạn có thể bỏ bớt (ví dụ ESP32 ghi thẳng Firebase) để đỡ phức tạp và đỡ tốn. Hãy giữ IoT Hub nếu cần học/chứng minh kiến trúc IoT chuẩn Azure.

---

## 2. Tối ưu Azure IoT Hub

### 2.1 Chọn tier đúng

| Tier | Tin nhắn/ngày/đơn vị | Kích thước tính phí | Ghi chú |
|---|---|---|---|
| Free | 8.000 | **0,5 KB** | Tối đa 500 thiết bị, dùng cho thử nghiệm |
| B1 (Basic) | 400.000 | 4 KB | Không có cloud-to-device và device management |
| S1 (Standard) | 400.000 | 4 KB | Có đầy đủ tính năng lệnh xuống thiết bị |

Gợi ý:

- Khi phát triển: dùng **Free** (thường chỉ được tạo 1 hub Free cho mỗi subscription).
- Cần gửi lệnh xuống ESP32 (đổi chế độ, bật bơm): dùng Free hoặc **S1**, đừng chọn B1.
- Chỉ cần ESP32 gửi dữ liệu lên, không cần lệnh xuống: **B1** rẻ nhất.

### 2.2 Đếm tin nhắn: đây là thứ bạn bị tính phí

Tin nhắn được tính theo **khối**. Ở Free là 0,5 KB mỗi khối, ở trả phí là 4 KB. Ví dụ ở Free, tin 1 KB tính là 2 tin.

Vì vậy **payload phải gọn, dưới 512 byte** khi dùng Free.

Số tin/ngày theo chu kỳ gửi (1 thiết bị):

| Chu kỳ gửi | Tin/ngày | Còn trong hạn mức Free (8.000)? |
|---|---|---|
| 15 giây (`REPORT_MS` hiện tại) | 5.760 | Còn, nhưng ít chỗ cho sự kiện và lệnh |
| 30 giây | 2.880 | Thoải mái |
| 60 giây | 1.440 | Rất thoải mái |

Nên cộng thêm tin sự kiện (bơm bật/tắt, mưa) và lệnh xuống. Nếu gửi theo chu kỳ cố định mà vượt hạn mức, IoT Hub sẽ **từ chối tin** trong phần còn lại của ngày.

### 2.3 Chỉ gửi khi cần: "khi đổi" + "nhịp tim"

Thay vì gửi cứ 15 giây một lần, hãy gửi khi có thay đổi đáng kể, cộng thêm một tin nhịp tim mỗi 60 giây để biết thiết bị còn sống.

Ví dụ thêm vào `main.cpp`:

```cpp
constexpr unsigned long HEARTBEAT_MS = 60000;  // tối đa 60s không gửi
constexpr unsigned long MIN_GAP_MS   = 5000;   // chống gửi dồn dập

struct LastSent {
  int soil = -100, rain = -100;
  bool pump = false, raining = false, autoMode = true;
  unsigned long at = 0;
} last;

bool shouldSend() {
  const unsigned long now = millis();
  if (now - last.at < MIN_GAP_MS) return false;
  const bool changed =
      abs(s.soil - last.soil) >= 2 ||       // đất đổi >= 2%
      abs(s.rain - last.rain) >= 5 ||
      pumpOn != last.pump ||
      s.raining != last.raining ||
      autoMode != last.autoMode;
  return changed || (now - last.at >= HEARTBEAT_MS);
}

void markSent() {
  last = {s.soil, s.rain, pumpOn, s.raining, autoMode, millis()};
}
```

Payload gọn (khoảng 60–80 byte), khóa ngắn, số thay vì chuỗi:

```json
{"id":"esp32_01","s":42,"r":5,"t":31.2,"h":70.1,"p":0,"m":1,"w":0}
```

`p`: bơm (0/1), `m`: chế độ (1 = AUTO), `w`: đang mưa (0/1). DHT lỗi thì bỏ hẳn trường `t`, `h` thay vì gửi `null`.

### 2.4 Kết nối ổn định

- Giữ **một kết nối MQTT** liên tục (keep-alive khoảng 240 giây), không mở lại mỗi lần gửi. Mở kết nối lại tốn pin, thời gian và tin nhắn xác thực.
- Khi mất Wi-Fi: giữ trạng thái mới nhất trong RAM, khi có mạng gửi **một** tin tổng hợp, không gửi dồn từng tin cũ.
- Dùng SAS token dài hơn và gia hạn trước khi hết hạn để tránh ngắt kết nối.

### 2.5 Lệnh xuống thiết bị

Chọn một cách và dùng cho cả hệ thống:

- **Direct method** (`setMode`, `togglePump`): có phản hồi ngay, không lưu hàng đợi. Phù hợp với bơm, vì lệnh cũ không nên chạy lại sau vài giờ.
- **Device twin (desired properties)**: lưu trạng thái mong muốn, phù hợp khi thiết bị hay offline. Mỗi lần đọc/ghi twin cũng bị tính khối.

Với bơm nước, nên dùng direct method để tránh bơm bật ngoài ý muốn khi thiết bị online lại.

### 2.6 Các cấu hình nên chỉnh

- **Retention** của endpoint built-in: để 1 ngày (mặc định), không cần giữ lâu.
- **Partition**: để mặc định tối thiểu, không cần tăng cho vài thiết bị.
- Tạo riêng một **consumer group** cho Function (đừng dùng `$Default`) để dễ quản lý.
- Chỉ bật **message routing** khi thực sự cần phân luồng, vì endpoint built-in đã đủ.
- Đặt **cảnh báo ngân sách** trong Azure Cost Management (xem phần 5).

---

## 3. Tối ưu Azure Functions

### 3.1 Chọn gói chạy

- **Consumption** (hoặc **Flex Consumption**): trả theo lần thực thi và thời gian chạy, có hạn mức miễn phí hằng tháng. Phù hợp với vài thiết bị.
- Tránh gói **Premium/Dedicated** trừ khi bạn thực sự cần chạy liên tục hoặc mạng riêng, vì tính phí cả khi không có tải.

### 3.2 Xử lý theo lô, không xử lý từng tin

Đặt trigger ở chế độ `cardinality: many` để một lần thực thi nhận cả lô tin. Với nhiều thiết bị hoặc tin dồn dập, số lần thực thi giảm rất nhiều.

`host.json`:

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 1,
        "excludedTypes": "Request"
      }
    },
    "logLevel": {
      "default": "Warning",
      "Function": "Warning"
    }
  },
  "extensions": {
    "eventHubs": {
      "maxEventBatchSize": 100,
      "batchCheckpointFrequency": 5,
      "prefetchCount": 300
    }
  }
}
```

Giải thích nhanh:

- `batchCheckpointFrequency: 5`: lưu checkpoint sau mỗi 5 lô thay vì mỗi lô, giảm số giao dịch vào Storage Account.
- `logLevel: Warning`: bớt log. **Log của Application Insights thường là khoản tốn tiền bất ngờ nhất.**
- `samplingSettings`: chỉ giữ một phần telemetry.

### 3.3 Mẫu Function Node.js (v4) tiết kiệm

```js
const { app } = require('@azure/functions');
const admin = require('firebase-admin');

// Khởi tạo MỘT LẦN ở phạm vi toàn cục, tái sử dụng giữa các lần chạy
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}
const db = admin.database();

const HISTORY_BUCKET_MS = 5 * 60 * 1000; // 5 phút/bản ghi lịch sử

app.eventHub('ingestTelemetry', {
  connection: 'IOTHUB_EH_CONN',        // chuỗi kết nối endpoint built-in (Event Hub-compatible)
  eventHubName: process.env.IOTHUB_EH_NAME,
  consumerGroup: 'func',
  cardinality: 'many',
  handler: async (events, context) => {
    // 1) Gộp: chỉ giữ tin MỚI NHẤT của mỗi thiết bị trong lô
    const latest = new Map();
    for (const e of events) {
      const d = typeof e === 'string' ? JSON.parse(e) : e;
      if (!d || !d.id) continue;
      if (typeof d.s !== 'number' || d.s < 0 || d.s > 100) continue; // kiểm tra tối thiểu
      latest.set(d.id, d);
    }
    if (latest.size === 0) return;

    // 2) Một lệnh update() đa đường dẫn cho cả lô
    const now = Date.now();
    const updates = {};
    for (const [id, d] of latest) {
      updates[`devices/${id}/state`] = { ...d, ts: now };
      updates[`devices/${id}/meta/lastSeen`] = now;

      // Lịch sử: khóa theo mốc 5 phút => ghi đè an toàn khi chạy lại, không trùng
      const bucket = Math.floor(now / HISTORY_BUCKET_MS) * HISTORY_BUCKET_MS;
      updates[`history/${id}/${bucket}`] = { s: d.s, r: d.r, t: d.t, h: d.h, p: d.p };
    }
    await db.ref().update(updates);
  },
});
```

Điểm tối ưu:

- Lô nhiều tin chỉ tốn **một** lệnh ghi Firebase.
- Khóa lịch sử theo mốc thời gian giúp việc chạy lại (retry) không tạo bản ghi trùng, tức hàm **idempotent**.
- Không gọi `console.log` cho từng tin.

### 3.4 Các thói quen cần tránh

- Không dùng `sleep`, vòng lặp chờ hoặc `setTimeout` dài trong Function. Bạn bị tính tiền theo thời gian chạy.
- Không khởi tạo lại Firebase Admin ở mỗi lần gọi (chậm và tốn).
- Không để Function tự gọi lại chính nó hoặc tạo vòng lặp Function → DB → Function.
- Không ghi file tạm lớn hay tải thư viện nặng nếu không cần.
- Đặt `timeout` ngắn (ví dụ 30 giây) để một lỗi không chạy mãi.
- Bật **Application Insights** nhưng với sampling, hoặc tắt hẳn trong giai đoạn demo nếu không cần.

### 3.5 Storage Account đi kèm

Function và Event Hub trigger cần một Storage Account để lưu trạng thái và checkpoint. Dùng **LRS**, hiệu năng Standard, và đặt cùng vùng với Function. Tăng `batchCheckpointFrequency` như trên để giảm giao dịch.

---

## 4. Tối ưu Firebase Realtime Database

### 4.1 Cấu trúc dữ liệu: tách state và lịch sử

```
devices/
  esp32_01/
    state/       ← ghi đè liên tục, app chỉ nghe node này
    cmd/         ← lệnh (nếu dùng Firebase để giữ ý định điều khiển)
    meta/lastSeen
history/
  esp32_01/{ts}: { s, r, t, h, p }     ← mỗi 5 phút/lần
hourly/
  esp32_01/{yyyyMMddHH}: { avgS, minS, maxS, rainMin, pumpSec }
irrigationLog/
  esp32_01/{pushId}: { start, dur, soilBefore, soilAfter, why, stopWhy, auto }
```

- `irrigationLog` chính là bộ đệm 10 lần tưới (`logBuf`) trong code của bạn, đẩy lên cloud để không mất khi ESP32 reset.
- Quy tắc cơ bản: **app không bao giờ nghe node `history`**. Nghe node nào là tải về cả node đó, và đó là phần chi phí chính.

### 4.2 Giảm lượng ghi và tải xuống

- Ghi `state` đã được giảm sẵn ở phía thiết bị (mục 2.3).
- Lịch sử mỗi 5 phút thay vì mỗi tin. Dữ liệu cây trồng không cần dày hơn.
- Dùng `update()` đa đường dẫn như ở mục 3.3.
- Khi đọc lịch sử luôn dùng `limitToLast(n)`; thêm `.indexOn` nếu truy vấn theo trường `ts`.
- Dùng khóa ngắn (`s`, `r`, `t`, `h`, `p`) cho lịch sử và giá trị số, boolean thay vì chuỗi.

Ước lượng dung lượng: một bản ghi lịch sử khoảng 80 byte, mỗi 5 phút thì mỗi ngày 288 bản, khoảng **23 KB/ngày/thiết bị**, gần 8 MB/năm.

### 4.3 Dọn dữ liệu cũ

Realtime Database không có TTL tự động. Dùng một **Timer-trigger Function** chạy 1 lần/ngày:

1. Gộp `history` của ngày hôm trước thành bản trung bình theo giờ trong `hourly/`.
2. Xóa bản ghi `history` cũ hơn 7–30 ngày.

Biểu đồ dài hạn chỉ đọc `hourly/`, không đọc dữ liệu thô.

### 4.4 Lưu ý với giá trị `null`

Firebase **xóa trường có giá trị `null`**. Khi DHT22 lỗi, thiết bị bỏ `t`, `h`; phía app coi "không có trường" là "chưa có dữ liệu", đừng hiểu thành 0.

### 4.5 Bảo mật cũng là tối ưu chi phí

Rules mở hoàn toàn dễ bị người lạ ghi rác hoặc đọc node lớn, làm phình dung lượng và tải xuống. Nên:

- Thiết bị (hoặc Function) có tài khoản riêng chỉ ghi được `devices/{id}/state` và `history/{id}`.
- App của người dùng chỉ đọc thiết bị của mình.
- Dùng `.validate` kiểm tra kiểu và khoảng giá trị (ví dụ `s` là số từ 0 đến 100).
- Khóa service account của Firebase Admin để trong **Application Settings** (hoặc Key Vault), không đưa vào mã nguồn.

Hạn mức gói miễn phí (Spark) của Realtime Database đã có các giới hạn về số kết nối cùng lúc, dung lượng lưu và lượng tải xuống mỗi tháng. Hãy xem trang giá hiện tại. Chú ý rằng **mỗi dashboard mở là một kết nối**.

---

## 5. Giám sát chi phí

1. **Azure Cost Management → Budgets**: tạo ngân sách tháng nhỏ (ví dụ 5–10 USD) và cảnh báo qua email ở mức 50%, 80%, 100%.
2. Theo dõi **IoT Hub → Metrics → Telemetry messages sent** để xem số tin/ngày so với hạn mức.
3. Theo dõi **Function → Metrics** (số lần thực thi, thời gian chạy) và dung lượng log của Application Insights.
4. Firebase: xem tab **Usage** của Realtime Database (kết nối, tải xuống, dung lượng lưu).
5. Xóa các tài nguyên thử nghiệm. Gom mọi thứ vào **một Resource Group** để xóa gọn khi kết thúc dự án.

---

## 6. Checklist nhanh

**Thiết bị (ESP32)**
- [ ] Gửi khi đổi + nhịp tim 60 giây, không gửi cố định 15 giây
- [ ] Payload dưới 512 byte, khóa ngắn, bỏ trường lỗi thay vì `null`
- [ ] Giữ một kết nối MQTT, gửi bù một tin khi mất mạng rồi có lại

**IoT Hub**
- [ ] Free khi phát triển, S1 nếu cần lệnh xuống, B1 nếu chỉ gửi lên
- [ ] Consumer group riêng cho Function, retention 1 ngày
- [ ] Dùng direct method cho lệnh bơm

**Azure Functions**
- [ ] Gói Consumption/Flex Consumption
- [ ] `cardinality: many` + `batchCheckpointFrequency`
- [ ] Log mức Warning, bật sampling cho Application Insights
- [ ] Khởi tạo Firebase Admin ở phạm vi toàn cục, một `update()` mỗi lô
- [ ] Hàm idempotent (khóa lịch sử theo mốc thời gian)

**Firebase Realtime DB**
- [ ] Tách `state` / `history` / `hourly` / `irrigationLog`
- [ ] App chỉ nghe `state`; lịch sử luôn `limitToLast`
- [ ] Hàm dọn dẹp hằng ngày; rules có `.validate`

**Chi phí**
- [ ] Budget + cảnh báo email trên Azure
- [ ] Gom tài nguyên vào một Resource Group