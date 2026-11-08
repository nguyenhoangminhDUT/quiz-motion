import { describe, expect, it, vi } from 'vitest';
import type {
  PoseLandmarkerLike,
  PoseLandmarkerResultLike,
} from './mediapipe-pose-landmarker';
import type {
  ScheduledFrame,
  VideoFrameScheduler,
} from './video-frame-scheduler';
import { MediaPipeVideoPoseDetector } from './video-pose-detector';

class FakeScheduler implements VideoFrameScheduler {
  readonly cancel = vi.fn(
    (_video: HTMLVideoElement, frame: ScheduledFrame): void => {
      this.callbacks.delete(frame.id);
    },
  );
  private readonly callbacks = new Map<number, (timestampMs: number) => void>();
  private nextId = 1;

  request(
    _video: HTMLVideoElement,
    callback: (timestampMs: number) => void,
  ): ScheduledFrame {
    const id = this.nextId++;
    this.callbacks.set(id, callback);
    return { kind: 'animation', id };
  }

  fire(timestampMs: number): void {
    const entry = this.callbacks.entries().next().value;
    if (!entry) throw new Error('No scheduled frame.');
    const [id, callback] = entry;
    this.callbacks.delete(id);
    callback(timestampMs);
  }

  get pendingCount(): number {
    return this.callbacks.size;
  }
}

function sdkResult(hasPose = true): PoseLandmarkerResultLike {
  return {
    landmarks: hasPose
      ? [
          Array.from({ length: 33 }, (_, index) => ({
            x: index / 100,
            y: index / 200,
            z: -index / 300,
            visibility: 1,
            presence: 1,
          })),
        ]
      : [],
  };
}

function fakeVideo(currentTime = 0): HTMLVideoElement {
  return { currentTime } as HTMLVideoElement;
}

describe('MediaPipeVideoPoseDetector', () => {
  it('detects a decoded frame and emits converted landmarks', () => {
    const scheduler = new FakeScheduler();
    const landmarker: PoseLandmarkerLike = {
      detectForVideo: vi.fn().mockReturnValue(sdkResult()),
      close: vi.fn(),
    };
    const detector = new MediaPipeVideoPoseDetector(landmarker, scheduler);
    const listener = vi.fn();
    const video = fakeVideo(0.1);
    detector.start(video, listener, vi.fn());

    scheduler.fire(12);

    expect(landmarker.detectForVideo).toHaveBeenCalledWith(video, 12);
    expect(listener).toHaveBeenCalledOnce();
    const detection = listener.mock.calls[0]?.[0];
    expect(detection?.timestampMs).toBe(12);
    expect(detection?.landmarks).toHaveLength(33);
    expect(scheduler.pendingCount).toBe(1);
  });

  it('does not infer again while video.currentTime is unchanged', () => {
    const scheduler = new FakeScheduler();
    const landmarker: PoseLandmarkerLike = {
      detectForVideo: vi.fn().mockReturnValue(sdkResult()),
      close: vi.fn(),
    };
    const detector = new MediaPipeVideoPoseDetector(landmarker, scheduler);
    const video = fakeVideo(0.1);
    detector.start(video, vi.fn(), vi.fn());

    scheduler.fire(10);
    scheduler.fire(20);

    expect(landmarker.detectForVideo).toHaveBeenCalledOnce();
    expect(scheduler.pendingCount).toBe(1);
  });

  it('does not reprocess the same frame after stop and restart', () => {
    const scheduler = new FakeScheduler();
    const landmarker: PoseLandmarkerLike = {
      detectForVideo: vi.fn().mockReturnValue(sdkResult()),
      close: vi.fn(),
    };
    const detector = new MediaPipeVideoPoseDetector(landmarker, scheduler);
    const video = fakeVideo(0.1);
    detector.start(video, vi.fn(), vi.fn());
    scheduler.fire(10);
    detector.stop();
    detector.start(video, vi.fn(), vi.fn());
    scheduler.fire(20);

    expect(landmarker.detectForVideo).toHaveBeenCalledOnce();
  });

  it('keeps inference timestamps monotonic', () => {
    const scheduler = new FakeScheduler();
    const landmarker: PoseLandmarkerLike = {
      detectForVideo: vi.fn().mockReturnValue(sdkResult()),
      close: vi.fn(),
    };
    const detector = new MediaPipeVideoPoseDetector(landmarker, scheduler);
    const video = fakeVideo(0.1);
    detector.start(video, vi.fn(), vi.fn());
    scheduler.fire(10);
    video.currentTime = 0.2;
    scheduler.fire(8);
    video.currentTime = 0.3;
    scheduler.fire(12);

    expect(
      vi.mocked(landmarker.detectForVideo).mock.calls.map(([, time]) => time),
    ).toEqual([10, 10, 12]);
  });

  it('emits null landmarks when no pose is detected', () => {
    const scheduler = new FakeScheduler();
    const landmarker: PoseLandmarkerLike = {
      detectForVideo: vi.fn().mockReturnValue(sdkResult(false)),
      close: vi.fn(),
    };
    const detector = new MediaPipeVideoPoseDetector(landmarker, scheduler);
    const listener = vi.fn();
    detector.start(fakeVideo(0.1), listener, vi.fn());

    scheduler.fire(5);

    expect(listener).toHaveBeenCalledWith({ timestampMs: 5, landmarks: null });
  });

  it('stops the loop and reports detector errors', () => {
    const scheduler = new FakeScheduler();
    const error = new Error('inference failed');
    const landmarker: PoseLandmarkerLike = {
      detectForVideo: vi.fn(() => {
        throw error;
      }),
      close: vi.fn(),
    };
    const detector = new MediaPipeVideoPoseDetector(landmarker, scheduler);
    const onError = vi.fn();
    detector.start(fakeVideo(0.1), vi.fn(), onError);

    scheduler.fire(5);

    expect(onError).toHaveBeenCalledWith(error);
    expect(scheduler.pendingCount).toBe(0);
  });

  it('cancels pending callbacks and closes the landmarker once', () => {
    const scheduler = new FakeScheduler();
    const close = vi.fn();
    const detector = new MediaPipeVideoPoseDetector(
      { detectForVideo: vi.fn(), close },
      scheduler,
    );
    const video = fakeVideo();
    detector.start(video, vi.fn(), vi.fn());
    detector.stop();
    expect(scheduler.cancel).toHaveBeenCalledWith(video, {
      kind: 'animation',
      id: 1,
    });

    detector.dispose();
    detector.dispose();
    expect(close).toHaveBeenCalledOnce();
    expect(() => detector.start(video, vi.fn(), vi.fn())).toThrow('disposed');
  });
});
