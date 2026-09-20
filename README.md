# CareDrop

Ứng dụng di động giám sát thiết bị đeo ESP32 phát hiện té ngã, đồng bộ trạng thái qua Firebase Firestore và cảnh báo cho người chăm sóc.

> [!WARNING]
> CareDrop hiện là sản phẩm mẫu phục vụ học tập/đồ án. Không sử dụng ứng dụng như thiết bị y tế hoặc kênh cứu hộ duy nhất. Cơ chế đăng nhập, phân quyền Firestore và ghép thiết bị cần được hoàn thiện trước khi triển khai thực tế.

> [!IMPORTANT]
> Repository này **chỉ chứa ứng dụng giám sát**. Repository không có firmware ESP32, code đọc cảm biến, sơ đồ phần cứng hoặc thuật toán/AI phát hiện té ngã. Phần cứng bên ngoài phải tự xác định sự kiện rồi cập nhật dữ liệu lên Firestore.

## Chức năng chính

- Theo dõi đồng thời nhiều thiết bị ESP32 qua Firestore realtime.
- Hiển thị trạng thái té ngã, pin, GPS và kết nối của thiết bị đang chọn.
- Cảnh báo té ngã bằng modal toàn màn hình, rung và thông báo cục bộ.
- Cảnh báo khi pin thiết bị bằng hoặc thấp hơn ngưỡng cấu hình.
- Lưu lịch sử sự kiện ở AsyncStorage và Firestore.
- Hiển thị bản đồ cứu hộ bằng Leaflet/OpenStreetMap và lấy tuyến đường qua OSRM.
- Bật/tắt chế độ khẩn cấp bằng trường `emergency_mode` trên Firestore.
- Kiểm tra thiết bị định kỳ khi ứng dụng chạy nền, tùy theo lịch do hệ điều hành cấp.
- Có chức năng giả lập té ngã trực tiếp từ màn hình Cài đặt để kiểm thử.

## Phạm vi repository

| Có trong repository | Không có trong repository |
| --- | --- |
| Ứng dụng React Native/Expo | Firmware ESP32 (`.ino`, `.c`, `.cpp`) |
| Kết nối Firebase Firestore | Code đọc MPU6050 hoặc cảm biến khác |
| Giao diện cảnh báo, bản đồ và lịch sử | Thuật toán/AI nhận diện té ngã |
| Giả lập trạng thái té ngã để kiểm thử | Sơ đồ nguyên lý và sơ đồ đấu nối |

Luồng `ESP32 → Firestore` trong tài liệu là giao thức tích hợp dự kiến. Code thực hiện phía ESP32 không nằm trong repository này.

## Luồng dữ liệu

```text
ESP32
  │ cập nhật trạng thái
  ▼
Firestore: devices/{deviceId}
  │
  ├── Realtime listener khi ứng dụng đang mở
  └── Background Fetch khi ứng dụng ở nền
          │
          ▼
CareDrop
  ├── modal + rung + thông báo cục bộ
  ├── lưu fall_events và AsyncStorage
  └── hiển thị vị trí/lộ trình cứu hộ
```

## Công nghệ

- Expo SDK `~57.0.20`
- React Native `0.86.3`
- React `19.2.3`
- TypeScript strict mode
- Firebase JS SDK / Cloud Firestore
- Expo Notifications, Task Manager và Background Fetch
- React Navigation
- Leaflet, OpenStreetMap và OSRM qua WebView

## Trạng thái nền tảng

| Nền tảng | Trạng thái |
| --- | --- |
| Android | Nền tảng chính; package hiện tại là `com.doanapp` |
| iOS | Chưa hoàn tất Firebase native config và `bundleIdentifier` |
| Web | Chưa được cấu hình/kiểm thử đầy đủ; các chức năng native không tương đương mobile |

Do dự án có `expo-dev-client` và React Native Firebase config plugin, development build là luồng chạy được khuyến nghị; không nên xem Expo Go là môi trường kiểm thử chính.

## Yêu cầu hệ thống

- Git.
- Node.js `22.13.x` trở lên, phù hợp với Expo SDK 57.
- npm.
- Kết nối Internet để truy cập Firebase, tile bản đồ và OSRM.
- Android Studio cùng Android SDK, emulator hoặc điện thoại Android bật USB debugging.
- macOS và Xcode nếu phát triển cho iOS.

Nên dùng điện thoại thật khi kiểm tra rung, notification và tác vụ nền.

## Cài đặt nhanh

```bash
git clone https://github.com/tdo129/Fall-Detection-App.git
cd Fall-Detection-App
npm ci
```

### Chạy Android

Khởi động emulator hoặc kết nối điện thoại, sau đó chạy:

```bash
npm run android
```

Lệnh này gọi `expo run:android`, tự tạo thư mục native nếu chưa có, build và cài development client.

Sau khi development build đã được cài, nếu chỉ sửa TypeScript/JavaScript thì có thể khởi động Metro bằng:

```bash
npm start
```

Khi thay đổi dependency native, plugin hoặc `app.json`, tạo lại native project rồi build lại:

```bash
npx expo prebuild --clean
npm run android
```

### Chạy iOS

iOS hiện cần bổ sung cấu hình Firebase trước khi build. Sau khi cấu hình xong, trên macOS chạy:

```bash
npm run ios
```

## Cấu hình Firebase

Repository đang chứa cấu hình của Firebase project mẫu. Khi triển khai dự án riêng, hãy tạo Firebase project mới và thay toàn bộ cấu hình tương ứng.

### 1. Tạo project và Firestore

1. Tạo project tại [Firebase Console](https://console.firebase.google.com/).
2. Bật Cloud Firestore.
3. Đăng ký một Firebase Web App.
4. Thay object `firebaseConfig` trong `src/services/firebaseConfig.ts` bằng cấu hình của Web App mới.

### 2. Cấu hình Android

1. Đăng ký Android App với package `com.doanapp`.
2. Tải `google-services.json`.
3. Đặt file tại thư mục gốc dự án.
4. Nếu đổi package, cập nhật đồng thời `android.package` trong `app.json` và đăng ký lại Android App trên Firebase.

### 3. Cấu hình iOS

Để hỗ trợ iOS cần thực hiện thêm:

1. Thêm một `ios.bundleIdentifier` duy nhất vào `app.json`.
2. Đăng ký iOS App tương ứng trên Firebase.
3. Tải `GoogleService-Info.plist` và khai báo `ios.googleServicesFile` trong `app.json`.
4. Chạy lại `npx expo prebuild --clean`.

### 4. Security Rules

Repository chưa chứa `firestore.rules` và ứng dụng chưa dùng Firebase Authentication thực sự. Không mở quyền đọc/ghi công khai cho dữ liệu production. Firebase client API key không phải server secret, nhưng khả năng bảo vệ dữ liệu phụ thuộc vào Authentication, Security Rules và giới hạn API key phù hợp.

## Cấu trúc Firestore

### `devices/{deviceId}`

| Trường | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `device_id` | string | Mã phần cứng, phải khớp document ID |
| `fall_detected` | boolean | Thiết bị đang báo té ngã |
| `latitude` | number | Vĩ độ GPS |
| `longitude` | number | Kinh độ GPS |
| `battery_pct` | number | Phần trăm pin từ 0 đến 100 |
| `fall_time` | string | Thời điểm té ngã dạng ISO-8601 |
| `ack_fall` | boolean | Ứng dụng đã xác nhận sự cố |
| `emergency_mode` | boolean | Yêu cầu chế độ khẩn cấp |
| `connected` | boolean | Trạng thái do thiết bị cung cấp |
| `last_updated` | string | Lần cập nhật gần nhất dạng ISO-8601 |

Ví dụ:

```json
{
  "device_id": "ESP32_FALL_001",
  "fall_detected": false,
  "latitude": 10.8505,
  "longitude": 106.7739,
  "battery_pct": 85,
  "fall_time": "2026-09-21T08:30:00.000Z",
  "ack_fall": false,
  "emergency_mode": false,
  "connected": true,
  "last_updated": "2026-09-21T08:30:00.000Z"
}
```

### `users/{lowercaseEmail}`

Lưu profile người dùng và danh sách thiết bị:

```json
{
  "uid": "user@example.com",
  "email": "user@example.com",
  "displayName": "Nguyen Van A",
  "photoURL": "",
  "lastLoginAt": "2026-09-21T08:00:00.000Z",
  "pairedDevices": [
    {
      "id": "ESP32_FALL_001",
      "name": "Thiết bị của Bà",
      "addedAt": "2026-09-21T08:05:00.000Z"
    }
  ]
}
```

### `fall_events/{autoId}`

```json
{
  "deviceId": "ESP32_FALL_001",
  "timestamp": "2026-09-21T08:30:00.000",
  "latitude": 10.8505,
  "longitude": 106.7739,
  "battery_pct": 85,
  "acknowledged": false,
  "createdAt": "2026-09-21T08:30:01.000Z"
}
```

## Giao thức tối thiểu cho ESP32

1. Firmware ghi dữ liệu vào `devices/{deviceId}`; document ID phải trùng mã người dùng ghép trong app.
2. Khi phát hiện một lần té ngã mới, cập nhật `fall_detected` từ `false` sang `true`, đồng thời cập nhật GPS, pin, `fall_time`, `last_updated` và đặt `ack_fall: false`.
3. App xem chuyển trạng thái `false → true` là một sự kiện mới.
4. Khi người chăm sóc xác nhận, app ghi `ack_fall: true` và `fall_detected: false`.
5. Firmware có thể theo dõi `emergency_mode` để tăng tần suất gửi GPS hoặc thực hiện hành động khẩn cấp riêng.

Khi người dùng nhập một Device ID chưa tồn tại, phiên bản hiện tại tự tạo document mẫu. Đây chỉ là tiện ích kiểm thử, không phải cơ chế xác minh quyền sở hữu thiết bị.

## Cấu trúc dự án

```text
.
├── App.tsx                         # Provider và cổng đăng nhập
├── index.ts                        # Entry point và đăng ký background task
├── app.json                        # Expo/native configuration
├── assets/                         # Logo và icon
├── docs/
│   ├── HUONG_DAN_SU_DUNG.md        # Hướng dẫn cho người dùng/tester
│   └── QUY_TRINH_GIT.md            # Quy trình branch, commit và push
└── src/
    ├── components/                 # UI dùng lại và modal cảnh báo
    ├── constants/                  # Theme
    ├── context/                    # AuthContext và DeviceContext
    ├── navigation/                 # Bottom tab navigation
    ├── screens/                    # Tổng quan, bản đồ, lịch sử, cài đặt
    ├── services/                   # Firebase, notification, history, alarm, background
    └── types/                      # TypeScript interfaces
```

## Scripts

| Lệnh | Chức năng |
| --- | --- |
| `npm start` | Khởi động Expo/Metro |
| `npm run android` | Build và chạy development client Android |
| `npm run ios` | Build và chạy iOS trên macOS |
| `npm run web` | Khởi động target web; hiện chưa được hỗ trợ đầy đủ |
| `npx tsc --noEmit` | Kiểm tra TypeScript thủ công |
| `npx expo-doctor` | Kiểm tra cấu hình và tính tương thích của Expo |
| `npm audit --omit=dev` | Kiểm tra cảnh báo bảo mật trong dependency runtime |

Dự án hiện chưa có test runner, lint script hoặc CI.

## Hướng dẫn sử dụng

Xem [Hướng dẫn sử dụng CareDrop](docs/HUONG_DAN_SU_DUNG.md) để biết cách đăng nhập, ghép thiết bị, giả lập té ngã, xử lý cảnh báo, dùng bản đồ và khắc phục lỗi thường gặp.

## Quy trình đóng góp

Không push trực tiếp vào `main`. Mỗi thay đổi nên nằm trong một branch và Pull Request riêng. Xem [Quy trình Git và cách push](docs/QUY_TRINH_GIT.md).

## Giới hạn đã biết

- Đăng nhập hiện tại lấy email từ trang Google trong WebView; đây không phải OAuth/Firebase Auth chuẩn và không cung cấp token xác thực cho Firestore.
- Ghép thiết bị chỉ dựa trên Device ID, chưa có pairing secret hoặc kiểm tra quyền sở hữu.
- `fall_events` và lịch sử local chưa được tách theo tài khoản. Hàm `clearFallHistory()` xóa toàn bộ collection `fall_events`, không lọc theo người dùng hoặc thiết bị; không sử dụng trên cơ sở dữ liệu dùng chung/production.
- Nút xóa lịch sử trong màn hình Cài đặt gọi `refreshHistory()` thay vì hàm xóa nhưng vẫn báo hoàn tất. Nút xóa trong tab Lịch sử gọi đúng hàm, tuy nhiên hàm đó đang xóa dữ liệu toàn cục như cảnh báo phía trên.
- Khi xác nhận modal té ngã, ứng dụng đánh dấu `fallEvents[0]` thay vì tìm sự kiện theo thiết bị đang cảnh báo; có thể xác nhận nhầm bản ghi khi nhiều thiết bị có sự cố gần nhau.
- Vị trí người cứu hộ trên bản đồ đang dùng tọa độ mẫu, chưa lấy GPS thật của điện thoại.
- “Xem map” từ một sự kiện lịch sử chưa truyền tọa độ riêng của sự kiện sang bản đồ.
- Background Fetch do hệ điều hành lên lịch, có thể bị trì hoãn và không thay thế push notification realtime.
- `expo-background-fetch` đang là API legacy/deprecated trong Expo SDK 57; nên lập kế hoạch chuyển sang `expo-background-task`.
- Notification hiện là thông báo cục bộ; dự án chưa đăng ký FCM token hoặc có server gửi push.
- `isConnected` là trạng thái dùng chung cho mọi thiết bị và được đặt thành `true` khi bất kỳ listener nào trả kết quả. Nó chưa kiểm tra document có tồn tại, trường `connected`, độ cũ của `last_updated` hoặc đặt lại `false` khi listener lỗi, nên không phản ánh chính xác trạng thái online của từng ESP32.
- Một số cài đặt giao diện chưa được lưu bền vững sau khi khởi động lại app.
- Phiên bản trong `package.json`/`app.json` là `1.0.0`, trong khi màn hình Cài đặt đang hiển thị `1.2.0`.
- `assets/logo.png` mang đuôi `.png` nhưng nội dung thật là JPEG; `npx expo-doctor` hiện đạt 20/21 kiểm tra và báo lỗi asset này.
- Với lockfile tại thời điểm rà soát, `npm audit --omit=dev` báo 15 lỗ hổng mức trung bình trong chuỗi dependency. Không chạy `npm audit fix --force` khi chưa kiểm tra breaking changes.

## Tài liệu tham khảo

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo: Using Firebase](https://docs.expo.dev/guides/using-firebase/)
- [Firebase Console](https://console.firebase.google.com/)

## Giấy phép

Repository có file [LICENSE](LICENSE) theo mẫu MIT, nhưng dòng bản quyền hiện ghi `650 Industries, Inc. (Expo)`. Chủ dự án cần xác nhận quyền cấp phép và cập nhật dòng bản quyền phù hợp trước khi phát hành chính thức.
