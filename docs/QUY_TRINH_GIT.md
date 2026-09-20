# Quy trình Git và cách push CareDrop

Repository: <https://github.com/tdo129/Fall-Detection-App>

## Trạng thái tại thời điểm rà soát (21/09/2026)

- Nhánh mặc định: `main`.
- Hiện chỉ có một nhánh `main`.
- Chưa có tag/release.
- Lịch sử hiện tại là tuyến tính, chưa dùng Pull Request merge.
- Bản tải về dạng ZIP không chứa thư mục `.git`, nên không thể branch/push trực tiếp một cách an toàn.

## Chiến lược nhánh đề xuất

Dùng GitHub Flow đơn giản:

- `main`: phiên bản ổn định, không push trực tiếp.
- Mỗi thay đổi tạo một branch ngắn hạn.
- Push branch lên GitHub rồi mở Pull Request vào `main`.
- Merge sau khi đã review và kiểm tra.

Quy ước tên branch:

| Loại | Ví dụ |
| --- | --- |
| Tài liệu | `docs/readme-user-guide` |
| Tính năng | `feat/secure-authentication` |
| Sửa lỗi | `fix/settings-clear-history` |
| Bảo mật/cấu hình | `chore/firebase-security-rules` |
| Refactor | `refactor/device-context` |
| Kiểm thử/CI | `chore/ci-typecheck` |

Chưa cần tạo nhánh `develop` khi nhóm còn nhỏ. `develop` chỉ hữu ích khi nhiều luồng phát triển dài hạn phải tích hợp song song.

## Đưa bộ tài liệu hiện tại lên GitHub

### 1. Clone repository sạch

Không chạy `git init` rồi force-push từ thư mục ZIP. Hãy clone để giữ nguyên lịch sử commit:

```powershell
cd C:\Users\phamb\Downloads
git clone https://github.com/tdo129/Fall-Detection-App.git Fall-Detection-App-git
cd Fall-Detection-App-git
```

Nếu đã có một clone Git hợp lệ:

```powershell
git switch main
git pull --ff-only origin main
```

### 2. Tạo branch tài liệu

```powershell
git switch -c docs/readme-user-guide
```

### 3. Chép file tài liệu

Chép các file sau từ thư mục đang làm việc vào clone Git:

```text
README.md
docs/HUONG_DAN_SU_DUNG.md
docs/QUY_TRINH_GIT.md
```

Hai file hướng dẫn phải nằm trong thư mục `docs/`. Nếu đặt cả ba file ở thư mục gốc, liên kết tương đối trong `README.md` sẽ bị hỏng trên GitHub.

Không chép `node_modules`, `.expo`, `android`, `ios` hoặc file build.

### 4. Kiểm tra thay đổi

```powershell
git status --short
git diff --check
git diff -- README.md docs/HUONG_DAN_SU_DUNG.md docs/QUY_TRINH_GIT.md
```

Kết quả mong đợi chỉ gồm các file tài liệu vừa thêm.

### 5. Commit

```powershell
git add README.md docs/HUONG_DAN_SU_DUNG.md docs/QUY_TRINH_GIT.md
git commit -m "docs: add project README and usage guides"
```

### 6. Push branch

Nếu tài khoản có quyền ghi vào repository:

```powershell
git push -u origin docs/readme-user-guide
```

Nếu dùng HTTPS, GitHub yêu cầu đăng nhập qua Git Credential Manager hoặc Personal Access Token; mật khẩu GitHub thông thường không dùng để push Git qua HTTPS.

### 7. Mở Pull Request

Trên GitHub, tạo Pull Request:

```text
base:    main
compare: docs/readme-user-guide
```

Tiêu đề đề xuất:

```text
docs: add project README and usage guides
```

Nội dung PR đề xuất:

```markdown
## Thay đổi

- Thêm README tổng quan kiến trúc và cách cài đặt.
- Thêm hướng dẫn sử dụng cho người dùng/tester.
- Thêm quy trình branch, commit và push cho nhóm.
- Ghi rõ trạng thái prototype và các giới hạn bảo mật hiện tại.

## Kiểm tra

- [x] Đối chiếu lệnh với package.json.
- [x] Đối chiếu schema với source hiện tại.
- [x] Không thay đổi mã nguồn ứng dụng.
```

## Nếu không có quyền push vào repository

1. Fork repository vào tài khoản của bạn trên GitHub.
2. Clone fork.
3. Thêm repository gốc làm `upstream`.
4. Tạo branch và push lên fork.
5. Mở Pull Request từ fork về `tdo129/Fall-Detection-App:main`.

Ví dụ:

```powershell
git clone https://github.com/<username>/Fall-Detection-App.git
cd Fall-Detection-App
git remote add upstream https://github.com/tdo129/Fall-Detection-App.git
git fetch upstream
git switch -c docs/readme-user-guide upstream/main
git push -u origin docs/readme-user-guide
```

## Quy trình cho các thay đổi tiếp theo

Luôn cập nhật `main` trước khi tạo branch:

```powershell
git switch main
git pull --ff-only origin main
git switch -c fix/settings-clear-history
```

Sau khi chỉnh sửa:

```powershell
git status
git diff --check
npm ci
npx tsc --noEmit
npx expo-doctor
git add <cac-file-lien-quan>
git commit -m "fix: clear history from settings screen"
git push -u origin fix/settings-clear-history
```

Không dùng `git add .` theo thói quen khi chưa xem `git status`; hãy chỉ stage file thuộc đúng phạm vi PR.

Hiện tại `npx expo-doctor` sẽ báo lỗi `assets/logo.png` là JPEG nhưng mang đuôi PNG. Đây là lỗi có sẵn của source, không phải do PR tài liệu tạo ra. Sửa lỗi asset trên một branch riêng.

## Thứ tự branch nên triển khai

Sau PR tài liệu, nên tách các vấn đề thành những branch độc lập:

1. `fix/settings-clear-history` — sửa nút xóa lịch sử trong Cài đặt.
2. `fix/history-device-scope` — tách lịch sử theo user/device và ngăn xóa dữ liệu toàn cục.
3. `fix/history-ack-device` — xác nhận đúng sự kiện của thiết bị đang cảnh báo.
4. `fix/expo-icon` — chuyển logo sang PNG thật để Expo Doctor đạt đầy đủ kiểm tra.
5. `feat/secure-authentication` — thay WebView scraping bằng OAuth/Firebase Auth chuẩn.
6. `feat/device-pairing` — thêm token hoặc mã ghép nối xác minh thiết bị.
7. `chore/firebase-security-rules` — đưa rules, indexes và emulator config vào version control.
8. `feat/live-rescuer-location` — lấy GPS thật của điện thoại và truyền sự kiện lịch sử vào bản đồ.
9. `chore/background-task` — chuyển khỏi `expo-background-fetch` legacy/deprecated.
10. `chore/dependency-audit` — cập nhật dependency an toàn, không dùng `npm audit fix --force` thiếu kiểm thử.
11. `chore/ci-typecheck` — thêm script typecheck/lint và GitHub Actions.

Không gộp tất cả các thay đổi trên vào một branch vì sẽ khó review và khó quay lui khi có lỗi.

## Quy ước commit

Khuyến nghị dùng Conventional Commits:

```text
docs: add installation guide
feat: add verified device pairing
fix: scope fall history by user
refactor: split device listeners into hooks
chore: add Firestore rules and CI
```

Mỗi commit nên:

- Chỉ giải quyết một mục đích rõ ràng.
- Không chứa file build hoặc thông tin bí mật.
- Có message ở thể mệnh lệnh, ngắn gọn.
- Build/typecheck được trước khi push nếu môi trường cho phép.

## Bảo vệ nhánh `main`

Trong GitHub repository settings, nên tạo branch protection/ruleset cho `main`:

- Require a pull request before merging.
- Require at least một approval nếu nhóm có từ hai người.
- Block force pushes.
- Block branch deletion.
- Require status checks sau khi đã có CI.

## Quản lý cấu hình Firebase

- Không commit Firebase Admin SDK/service-account JSON, private key hoặc token.
- `google-services.json` và Firebase web config là client configuration, nhưng vẫn nên dùng Firebase project riêng theo môi trường và áp dụng Security Rules/API restrictions.
- Trước khi public repository, kiểm tra lịch sử Git bằng công cụ secret scanning.
- Nếu một secret thực sự từng bị commit, xóa file ở commit mới là chưa đủ; phải thu hồi/rotate secret và làm sạch lịch sử nếu cần.

## Kiểm tra giấy phép

File `LICENSE` hiện dùng mẫu MIT nhưng dòng bản quyền thuộc `650 Industries, Inc. (Expo)`. Trước khi tạo release, chủ dự án cần xác nhận quyền cấp phép và cập nhật bản quyền phù hợp với mã nguồn CareDrop.

## Tạo release đầu tiên

Sau khi tài liệu, lỗi quan trọng và security baseline được merge, có thể tạo release thử nghiệm:

```powershell
git switch main
git pull --ff-only origin main
git tag -a v0.1.0 -m "CareDrop prototype v0.1.0"
git push origin v0.1.0
```

Chỉ tạo tag khi commit trên `main` đã được kiểm tra; không di chuyển lại một tag đã phát hành.
