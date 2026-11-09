import { describe, expect, it, vi } from 'vitest';
import {
  BrowserVideoFrameScheduler,
  type AnimationFrameApi,
} from './video-frame-scheduler';

describe('BrowserVideoFrameScheduler', () => {
  it('prefers requestVideoFrameCallback when the video supports it', () => {
    const animationFrames: AnimationFrameApi = {
      request: vi.fn(),
      cancel: vi.fn(),
    };
    const requestVideoFrameCallback = vi.fn().mockReturnValue(7);
    const cancelVideoFrameCallback = vi.fn();
    const video = {
      requestVideoFrameCallback,
      cancelVideoFrameCallback,
    } as unknown as HTMLVideoElement;
    const scheduler = new BrowserVideoFrameScheduler(animationFrames);
    const callback = vi.fn();

    const frame = scheduler.request(video, callback);
    expect(frame).toEqual({ kind: 'video', id: 7 });
    expect(requestVideoFrameCallback).toHaveBeenCalledOnce();
    expect(animationFrames.request).not.toHaveBeenCalled();
    scheduler.cancel(video, frame);
    expect(cancelVideoFrameCallback).toHaveBeenCalledWith(7);
  });

  it('falls back to requestAnimationFrame', () => {
    const animationFrames: AnimationFrameApi = {
      request: vi.fn().mockReturnValue(9),
      cancel: vi.fn(),
    };
    const video = {} as HTMLVideoElement;
    const scheduler = new BrowserVideoFrameScheduler(animationFrames);
    const callback = vi.fn();

    const frame = scheduler.request(video, callback);
    expect(frame).toEqual({ kind: 'animation', id: 9 });
    expect(animationFrames.request).toHaveBeenCalledWith(callback);
    scheduler.cancel(video, frame);
    expect(animationFrames.cancel).toHaveBeenCalledWith(9);
  });
});
