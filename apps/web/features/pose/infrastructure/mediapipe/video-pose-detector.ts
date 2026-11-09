import type { PoseLandmark } from '@action-quiz/contracts';
import {
  convertPoseLandmarks,
  type PoseLandmarkerLike,
} from './mediapipe-pose-landmarker';
import {
  BrowserVideoFrameScheduler,
  type ScheduledFrame,
  type VideoFrameScheduler,
} from './video-frame-scheduler';

export interface VideoPoseDetection {
  readonly timestampMs: number;
  readonly landmarks: readonly PoseLandmark[] | null;
}

export type VideoPoseDetectionListener = (result: VideoPoseDetection) => void;
export type VideoPoseErrorListener = (error: unknown) => void;

export class MediaPipeVideoPoseDetector {
  private video: HTMLVideoElement | null = null;
  private pendingFrame: ScheduledFrame | null = null;
  private resultListener: VideoPoseDetectionListener | null = null;
  private errorListener: VideoPoseErrorListener | null = null;
  private lastVideo: HTMLVideoElement | null = null;
  private lastVideoTime = Number.NaN;
  private lastTimestampMs = 0;
  private running = false;
  private disposed = false;

  constructor(
    private readonly landmarker: PoseLandmarkerLike,
    private readonly scheduler: VideoFrameScheduler = new BrowserVideoFrameScheduler(),
  ) {}

  start(
    video: HTMLVideoElement,
    onResult: VideoPoseDetectionListener,
    onError: VideoPoseErrorListener,
  ): void {
    this.assertAlive();
    if (this.running)
      throw new Error('Video pose detector is already running.');
    if (this.lastVideo !== video) {
      this.lastVideo = video;
      this.lastVideoTime = Number.NaN;
    }
    this.video = video;
    this.resultListener = onResult;
    this.errorListener = onError;
    this.running = true;
    this.scheduleNextFrame();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.video && this.pendingFrame) {
      this.scheduler.cancel(this.video, this.pendingFrame);
    }
    this.pendingFrame = null;
    this.video = null;
    this.resultListener = null;
    this.errorListener = null;
  }

  dispose(): void {
    if (this.disposed) return;
    this.stop();
    this.landmarker.close();
    this.lastVideo = null;
    this.disposed = true;
  }

  private scheduleNextFrame(): void {
    if (!this.running || !this.video) return;
    this.pendingFrame = this.scheduler.request(this.video, (timestampMs) => {
      this.pendingFrame = null;
      this.processFrame(timestampMs);
    });
  }

  private processFrame(timestampMs: number): void {
    const video = this.video;
    if (!this.running || !video) return;

    try {
      if (
        Number.isFinite(video.currentTime) &&
        video.currentTime !== this.lastVideoTime
      ) {
        this.lastVideoTime = video.currentTime;
        this.lastTimestampMs = monotonicTimestamp(
          timestampMs,
          this.lastTimestampMs,
        );
        const result = this.landmarker.detectForVideo(
          video,
          this.lastTimestampMs,
        );
        this.resultListener?.({
          timestampMs: this.lastTimestampMs,
          landmarks: convertPoseLandmarks(result),
        });
      }
    } catch (error: unknown) {
      const onError = this.errorListener;
      this.stop();
      onError?.(error);
      return;
    }

    this.scheduleNextFrame();
  }

  private assertAlive(): void {
    if (this.disposed)
      throw new Error('Video pose detector has been disposed.');
  }
}

function monotonicTimestamp(current: number, previous: number): number {
  return Number.isFinite(current) ? Math.max(0, previous, current) : previous;
}
