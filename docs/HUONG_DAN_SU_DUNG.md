# Hướng dẫn sử dụng CareDrop

Tài liệu này dành cho người dùng thử nghiệm, người chăm sóc và thành viên phát triển cần kiểm tra toàn bộ luồng CareDrop.

> [!CAUTION]
> CareDrop hiện là ứng dụng mẫu, không phải thiết bị y tế và không thay thế cuộc gọi cấp cứu, người chăm sóc hoặc hệ thống cảnh báo chuyên dụng.

## 1. Chuẩn bị

Trước khi sử dụng, cần có:

- Một development build CareDrop đã được cài trên điện thoại Android.
- Internet ổn định.
- Quyền nhận thông báo và rung được bật.
- Firebase project đã cấu hình đúng.
- Device ID của thiết bị ESP32, ví dụ `ESP32_FALL_001`.

Để kiểm thử giao diện, chưa bắt buộc phải có ESP32 thật vì app có chức năng giả lập sự kiện trên Firestore.

## 2. Đăng nhập

1. Mở CareDrop.
2. Chọn **Tiếp tục với Google**.
3. Đăng nhập trong cửa sổ WebView của Google.
4. Sau khi trang tài khoản xuất hiện, app sẽ cố tự nhận diện email.
5. Nếu app chưa chuyển màn hình, chọn **Vào app** ở góc trên bên phải.

Thông tin profile được lưu trên điện thoại để duy trì phiên sau khi mở lại app.

> [!IMPORTANT]
> Đây là luồng đăng nhập demo dựa trên việc đọc email trong WebView, không phải Google OAuth hoặc Firebase Authentication chuẩn. Không sử dụng luồng này để bảo vệ dữ liệu thật.

## 3. Cho phép thông báo

Ở lần chạy đầu, hệ điều hành có thể hỏi quyền gửi notification. Chọn **Cho phép** để nhận:

- Cảnh báo té ngã.
- Cảnh báo pin thiết bị thấp.
- Notification thử từ màn hình Cài đặt.

Nếu đã từ chối, mở cài đặt hệ thống của điện thoại, tìm CareDrop và bật lại quyền thông báo.

## 4. Thêm thiết bị

Có hai cách mở form thêm thiết bị:

- Từ màn hình **Tổng quan**, chọn thông báo chưa có thiết bị hoặc nút **Thêm**.
- Từ **Cài đặt**, chọn **Thêm thiết bị phần cứng mới**.

Sau đó:

1. Nhập đúng Device ID mà ESP32 dùng làm document ID trên Firestore.
2. Nhập tên gợi nhớ, ví dụ `Thiết bị của Bà`.
3. Chọn **Ghép nối & Giám sát ngay**.

Các mã preset dùng để thử giao diện gồm:

- `ESP32_FALL_001`
- `ESP32_FALL_002`
- `ESP32_FALL_003`

Nếu document chưa tồn tại, phiên bản hiện tại tự tạo dữ liệu mẫu với pin 100% và tọa độ mẫu tại TP.HCM. Việc thêm thành công không chứng minh thiết bị thuộc quyền sở hữu của người dùng.

## 5. Màn hình Tổng quan

Màn hình hiển thị:

- Thiết bị đang chọn.
- Trạng thái bình thường hoặc phát hiện té ngã.
- Mức pin.
- Trạng thái kết nối Firebase.
- GPS gần nhất.
- Thời gian sự cố gần nhất.
- Nút chế độ khẩn cấp.

Nếu đã ghép nhiều thiết bị, dùng thanh thiết bị phía trên để chuyển thiết bị đang xem. App vẫn tạo listener cho tất cả thiết bị đã ghép.

### Chế độ khẩn cấp SOS

Chọn **Kích hoạt khẩn cấp** để ghi:

```json
{
  "emergency_mode": true
}
```

vào document thiết bị đang chọn. Chọn lại để đặt thành `false`.

Nút này không tự gọi điện, gửi SMS hay liên hệ bệnh viện. Hành vi thực tế phụ thuộc firmware ESP32 hoặc backend theo dõi trường `emergency_mode`.

## 6. Kiểm thử té ngã không cần ESP32

1. Mở **Cài đặt**.
2. Tìm thiết bị cần kiểm thử.
3. Chọn **Thử té ngã (Firebase)**.
4. App ghi `fall_detected: true` và thời gian hiện tại vào Firestore.
5. Realtime listener sẽ nhận thay đổi và kích hoạt cảnh báo.

Để thử lại cùng thiết bị:

1. Chọn **Tắt té ngã** hoặc xác nhận cảnh báo.
2. Kiểm tra `fall_detected` đã trở về `false`.
3. Kích hoạt lần thử tiếp theo.

Ứng dụng tạo sự kiện khi listener thấy `fall_detected: true` trong khi trạng thái trước đó trong bộ nhớ chưa phải `true`. Nếu app vừa khởi động lại mà Firestore vẫn đang giữ `true`, cảnh báo có thể xuất hiện lại.

## 7. Xử lý cảnh báo té ngã

Khi app phát hiện sự kiện mới:

1. Điện thoại rung, tối đa khoảng 30 giây.
2. Một notification cục bộ được gửi.
3. Modal cảnh báo toàn màn hình hiển thị thiết bị và tọa độ.
4. Sự kiện được lưu vào lịch sử local và Firestore.

Sau khi đã kiểm tra tình trạng người đeo, chọn:

**Đã kiểm tra — Tắt cảnh báo**

App sẽ:

- Dừng rung.
- Đóng modal.
- Ghi `ack_fall: true`.
- Đặt `fall_detected: false` cho thiết bị.
- Đánh dấu một bản ghi lịch sử là đã xử lý.

> [!WARNING]
> Phiên bản hiện tại đánh dấu `fallEvents[0]` thay vì tìm bản ghi theo thiết bị đang cảnh báo. Khi nhiều thiết bị phát sinh sự kiện gần nhau, ứng dụng có thể đánh dấu nhầm bản ghi lịch sử. Cần kiểm tra lại tab Lịch sử sau khi xác nhận.

Nếu có nguy hiểm thật, hãy sử dụng số điện thoại cấp cứu và quy trình hỗ trợ ngoài ứng dụng.

## 8. Bản đồ cứu hộ

Tab **Bản đồ** hiển thị:

- Marker của thiết bị/người bị té, lấy từ thiết bị đang active.
- Marker người cứu hộ với tọa độ mẫu hiện được viết cứng trong code.
- Tuyến đường lái xe từ OSRM.
- Khoảng cách và thời gian di chuyển ước tính.
- Ba chế độ tile: tối, đường phố và vệ tinh.
- Nút mở Google Maps để điều hướng ngoài ứng dụng.

Bản đồ cần Internet vì Leaflet, tile OpenStreetMap/Esri và OSRM được tải từ dịch vụ bên ngoài.

Lưu ý: app chưa xin quyền hoặc đọc GPS thật của điện thoại. Tọa độ người cứu hộ hiện tại là dữ liệu mẫu tại Thủ Đức.

## 9. Lịch sử sự kiện

Tab **Lịch sử** hỗ trợ:

- Xem tất cả sự kiện.
- Lọc sự kiện trong hôm nay.
- Lọc sự kiện trong 7 ngày gần nhất.
- Kéo xuống để tải lại.
- Đánh dấu một sự kiện là đã xử lý.
- Xóa lịch sử.

> [!CAUTION]
> Chỉ dùng nút **Xóa** trên Firebase project thử nghiệm riêng. Hàm xóa hiện xóa toàn bộ document trong collection `fall_events`, không lọc theo tài khoản hoặc thiết bị. Không sử dụng chức năng này trên cơ sở dữ liệu dùng chung hoặc production.

Nút xóa trong màn hình Cài đặt cũng đang bị lỗi: nó chỉ tải lại lịch sử nhưng vẫn hiển thị thông báo đã xóa. Nút xóa trong tab Lịch sử gọi đúng hàm xóa, tuy nhiên vẫn chịu rủi ro xóa toàn cục nêu trên.

Nút **Xem map** hiện chỉ chuyển sang tab Bản đồ; chưa hiển thị chính xác tọa độ của sự kiện lịch sử được chọn.

## 10. Cài đặt

### Quản lý thiết bị

- Chạm một thiết bị để đặt làm thiết bị đang xem.
- Dùng nút giả lập để bật/tắt trạng thái té ngã.
- Chọn **Gỡ** để bỏ thiết bị khỏi tài khoản trên app.

Gỡ ghép nối không xóa document `devices/{deviceId}` trên Firestore.

### Ngưỡng pin thấp

Ngưỡng có thể điều chỉnh từ 5% đến 50%, mỗi bước 5%. Khi pin đi xuống bằng hoặc thấp hơn ngưỡng, app gửi một cảnh báo.

### Thông báo

- **Cảnh báo té ngã**: bật/tắt notification và alarm khi app đang hoạt động.
- **Test thông báo**: gửi một notification cục bộ ngay lập tức.

Tắt **Cảnh báo té ngã** chỉ ngăn rung và notification. Realtime listener vẫn có thể mở modal cảnh báo và lưu sự kiện vào lịch sử.

### Giám sát nền

Khi bật **Chạy nền**, app đăng ký Background Fetch để kiểm tra các thiết bị định kỳ.

Tần suất thực tế do Android/iOS quyết định. Mốc 60 giây trong code chỉ là yêu cầu tối thiểu; hệ điều hành có thể chạy sau 15–30 phút hoặc lâu hơn, đặc biệt khi tiết kiệm pin. Đây không phải kênh realtime đáng tin cậy như server push/FCM.

### Đăng xuất

Đăng xuất xóa profile đã lưu trên điện thoại. Danh sách thiết bị đã được đồng bộ trong `users/{email}` có thể được tải lại ở lần đăng nhập sau.

## 11. Kiểm thử với Firestore Console

Để kích hoạt một sự kiện thủ công, mở `devices/{deviceId}` và cập nhật:

```json
{
  "fall_detected": true,
  "ack_fall": false,
  "fall_time": "2026-09-21T08:30:00.000Z",
  "latitude": 10.8505,
  "longitude": 106.7739,
  "battery_pct": 85,
  "last_updated": "2026-09-21T08:30:00.000Z"
}
```

Trước lần thử tiếp theo, đặt `fall_detected` về `false`.

## 12. Khắc phục lỗi thường gặp

### Không nhận cảnh báo

- Kiểm tra quyền notification trong cài đặt hệ thống.
- Kiểm tra công tắc cảnh báo trong CareDrop.
- Xác nhận Device ID khớp chính xác document Firestore.
- Đảm bảo `fall_detected` đã chuyển từ `false` sang `true`.
- Kiểm tra Firestore Security Rules và kết nối Internet.

### App báo offline nhưng Firestore vẫn có dữ liệu

Chỉ báo kết nối hiện là một trạng thái dùng chung cho tất cả thiết bị. Nó chuyển thành online khi bất kỳ listener Firestore nào trả kết quả, chưa kiểm tra trường `connected`, độ cũ của `last_updated` hoặc đặt lại offline khi listener lỗi. Hãy kiểm tra trực tiếp timestamp, document thiết bị và log ứng dụng trước khi kết luận ESP32 còn online.

### Bản đồ trắng hoặc không có tuyến đường

- Kiểm tra Internet.
- Kiểm tra WebView có tải được `unpkg.com`, OpenStreetMap/Esri và OSRM hay không.
- Xác nhận latitude/longitude là số hợp lệ.
- Thử mở lại tab Bản đồ.

### Background task không chạy mỗi phút

Đây là hành vi bình thường. Hệ điều hành quyết định lịch chạy và có thể trì hoãn mạnh khi bật tiết kiệm pin hoặc app ít được sử dụng.

### Firestore báo `permission-denied`

Kiểm tra Security Rules và trạng thái Authentication. Phiên bản hiện tại chưa dùng Firebase Auth chuẩn, nên rules production theo user sẽ cần thay đổi kiến trúc đăng nhập trước.

### `expo-doctor` báo lỗi asset

`assets/logo.png` đang mang đuôi `.png` nhưng nội dung thật là JPEG. Cần xuất lại logo thành PNG thật rồi chạy lại:

```bash
npx expo-doctor
```

Tại thời điểm rà soát, Expo Doctor đạt 20/21 kiểm tra vì lỗi asset này.

### `npm audit` báo dependency có lỗ hổng

Lockfile hiện tại báo 15 lỗ hổng mức trung bình trong chuỗi dependency runtime. Không chạy `npm audit fix --force` ngay vì npm đề xuất thay đổi có thể làm hạ Expo xuống phiên bản không tương thích. Hãy cập nhật dependency trên một branch riêng và kiểm thử lại toàn bộ app.

## 13. Checklist demo

- [ ] Development build đã cài trên điện thoại thật.
- [ ] App truy cập được Firestore.
- [ ] Quyền notification đã bật.
- [ ] Đã thêm ít nhất một Device ID.
- [ ] Thiết bị hiển thị pin và GPS.
- [ ] Giả lập `false → true` mở modal và rung.
- [ ] Xác nhận cảnh báo đưa thiết bị về `fall_detected: false`.
- [ ] Sự kiện xuất hiện trong tab Lịch sử.
- [ ] Bản đồ hiển thị marker và tuyến đường.
- [ ] Nút SOS thay đổi `emergency_mode` trên Firestore.
- [ ] Không dùng chức năng xóa lịch sử trên Firestore dùng chung/production.
