# Báo cáo triển khai module Pose/CV

## Cập nhật tích hợp màn chơi

Màn `/play` đã nối camera và MediaPipe với Game Session, dùng câu hỏi và gửi đáp án
qua `MockQuizGateway`. Chạy `npm run dev`, mở trang chủ, chọn **Play with camera**,
sau đó **Enable camera** và cấp quyền camera. Không cần mở `/pose-debug` hoặc chạy
backend. Màn chơi cũng được đưa vào production build.

Luồng tích hợp nằm tại `apps/web/composition/camera-game-runtime.ts` và
`camera-game-client.tsx`: khởi tạo engine, gắn stream, phát video, đợi frame giải mã,
gắn video vào engine rồi bắt đầu nhận diện. `POSE_UPDATED` chuyển frame cho
`session.processFrame(frame, generation)` theo contract hiện có. UI dùng cùng frame
để vẽ skeleton; mirror chỉ áp dụng khi hiển thị video và skeleton.

Game Session giữ nguyên kiểm tra confidence, tracking, ánh xạ action, thời gian giữ
1500 ms và khóa gửi đáp án. Watchdog reset tiến độ khi không nhận được frame trong
hơn 250 ms. Đổi câu hỏi reset tiến độ và bỏ qua frame cũ. Khi camera bị đóng, lỗi,
đổi tab hoặc rời trang, tài nguyên được giải phóng; có thể bật camera hoặc thử lại.
Hủy trong khi khởi tạo cũng không cho phép engine đã dispose tiếp tục chạy.

Mock hiện có 10 câu hỏi. Khi gửi đáp án thành công, Game Session nhận `evaluation`
gồm `isCorrect` và `correctOptionId`; UI thông báo đúng/sai, tô xanh đáp án đúng và
tô đỏ lựa chọn sai. Sau 3 giây, màn chơi tự chuyển câu mà không cần khởi động lại
camera. Đổi câu thủ công hoặc dispose sẽ hủy countdown cũ. Bộ câu hỏi lặp lại sau
câu thứ 10. Bố cục camera game dùng lưới đáp án 2×2 và thu gọn theo chiều cao màn hình.

Các phần dưới mô tả module Pose/CV và giai đoạn triển khai ban đầu. Việc tích hợp
màn chơi từng được liệt kê là bước tiếp theo nay đã hoàn thành; kiểm thử nhận diện
với camera thực tế, hiệu chỉnh ngưỡng, tổng điểm và Quiz API vẫn còn cần thực hiện.

## 1. Tổng quan

Module Pose/CV phía web đã được triển khai để lấy hình ảnh từ camera, nhận diện tư thế cơ thể bằng MediaPipe và chuyển kết quả thành một trong 8 hành động quy ước của hệ thống.

Phạm vi đã hoàn thành gồm:

- quản lý vòng đời camera và Pose Engine;
- chạy MediaPipe Pose Landmarker trực tiếp trên trình duyệt;
- chuẩn hóa và làm mượt 33 pose landmarks;
- nhận diện 8 hành động bằng các luật hình học;
- phát kết quả qua contract dùng chung;
- cung cấp trang debug để kiểm thử trực tiếp bằng camera.

Mã nguồn chính nằm tại `apps/web/features/pose`. Model và WASM của MediaPipe được lưu cục bộ tại `apps/web/public/mediapipe`, vì vậy quá trình chạy không phụ thuộc CDN.

## 2. Luồng xử lý

```text
Camera
  -> HTMLVideoElement do UI quản lý
  -> MediaPipe Pose Landmarker
  -> 33 landmarks
  -> làm mượt và kiểm tra tracking
  -> bộ phân loại 8 hành động
  -> POSE_UPDATED event
```

Pose Engine quản lý camera và quá trình inference. UI quản lý thẻ video, thao tác `play()` và cách hiển thị như mirror hoặc crop. Ảnh dùng cho inference không bị mirror để giữ đúng khái niệm trái/phải theo cơ thể người chơi.

## 3. Các hành động được hỗ trợ

| Action ID | Hành động                   |
| --------- | --------------------------- |
| `ACT_01`  | Y-Pose                      |
| `ACT_02`  | Nghiêng trái                |
| `ACT_03`  | Nghiêng phải                |
| `ACT_04`  | Tạo hình trái tim trên đầu  |
| `ACT_05`  | Khoanh tay                  |
| `ACT_06`  | Chào bằng tay phải          |
| `ACT_07`  | Dab, hỗ trợ cả hai hướng    |
| `ACT_08`  | Suy nghĩ, hỗ trợ cả hai tay |

Mỗi bộ phân loại trả về một điểm trong khoảng `0..1`. Hệ thống chỉ chọn hành động khi điểm cao nhất đạt ngưỡng tối thiểu và đủ khác biệt so với hành động đứng thứ hai, nhằm hạn chế nhận nhầm giữa các tư thế gần giống nhau.

Giá trị `confidence` hiện là độ phù hợp với luật hình học, không phải xác suất đã được hiệu chỉnh bằng mô hình thống kê.

## 4. Contract tích hợp

`PoseEngine` cung cấp các thao tác chính:

- `initialize()` để xin quyền và khởi tạo camera/model;
- `getMediaStream()` để UI gắn stream vào video;
- `attachVideo(video)` để chọn nguồn hình cho inference;
- `start()` và `stop()` để chạy hoặc tạm dừng nhận diện;
- `subscribe()` để nhận `POSE_UPDATED`;
- `subscribeCameraStatus()` để cập nhật trạng thái camera;
- `dispose()` để giải phóng camera và tài nguyên.

Mỗi `POSE_UPDATED` chứa một `PoseFrameResult` gồm:

- `timestampMs`;
- `detectedAction` hoặc `null`;
- `confidence`;
- `trackingStatus`: `tracking`, `lost` hoặc `unavailable`;
- đúng 33 landmarks khi đang tracking, hoặc mảng rỗng khi không có pose hợp lệ.

Các trạng thái camera có thể dùng để hiển thị UI gồm `idle`, `initializing`, `ready`, `permission-denied`, `not-found`, `error` và `stopped`.

`stop()` chỉ tạm dừng inference và vẫn giữ camera/model để có thể chạy lại nhanh. `dispose()` mới đóng camera và giải phóng toàn bộ tài nguyên.

### Ranh giới trách nhiệm

Module Pose/CV chỉ nhận diện và phát kết quả theo frame. Các phần sau không nằm trong module này:

- giữ ổn định một hành động trong khoảng thời gian quy định;
- ánh xạ hành động với đáp án của câu hỏi;
- xác nhận câu trả lời và tính điểm;
- giao diện camera chính thức trong màn chơi.

Những logic trên sẽ được xử lý tại Game Engine và UI dựa trên `POSE_UPDATED`.

## 5. Kiểm thử thực tế

Trang debug dành riêng cho môi trường development có tại:

```text
http://localhost:3000/pose-debug
```

Trang này cho phép:

- xem camera và skeleton theo thời gian thực;
- theo dõi action, confidence, tracking và camera status;
- tạm dừng, tiếp tục hoặc đóng Pose Engine;
- lần lượt thử cả 8 hành động trước khi tích hợp vào màn chơi.

Trang debug chỉ kiểm tra pipeline camera và nhận diện, chưa gửi hành động vào Game Session.

Các nhóm kiểm thử tự động đã có cho geometry, classifiers, action selector, frame processor, camera lifecycle, MediaPipe adapter, Browser Pose Engine và trang debug. Tại thời điểm hoàn thành, các bước test, lint, typecheck, format check và production build đều chạy thành công.

## 6. Giới hạn hiện tại

- Ngưỡng nhận diện ban đầu được xây dựng và kiểm tra bằng fixture tổng hợp; chưa có bộ dữ liệu camera thực tế được gắn nhãn để đánh giá độ chính xác định lượng.
- Kết quả có thể thay đổi theo khoảng cách tới camera, góc quay, ánh sáng, mức độ che khuất và việc cơ thể có nằm đủ trong khung hình hay không.
- Cần kiểm thử thực tế với nhiều người và nhiều môi trường, sau đó điều chỉnh các ngưỡng hình học nếu phát hiện false positive hoặc false negative.
- Màn `/play` chọn real Pose Engine và đã kết nối `POSE_UPDATED` với Game Session; mock đã chấm đúng/sai từng câu, chưa có tổng điểm hay lưu trữ server.

## 7. Trạng thái các bước tích hợp

1. Đã có: UI tạo và phát video từ `getMediaStream()`, sau đó truyền video bằng `attachVideo()`.
2. Đã có: hiển thị camera status, lỗi có thể thử lại và hướng dẫn vị trí đứng.
3. Đã có: tầng composition subscribe `POSE_UPDATED`, chuyển cho Game Session xử lý giữ động tác và ánh xạ đáp án.
4. Cần tiếp tục: cả nhóm thử camera thực tế trên màn `/play`, ghi lại các trường hợp nhận sai để hiệu chỉnh classifier.
