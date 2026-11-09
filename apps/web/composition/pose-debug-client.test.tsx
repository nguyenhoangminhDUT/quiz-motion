import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  type CameraStatus,
  type PoseFrameResult,
  type PoseUpdatedEvent,
} from '@action-quiz/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PoseEngine, PoseEngineStatus } from '@/features/pose';
import { PoseDebugClient } from './pose-debug-client';

class FakePoseEngine implements PoseEngine {
  readonly provider = 'mediapipe';
  status: PoseEngineStatus = 'new';
  cameraStatus: CameraStatus = 'idle';
  readonly stream = { getTracks: () => [] } as unknown as MediaStream;
  readonly attachVideo = vi.fn();
  readonly start = vi.fn(() => {
    this.status = 'running';
  });
  readonly stop = vi.fn(() => {
    if (this.status !== 'disposed') this.status = 'stopped';
  });
  readonly dispose = vi.fn(() => {
    this.status = 'disposed';
  });
  private readonly poseListeners = new Set<(event: PoseUpdatedEvent) => void>();
  private readonly cameraListeners = new Set<(status: CameraStatus) => void>();

  async initialize(): Promise<void> {
    this.publishCamera('initializing');
    this.publishCamera('ready');
    this.status = 'ready';
  }

  getMediaStream(): MediaStream | null {
    return this.stream;
  }

  subscribe(listener: (event: PoseUpdatedEvent) => void): () => void {
    this.poseListeners.add(listener);
    return () => this.poseListeners.delete(listener);
  }

  subscribeCameraStatus(listener: (status: CameraStatus) => void): () => void {
    this.cameraListeners.add(listener);
    return () => this.cameraListeners.delete(listener);
  }

  emitFrame(frame: PoseFrameResult): void {
    const event: PoseUpdatedEvent = {
      type: 'POSE_UPDATED',
      timestampMs: frame.timestampMs,
      payload: { frame },
    };
    for (const listener of this.poseListeners) listener(event);
  }

  private publishCamera(status: CameraStatus): void {
    this.cameraStatus = status;
    for (const listener of this.cameraListeners) listener(status);
  }
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2);
  vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(
    1280,
  );
  vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(
    720,
  );
});

describe('PoseDebugClient', () => {
  it('starts a real-provider workflow and displays pose results', async () => {
    const engine = new FakePoseEngine();
    const { unmount } = render(
      <PoseDebugClient engineFactory={() => engine} />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Enable camera and model' }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('pose-debug-phase')).toHaveTextContent(
        'running',
      ),
    );

    expect(engine.attachVideo).toHaveBeenCalledOnce();
    expect(engine.start).toHaveBeenCalledOnce();
    expect(screen.getByTestId('pose-debug-camera')).toHaveTextContent('ready');

    act(() => {
      engine.emitFrame(trackingFrame());
    });
    expect(screen.getByTestId('pose-debug-action')).toHaveTextContent('Y-Pose');
    expect(screen.getByTestId('pose-debug-tracking')).toHaveTextContent(
      'tracking',
    );
    expect(screen.getByTestId('pose-debug-confidence')).toHaveTextContent(
      '0.840',
    );
    expect(screen.getByText('DETECTED NOW')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pause inference' }));
    expect(screen.getByTestId('pose-debug-phase')).toHaveTextContent('paused');
    expect(engine.stop).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Resume inference' }));
    expect(engine.start).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Close camera' }));
    expect(engine.dispose).toHaveBeenCalledOnce();
    expect(screen.getByTestId('pose-debug-phase')).toHaveTextContent('idle');
    unmount();
  });

  it('cleans up the engine when the page unmounts', async () => {
    const engine = new FakePoseEngine();
    const { unmount } = render(
      <PoseDebugClient engineFactory={() => engine} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Enable camera and model' }),
    );
    await waitFor(() => expect(engine.start).toHaveBeenCalledOnce());
    unmount();
    expect(engine.stop).toHaveBeenCalledOnce();
    expect(engine.dispose).toHaveBeenCalledOnce();
  });
});

function trackingFrame(): PoseFrameResult {
  return {
    timestampMs: 100,
    detectedAction: 'ACT_01',
    confidence: 0.84,
    trackingStatus: 'tracking',
    landmarks: Array.from({ length: 33 }, (_, index) => ({
      x: index / 33,
      y: index / 66,
      z: 0,
      visibility: 1,
      presence: 1,
    })),
  };
}
