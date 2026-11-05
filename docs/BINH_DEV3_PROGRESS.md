# Tổng hợp tiến độ Dev 3 — Bình

- Ngày cập nhật: 06/11/2026.
- Project: quiz-motion.
- Nhánh làm việc: `feature/game-hold-service`, phát triển từ `dev`.
- Phạm vi: random hành động, quản lý trạng thái game, giữ tư thế, mock submit và tích hợp giao diện.
- Trạng thái: đã chạy được luồng game bằng đầu vào giả lập và API mock; chưa hoàn thành tích hợp camera và API thật.

## 1. Kết quả đã đạt được

Luồng hiện tại:

```text
Nạp câu hỏi → random 4 hành động → nhận frame giả lập
→ ánh xạ hành động sang ID đáp án → giữ liên tục 1.500 ms
→ chốt một lần → gửi MockQuizGateway → SUBMITTED hoặc ERROR
```

Giao diện nhận trạng thái thật qua subscription. Người dùng có thể thử luồng này trong chế độ **Play game (mock)** của playground. Chế độ **UI preview** của Dũng vẫn được giữ riêng để mô phỏng giao diện thủ công.

### 1.1. Randomizer

File chính: `apps/web/features/game/domain/action-randomizer.ts`.

- Chọn bốn hành động khác nhau từ pool tám hành động bằng Fisher–Yates.
- Nhận hàm `rng` từ bên ngoài để kiểm thử có kết quả xác định.
- Gán hành động vào đúng `option.id`, không phụ thuộc A/B/C/D hoặc vị trí hiển thị.
- Hỗ trợ ID đặc biệt như `__proto__` bằng record không có prototype.
- Kiểm tra câu hỏi và mapping bằng schema/contracts sẵn có.
- Không sửa câu hỏi hay pool hành động đầu vào; từ chối giá trị RNG ngoài `[0, 1)`.
- Trong live runtime, mapping giữ nguyên trong một lượt câu hỏi. Chuyển câu hoặc restart tạo lượt mới và random lại; chưa cache mapping khi quay lại câu cũ.

### 1.2. Hold detector

File chính: `apps/web/features/game/domain/hold-detector.ts`.

- Tính thời gian giữ bằng timestamp đơn điệu; mặc định đủ 1.500 ms mới xác nhận.
- Trả candidate, confirmed option, progress từ 0 đến 1 và `justConfirmed`.
- Reset tiến độ khi đổi đáp án ứng viên, mất nhận diện hoặc khoảng ngắt frame vượt giới hạn.
- Bỏ qua frame cũ hoặc trùng timestamp.
- Chỉ xác nhận một lần và khóa kết quả đến khi gọi `reset()`.
- Kiểm tra cấu hình thời gian và timestamp đầu vào.

### 1.3. Game session

File chính: `apps/web/features/game/application/game-session.ts`.

- Nối randomizer, hold detector và port `QuizGateway`.
- Cung cấp `getState()`, `subscribe()`, `selectQuestion()`, `processFrame()`, `checkTimeout()` và `reset()`.
- Tầng application độc lập với React, Zustand và timer trình duyệt.
- Kiểm tra `PoseFrameResult`, tracking và confidence; ánh xạ hành động hợp lệ sang ID đáp án của câu hiện tại.
- Quản lý `IDLE`, `READY`, `DETECTING`, `HOLDING`, `SUBMITTING`, `SUBMITTED`, `ERROR`.
- Chuyển sang `SUBMITTING` trước khi chờ gateway, ngăn gửi trùng khi frame tiếp tục tới.
- Gửi `questionId`, `selectedOptionId`, `attemptId`; không gửi ActionId thay cho đáp án.
- Kiểm tra response có đúng câu hỏi, đáp án và submission ID hợp lệ.
- Khi submit lỗi, giữ đáp án đã chốt và cung cấp thông báo lỗi; chưa tự retry.
- Dùng generation token để bỏ qua frame/callback thuộc lượt câu hỏi cũ và response đến muộn.
- Ngăn tiếp tục submit câu cũ nếu listener chuyển câu ngay lúc xác nhận.

### 1.4. Subscription và timeout

- `subscribe()` thông báo khi state thay đổi, bao gồm tiến độ, reset, submit thành công và lỗi bất đồng bộ.
- Hàm unsubscribe có thể gọi nhiều lần; hỗ trợ nhiều listener độc lập.
- Frame bị bỏ qua không tạo thông báo state mới.
- `checkTimeout()` reset candidate/progress khi đang giữ mà không có frame mới quá thời gian cho phép.
- Timeout không reset đáp án đang submit hoặc đã submit.
- Frame có timestamp cũ hơn thời điểm timeout không được tiếp tục tiến độ trước đó.
- Scheduler nằm ở composition/UI và được dọn khi unmount.

### 1.5. Tích hợp playground

File chính:

- `apps/web/composition/live-game-runtime.ts`.
- `apps/web/composition/live-game-panel.tsx`.
- `apps/web/composition/playground-view.tsx`.
- `apps/web/features/game/index.ts`: export game session qua public entrypoint.

Đã thực hiện:

- Thêm lựa chọn **UI preview** và **Play game (mock)**.
- Live runtime tải câu hỏi từ mock, tạo session và phát frame giả lập liên tục khi giữ động tác.
- UI dùng `useSyncExternalStore` để nhận state qua subscription.
- Cấp question, mapping, candidate, confirmed, progress, status và error cho `GameplayScreen` có sẵn của Dũng.
- Giữ phím 1–8 hoặc giữ nút động tác bằng chuột, Space/Enter để mô phỏng tư thế.
- Nhả phím/nút, mất focus cửa sổ hoặc ẩn tab sẽ dừng tư thế giả lập.
- Có nút mất tracking, tạm dừng luồng frame và bắt đầu lại câu hỏi.
- Tái sử dụng audio hook của experience cho phản hồi theo trạng thái.
- Dọn interval, input listeners và vô hiệu hóa công việc session cũ khi rời chế độ chơi.

## 2. Cấu hình demo hiện tại

- Thời gian giữ: **1.500 ms**.
- Confidence tối thiểu: **0.7**.
- Khoảng ngắt frame tối đa: **250 ms**; quá giới hạn mới reset.
- Chu kỳ scheduler của demo: **50 ms**.
- Clock: `performance.now()` trong composition.
- Gateway: `MockQuizGateway`, dữ liệu chỉ ở bộ nhớ.
- Attempt ID: bộ đếm cục bộ trong mỗi mock runtime; chưa phải ID duy nhất toàn hệ thống.

Confidence và khoảng ngắt frame là cấu hình thử nghiệm, cần chốt với Huy khi nối CV thật. Chu kỳ mock không phải kết quả benchmark camera hoặc FPS.

## 3. Đối chiếu yêu cầu

### Đã đáp ứng trong luồng mock

- Cấp `question`, `actionConfig`, `candidateOptionId`, `confirmedOptionId`, `holdProgress`, `status`, `error`.
- Bình sở hữu logic giữ 1.500 ms, reset và chốt; UI chỉ phản ánh dữ liệu của game.
- Cập nhật candidate/progress khi đổi động tác, mất tracking hoặc đổi câu hỏi.
- Dùng ID đáp án thật để chọn và xác nhận, không giả định A/B/C/D hoặc ID động tác.
- Có trạng thái thành công/lỗi submit; `SUBMITTED` chỉ biểu thị nhận đáp án thành công.
- Có thể xem các trạng thái thủ công trong UI preview và thử luồng giữ/submit thật trong Play game (mock).

### Cần phối hợp tiếp

- Hiện chưa phát đầy đủ `GameEvent` như `ANSWER_CONFIRMED`; không nên coi state notification là event bus đã hoàn thiện. Audio đã dùng thay đổi `confirmedOptionId` để phát xác nhận một lần, kể cả khi React gộp các cập nhật.
- Audio receipt/error chờ cue xác nhận 300 ms để không cắt mất âm xác nhận; submit và trạng thái game không bị trì hoãn. Màn hình trạng thái xác nhận riêng trước receipt vẫn chưa được bảo đảm khi submit trả nhanh.
- Bàn giao payload/state fixtures thành tài liệu hoặc dữ liệu mẫu riêng nếu Dũng cần dùng ngoài playground.
- Chốt confidence, clock, timestamp và xử lý frame ngừng gửi với Huy.
- Phần camera stream, landmark ordering, video/skeleton alignment thuộc phối hợp Huy–Dũng; chưa nằm trong đầu vào thật của demo này.

## 4. Kiểm thử và bằng chứng

Kết quả lần chạy sau tích hợp ngày 05/11/2026 (xem mục 8 cho kiểm tra sau review):

- `npm run lint`: pass.
- `npm run typecheck`: pass cho web và contracts.
- `npm test`: **71 test pass**, gồm 67 test web và 4 test contracts. Đây là tổng toàn repo, bao gồm test có sẵn của team.
- Các file chỉnh sửa đã được format bằng Prettier; `git diff --check` không báo lỗi.
- Chưa chạy production build cho đợt thay đổi này; chưa xác nhận đầy đủ `npm run check` hoặc hosted CI.

Các nhóm test mới:

- `features/game/domain/action-randomizer.test.ts`.
- `features/game/domain/hold-detector.test.ts`.
- `features/game/application/game-session.test.ts`.
- `composition/live-game-runtime.test.ts`.
- `composition/live-game-panel.test.tsx`.

Nội dung chính: random hợp lệ; giữ đủ thời gian; reset; frame cũ; confidence thấp; API lỗi; chống submit trùng khi pending; đổi câu khi request chưa xong; subscription/unsubscribe; timeout; ổn định mapping; keyboard hold/release; state hiển thị và cleanup timer.

Kiểm tra trình duyệt: đã giữ nút Salute được gán cho Mars, thấy progress đạt 100%, đáp án được đánh dấu xác nhận và trạng thái `SUBMITTED` / **Answer sent**.

Cảnh báo hydration có thêm class `mdl-js` trên thẻ HTML đã được kiểm tra: không tìm thấy class này trong source/manifests của project; người dùng xác nhận không xuất hiện trong lần thử ẩn danh. Có khả năng do extension, chưa xác định extension cụ thể. Không thêm code để che cảnh báo.

## 5. Cách chạy và kiểm tra demo

Tại thư mục gốc project:

```bash
npm ci
npm run dev
```

1. Mở `http://localhost:3000/playground`.
2. Chọn **Play game (mock)**.
3. Xem động tác được gán cạnh đáp án; mapping được random nên không cố định phím cho Mars hoặc đáp án khác.
4. Giữ phím số tương ứng hoặc giữ nút động tác khoảng 1,5 giây.
5. Quan sát progress, đáp án xác nhận và **Answer sent**.
6. Nhấn **Restart question** hoặc **Load next mock question** để bắt đầu lượt mới.
7. Nhả trước khi đủ thời gian hoặc đổi động tác để kiểm tra reset.
8. Khi giữ phím của động tác hợp lệ, nhấn **Pause frame stream** để kiểm tra reset do không còn frame.
9. Chọn **UI preview** để dùng lại bộ mô phỏng thủ công của Dũng.

Mock không cần camera, Docker hay API URL. Thông báo chưa cấu hình API URL không chặn demo.

Các lệnh kiểm tra:

```bash
npm run lint
npm run typecheck
npm test
```

## 6. Phần chưa hoàn thành

- Tích hợp PoseEngine/camera thật của Huy và xử lý toàn bộ vòng đời camera.
- Thống nhất và triển khai HTTP QuizGateway; backend hiện chưa có API nghiệp vụ quiz đã được nối vào luồng này.
- Retry có kiểm soát, cancellation request thật và idempotency phía server.
- Attempt/session ID dùng được qua nhiều người dùng, nhiều phiên và retry.
- Chấm điểm, đúng/sai, lưu kết quả database và lịch sử chơi.
- Event xác nhận riêng và kiểm thử màn hình/hiệu ứng xác nhận khi submit trả nhanh; audio đã có kiểm thử tự động.
- Kiểm thử thiết bị/trình duyệt rộng hơn và hiệu năng camera thật.

Không coi demo mock là game AI end-to-end đã hoàn tất. Kết quả test hiện tại không xác nhận độ chính xác của tám bộ phân loại hành động.

## 7. Tình trạng bàn giao Git ngày 05/11/2026 (lịch sử)

Tại thời điểm ghi note, các file game mới và một số file composition/docs đang là thay đổi local trên `feature/game-hold-service`, chưa được commit trong trạng thái Git kiểm tra được. Chưa có thao tác push hoặc tạo PR trong phần công việc này.

Trước khi bàn giao: review diff, chạy bộ kiểm tra đầy đủ phù hợp, commit các file liên quan, rồi push nhánh và mở PR vào `dev` theo quy trình team.

## 8. Sửa lỗi sau review ngày 06/11/2026

- Snapshot được review đã có commit `cc7aa07` và merge PR #3 (`a3dcf56`); mục 7 là ghi nhận trước bàn giao, không phải trạng thái Git hiện tại.
- Sửa reset nhầm khi chuyển focus giữa các nút động tác: blur/release của nút cũ chỉ xóa động tác nếu nó vẫn đang là động tác hiện tại.
- Nối audio xác nhận qua thay đổi ID đáp án đã chốt và xếp cue receipt/error sau xác nhận; hủy cue chờ khi reset, đổi câu, mute, dừng hoặc unmount.
- Format lại hai file randomizer và đồng bộ tài liệu mô tả UI preview/Play game (mock).
- Bổ sung test hồi quy cho focus/release, submit trả nhanh thành công/lỗi, receipt đến ở render riêng và hủy audio đang chờ.
- Kiểm tra sau sửa: `npm run check` pass đầy đủ format, architecture lint, typecheck, **80 test** (76 web + 4 contracts) và production build; `git diff --check` pass. Có 9 test hồi quy mới so với 71 test trước review.
- Chưa kiểm tra nghe âm thanh thực tế hoặc thiết bị/trình duyệt thật trong lượt sửa này.
