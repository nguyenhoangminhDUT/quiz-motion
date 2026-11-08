export interface ScheduledFrame {
  readonly kind: 'video' | 'animation';
  readonly id: number;
}

export interface VideoFrameScheduler {
  request(
    video: HTMLVideoElement,
    callback: (timestampMs: number) => void,
  ): ScheduledFrame;
  cancel(video: HTMLVideoElement, frame: ScheduledFrame): void;
}

export interface AnimationFrameApi {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
}

const BROWSER_ANIMATION_FRAMES: AnimationFrameApi = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

export class BrowserVideoFrameScheduler implements VideoFrameScheduler {
  constructor(
    private readonly animationFrames: AnimationFrameApi = BROWSER_ANIMATION_FRAMES,
  ) {}

  request(
    video: HTMLVideoElement,
    callback: (timestampMs: number) => void,
  ): ScheduledFrame {
    if (
      typeof video.requestVideoFrameCallback === 'function' &&
      typeof video.cancelVideoFrameCallback === 'function'
    ) {
      return {
        kind: 'video',
        id: video.requestVideoFrameCallback((timestampMs) =>
          callback(timestampMs),
        ),
      };
    }
    return {
      kind: 'animation',
      id: this.animationFrames.request(callback),
    };
  }

  cancel(video: HTMLVideoElement, frame: ScheduledFrame): void {
    if (frame.kind === 'video') {
      video.cancelVideoFrameCallback(frame.id);
    } else {
      this.animationFrames.cancel(frame.id);
    }
  }
}
