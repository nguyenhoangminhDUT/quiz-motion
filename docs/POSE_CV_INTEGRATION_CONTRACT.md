# Pose/CV Integration Contract

Tài liệu này chốt contract tích hợp giữa Pose/CV, UI và Game Engine theo code hiện tại. Các thành viên sử dụng tài liệu này khi cập nhật code; không tự khai báo lại type hoặc đổi ý nghĩa field trong từng module.

## 1. Source of truth

- Shared types và validation: `packages/contracts/src`
- Pose Engine port: `apps/web/features/pose/application/ports/pose-engine.ts`
- Pose implementation: `apps/web/features/pose`
- Contract commit nền: `f76e374`

Các type dùng chung phải được import từ `@action-quiz/contracts`. Nếu cần thay đổi contract, cả Huy, Dũng và Bình cần thống nhất trước, sau đó cập nhật type, validation, consumer và tài liệu trong cùng một thay đổi.

## 2. Phân chia trách nhiệm

### Huy — Pose/CV

- Khởi tạo camera và MediaPipe.
- Cung cấp `MediaStream` cho UI.
- Nhận phần tử video từ UI để chạy inference.
- Trả về 33 landmarks, trạng thái tracking, action và confidence.
- Quản lý vòng đời `PoseEngine` và trạng thái camera.

### Dũng — UI/Experience

- Tạo và quản lý phần tử `<video>`.
- Gắn `MediaStream` do Pose Engine cung cấp vào video.
- Gọi `video.play()` và chỉ khởi động Pose Engine khi video đã sẵn sàng.
- Hiển thị camera, skeleton, hướng dẫn và lỗi camera.
- Thực hiện mirror, scale hoặc crop ở tầng hiển thị.

### Bình — Game Engine

- Nhận `PoseFrameResult` từ tầng composition.
- Kiểm tra tracking và ngưỡng confidence.
- Ánh xạ action với option, xử lý thời gian giữ và submit đáp án.
- Dùng generation hiện tại để bỏ qua frame cũ sau khi đổi câu hỏi.

Pose/CV không xử lý thời gian giữ động tác, chọn đáp án, submit hoặc tính điểm.

## 3. Action contract

```ts
export const ACTION_IDS = [
  'ACT_01',
  'ACT_02',
  'ACT_03',
  'ACT_04',
  'ACT_05',
  'ACT_06',
  'ACT_07',
  'ACT_08',
] as const;

export type ActionId = (typeof ACTION_IDS)[number];
```

| Action ID | Hành động                           |
| --------- | ----------------------------------- |
| `ACT_01`  | Y-Pose                              |
| `ACT_02`  | Nghiêng trái theo cơ thể người chơi |
| `ACT_03`  | Nghiêng phải theo cơ thể người chơi |
| `ACT_04`  | Tạo hình trái tim trên đầu          |
| `ACT_05`  | Khoanh tay                          |
| `ACT_06`  | Chào bằng tay phải của người chơi   |
| `ACT_07`  | Dab, nhận cả hai hướng              |
| `ACT_08`  | Suy nghĩ, nhận cả hai tay           |

Action ID là khóa giao tiếp ổn định giữa các module. Không dùng tên hiển thị, icon hoặc vị trí option làm định danh action.

## 4. Pose data contract

```ts
export interface PoseLandmark {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly visibility?: number;
  readonly presence?: number;
}

export type TrackingStatus = 'tracking' | 'lost' | 'unavailable';

export interface PoseFrameResult {
  readonly timestampMs: number;
  readonly detectedAction: ActionId | null;
  readonly confidence: number;
  readonly landmarks: readonly PoseLandmark[];
  readonly trackingStatus: TrackingStatus;
}
```

### Quy tắc dữ liệu

| Tracking status | Landmarks       | Action                 | Confidence          |
| --------------- | --------------- | ---------------------- | ------------------- |
| `tracking`      | Đúng 33 phần tử | `ActionId` hoặc `null` | Trong khoảng `0..1` |
| `lost`          | `[]`            | `null`                 | `0`                 |
| `unavailable`   | `[]`            | `null`                 | `0`                 |

- `tracking` nghĩa là đã nhận diện được một pose hợp lệ, nhưng chưa chắc đã phân loại được action.
- `lost` nghĩa là camera và inference vẫn hoạt động nhưng không tìm thấy pose hợp lệ.
- `unavailable` nghĩa là camera hoặc inference không thể cung cấp kết quả.
- Khi classifier chưa chọn được action, implementation hiện tại trả `detectedAction: null` và `confidence: 0`.
- `confidence` là điểm phù hợp với luật hình học, không phải xác suất thống kê.
- `timestampMs` là thời gian monotonic của session, sử dụng cùng loại đồng hồ như `performance.now()`, không phải Unix timestamp và không dùng `Date.now()`.
- Mỗi frame được kiểm tra bằng `poseFrameSchema` trước khi phát hoặc trước khi Game Engine xử lý.

### Hệ tọa độ và landmark

- Giữ đúng 33 index của MediaPipe; không xóa landmark bị che và không chèn `null`.
- `x/y` dùng ảnh gốc chưa mirror, gốc ở góc trên trái, `x` tăng sang phải và `y` tăng xuống dưới.
- `x/y` có thể vượt ngoài khoảng `0..1` khi điểm nằm ngoài khung hình.
- `z` là độ sâu tương đối của MediaPipe và có thể âm.
- `visibility` và `presence`, nếu có, nằm trong khoảng `0..1`.
- Left/Right được tính theo cơ thể người chơi, không theo phía hiển thị trên màn hình.
- UI chỉ mirror ở tầng hiển thị; không đảo video hoặc landmark trước khi classifier xử lý.

Một số index thường dùng:

| Index      | Landmark            |
| ---------- | ------------------- |
| `0`        | Nose                |
| `7`, `8`   | Left/Right Ear      |
| `11`, `12` | Left/Right Shoulder |
| `13`, `14` | Left/Right Elbow    |
| `15`, `16` | Left/Right Wrist    |
| `23`, `24` | Left/Right Hip      |

## 5. Camera contract

```ts
export type CameraStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'permission-denied'
  | 'not-found'
  | 'error'
  | 'stopped';
```

| Camera status       | Ý nghĩa                          |
| ------------------- | -------------------------------- |
| `idle`              | Chưa khởi tạo camera             |
| `initializing`      | Đang khởi tạo hoặc yêu cầu quyền |
| `ready`             | Camera và stream đã sẵn sàng     |
| `permission-denied` | Người dùng từ chối quyền camera  |
| `not-found`         | Không tìm thấy thiết bị camera   |
| `error`             | Lỗi camera, model hoặc inference |
| `stopped`           | Camera đã bị đóng                |

Camera có thể là `ready` trong khi pose là `lost` nếu không có người trong khung hình.

## 6. Pose event contract

Pose Engine phát `PoseUpdatedEvent`, không gọi callback bằng raw `PoseFrameResult`:

```ts
export type PoseUpdatedEvent = {
  readonly type: 'POSE_UPDATED';
  readonly timestampMs: number;
  readonly payload: {
    readonly frame: PoseFrameResult;
  };
};
```

`event.timestampMs` và `event.payload.frame.timestampMs` có cùng giá trị.

Consumer lấy frame như sau:

```ts
const unsubscribePose = poseEngine.subscribe((event) => {
  const frame = event.payload.frame;
});
```

Tầng composition chuyển frame cho Game Session:

```ts
const unsubscribePose = poseEngine.subscribe((event) => {
  void gameSession.processFrame(event.payload.frame, generation);
});
```

## 7. Pose Engine contract

```ts
export type PoseEngineStatus =
  'new' | 'ready' | 'running' | 'stopped' | 'disposed';

export interface PoseEngine {
  readonly provider: string;
  readonly status: PoseEngineStatus;
  readonly cameraStatus: CameraStatus;

  initialize(): Promise<void>;
  getMediaStream(): MediaStream | null;
  attachVideo(video: HTMLVideoElement): void;
  start(): void;
  stop(): void;

  subscribe(listener: (event: PoseUpdatedEvent) => void): () => void;

  subscribeCameraStatus(listener: (status: CameraStatus) => void): () => void;

  dispose(): void;
}
```

### Vòng đời tích hợp UI

```ts
const unsubscribePose = poseEngine.subscribe(handlePoseEvent);
const unsubscribeCamera = poseEngine.subscribeCameraStatus(handleCameraStatus);

await poseEngine.initialize();

const stream = poseEngine.getMediaStream();
if (!stream) throw new Error('Camera stream is unavailable.');

video.srcObject = stream;
await video.play();

poseEngine.attachVideo(video);
poseEngine.start();
```

Chỉ gọi `start()` sau khi:

- `initialize()` đã hoàn thành;
- camera đang `ready`;
- video đã được gắn stream;
- `video.play()` đã hoàn thành;
- video đã có frame giải mã (`readyState >= 2`);
- `attachVideo(video)` đã được gọi.

### `stop()` và `dispose()`

- `stop()` chỉ dừng inference, reset trạng thái xử lý frame và giữ camera/model để có thể `start()` lại.
- Sau `stop()`, `PoseEngine.status` có thể là `stopped` trong khi `cameraStatus` vẫn là `ready`.
- `dispose()` đóng camera, giải phóng detector, xóa listener và đưa engine vào trạng thái kết thúc.
- `dispose()` là idempotent nhưng engine không được sử dụng lại sau khi dispose.

Cleanup khi UI unmount:

```ts
unsubscribePose();
unsubscribeCamera();
poseEngine.dispose();
```

## 8. Migration từ contract cũ

| Contract cũ                   | Contract hiện tại                                        |
| ----------------------------- | -------------------------------------------------------- |
| `ActionID`                    | `ActionId`                                               |
| `Landmark`                    | `PoseLandmark`                                           |
| `CVEngine`                    | `PoseEngine`                                             |
| `"OK"`                        | `"tracking"`                                             |
| `"LOST"`                      | `"lost"`                                                 |
| Không có trạng thái tương ứng | `"unavailable"`                                          |
| Camera status viết hoa        | Camera status viết thường và dùng dấu gạch ngang         |
| `startCamera()`               | `initialize()` rồi `getMediaStream()`                    |
| `onPoseResult(callback)`      | `subscribe(callback)`                                    |
| Callback nhận raw frame       | Callback nhận event, frame nằm tại `event.payload.frame` |
| `onCameraStatus(callback)`    | `subscribeCameraStatus(callback)`                        |
| `stopCamera()`                | `stop()` để pause hoặc `dispose()` để đóng hoàn toàn     |
| Landmark chỉ có `visibility?` | Có cả `visibility?` và `presence?`                       |

## 9. Checklist cập nhật của từng module

### Dũng — UI/Experience

- [ ] Không tự gọi `getUserMedia()`.
- [ ] Không khai báo lại Pose/Camera types.
- [ ] Thay toàn bộ status viết hoa bằng status mới.
- [ ] Đọc frame từ `event.payload.frame`.
- [ ] Gắn stream, play video, attach video rồi mới start engine.
- [ ] Mirror video và skeleton chỉ ở tầng hiển thị.
- [ ] Phân biệt pause bằng `stop()` và đóng hoàn toàn bằng `dispose()`.
- [ ] Unsubscribe và dispose khi unmount.

### Bình — Game Engine

- [ ] Nhận `event.payload.frame` tại tầng composition.
- [ ] Chỉ nhận action khi `trackingStatus === 'tracking'` và confidence đạt ngưỡng.
- [ ] Reset/ngắt hold khi frame là `lost` hoặc `unavailable`.
- [ ] Các tracking mock/fixture phải có đúng 33 landmarks.
- [ ] Dùng monotonic timestamp, không trộn với `Date.now()`.
- [ ] Truyền đúng generation vào `processFrame()`.

### Huy — Pose/CV

- [ ] Duy trì tính tương thích với `poseFrameSchema`.
- [ ] Không thay đổi Action ID hoặc ý nghĩa status nếu chưa có thống nhất nhóm.
- [ ] Cập nhật contract, tests và tài liệu cùng lúc nếu có thay đổi.
- [ ] Thông báo rõ migration cho các consumer trước khi merge.

## 10. Quy ước làm việc để tránh conflict

- Huy phụ trách `packages/contracts/src/pose.ts`, phần pose validation và `apps/web/features/pose`.
- Dũng chỉ sửa phần UI/Experience được phân công; không sửa Pose implementation.
- Bình chỉ sửa Game Engine và mock/fixture thuộc Game; không sửa Pose implementation.
- Với file composition nối UI, Pose và Game, nhóm chỉ định một người sửa trong mỗi đợt tích hợp.
- Không copy type sang module riêng. Mọi module import từ shared contracts.
- Nếu cần sửa shared contract, tạo một commit contract riêng trước; các commit consumer được thực hiện sau commit đó.
- Không gộp thay đổi contract, classifier, UI và Game vào cùng một commit lớn.
