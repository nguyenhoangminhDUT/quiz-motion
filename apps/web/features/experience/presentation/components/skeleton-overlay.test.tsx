import { StrictMode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordingCanvasContext } from '../../../../tests/recording-canvas';
import { SAMPLE_LANDMARKS } from '../fixtures/sample-landmarks';
import { SkeletonOverlay } from './skeleton-overlay';

describe('Canvas skeleton lifecycle', () => {
  let context: ReturnType<typeof recordingCanvasContext>;
  let contextDescriptor: PropertyDescriptor | undefined;
  let ratioDescriptor: PropertyDescriptor | undefined;
  let frames: Map<number, FrameRequestCallback>;
  let resizeCallbacks: Array<() => void>;
  let resolutionCallbacks: Set<() => void>;
  let disconnect: ReturnType<typeof vi.fn>;
  let cancel: ReturnType<typeof vi.fn>;
  let width: number;
  let height: number;

  function flushFrame() {
    act(() => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(100));
    });
  }

  beforeEach(() => {
    context = recordingCanvasContext();
    contextDescriptor = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      'getContext',
    );
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => context,
    });
    ratioDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'devicePixelRatio',
    );
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    });
    width = 640;
    height = 480;
    vi.spyOn(
      HTMLCanvasElement.prototype,
      'getBoundingClientRect',
    ).mockImplementation(() => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => ({}),
    }));
    frames = new Map();
    let nextId = 0;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const id = ++nextId;
        frames.set(id, callback);
        return id;
      }),
    );
    cancel = vi.fn((id: number) => frames.delete(id));
    vi.stubGlobal('cancelAnimationFrame', cancel);
    resizeCallbacks = [];
    disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resizeCallbacks.push(callback);
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    resolutionCallbacks = new Set();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        addEventListener: (_event: string, callback: () => void) =>
          resolutionCallbacks.add(callback),
        removeEventListener: (_event: string, callback: () => void) =>
          resolutionCallbacks.delete(callback),
      })),
    );
  });

  afterEach(() => {
    cleanup();
    if (contextDescriptor)
      Object.defineProperty(
        HTMLCanvasElement.prototype,
        'getContext',
        contextDescriptor,
      );
    if (ratioDescriptor)
      Object.defineProperty(window, 'devicePixelRatio', ratioDescriptor);
    vi.unstubAllGlobals();
  });

  it('sizes to the viewport and display density, coalesces updates, and releases resources in StrictMode', () => {
    const { unmount } = render(
      <StrictMode>
        <SkeletonOverlay landmarks={SAMPLE_LANDMARKS.ACT_01} />
      </StrictMode>,
    );
    expect(frames.size).toBe(1);
    flushFrame();
    const canvas = screen.getByRole('img', { name: 'Pose skeleton overlay' });
    expect(canvas).toHaveAttribute('width', '1280');
    expect(canvas).toHaveAttribute('height', '960');
    expect(context.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
    expect(context.arc).toHaveBeenCalledTimes(33);
    expect(frames.size).toBe(0);

    width = 960;
    height = 540;
    resizeCallbacks.at(-1)?.();
    resizeCallbacks.at(-1)?.();
    window.dispatchEvent(new Event('resize'));
    expect(frames.size).toBe(1);
    flushFrame();
    expect(canvas).toHaveAttribute('width', '1920');
    expect(canvas).toHaveAttribute('height', '1080');

    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 1,
    });
    [...resolutionCallbacks].forEach((callback) => callback());
    flushFrame();
    expect(canvas).toHaveAttribute('width', '960');
    expect(context.setTransform).toHaveBeenLastCalledWith(1, 0, 0, 1, 0, 0);

    resizeCallbacks.at(-1)?.();
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(resolutionCallbacks.size).toBe(0);
    window.dispatchEvent(new Event('resize'));
    resizeCallbacks.forEach((callback) => callback());
    expect(frames.size).toBe(0);
  });

  it('draws the latest props, mirrors without changing input, and clears on the next frame after tracking loss', () => {
    const landmarks = [{ x: 0.25, y: 0.5, z: 0 }];
    const { rerender } = render(<SkeletonOverlay landmarks={landmarks} />);
    rerender(<SkeletonOverlay landmarks={landmarks} mirrored />);
    expect(frames.size).toBe(1);
    flushFrame();
    expect(context.arc).toHaveBeenLastCalledWith(480, 240, 4, 0, Math.PI * 2);
    expect(landmarks[0]?.x).toBe(0.25);
    context.arc.mockClear();
    context.clearRect.mockClear();
    rerender(<SkeletonOverlay landmarks={landmarks} trackingStatus="lost" />);
    flushFrame();
    expect(context.clearRect).toHaveBeenCalledExactlyOnceWith(0, 0, 640, 480);
    expect(context.arc).not.toHaveBeenCalled();

    rerender(
      <SkeletonOverlay landmarks={landmarks} trackingStatus="tracking" />,
    );
    flushFrame();
    expect(context.arc).toHaveBeenLastCalledWith(160, 240, 4, 0, Math.PI * 2);
  });
});
