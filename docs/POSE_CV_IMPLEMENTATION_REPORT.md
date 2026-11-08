# Báo cáo triển khai module Pose/CV

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
- Cấu hình lựa chọn real Pose Engine trong luồng production và kết nối `POSE_UPDATED` với Game Session vẫn là bước tích hợp tiếp theo.

## 7. Bước tiếp theo khi tích hợp

1. UI tạo và phát video từ `getMediaStream()`, sau đó truyền video cho Pose Engine bằng `attachVideo()`.
2. UI hiển thị camera status và hướng dẫn người chơi đứng đúng vị trí.
3. Game Engine subscribe `POSE_UPDATED`, xử lý thời gian giữ động tác và ánh xạ action với đáp án.
4. Cả nhóm kiểm thử end-to-end trên màn chơi thật và ghi lại các trường hợp nhận sai để hiệu chỉnh classifier.
