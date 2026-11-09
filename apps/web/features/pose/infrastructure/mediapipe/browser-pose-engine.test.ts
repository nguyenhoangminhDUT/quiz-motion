import {
  poseFrameSchema,
  type CameraStatus,
  type PoseFrameResult,
  type PoseUpdatedEvent,
} from '@action-quiz/contracts';
import { describe, expect, it, vi } from 'vitest';
import { PoseFrameProcessor } from '../../domain/pose-frame-processor';
import { createYPose } from '../../domain/classifiers/pose-fixtures.test-helper';
import { CameraManager } from '../camera/camera-manager';
import {
  BrowserPoseEngine,
  type PoseFramePolicy,
  type VideoPoseDetectorController,
} from './browser-pose-engine';
import type {
  VideoPoseDetection,
  VideoPoseDetectionListener,
  VideoPoseErrorListener,
} from './video-pose-detector';

class FakeTrack extends EventTarget {
  readonly stop = vi.fn();

  end(): void {
    this.dispatchEvent(new Event('ended'));
  }
}

class FakeDetector implements VideoPoseDetectorController {
  readonly stop = vi.fn();
  readonly dispose = vi.fn();
  readonly start = vi.fn(
    (
      _video: HTMLVideoElement,
      onResult: VideoPoseDetectionListener,
      onError: VideoPoseErrorListener,
    ) => {
      this.onResult = onResult;
      this.onError = onError;
    },
  );
  private onResult: VideoPoseDetectionListener | null = null;
  private onError: VideoPoseErrorListener | null = null;

  emit(detection: VideoPoseDetection): void {
    this.onResult?.(detection);
  }

  fail(error: unknown): void {
    this.onError?.(error);
  }
}

function mediaStream(track: FakeTrack): MediaStream {
  return { getTracks: () => [track] } as unknown as MediaStream;
}

function readyVideo(readyState = 2): HTMLVideoElement {
  return { readyState, currentTime: 0 } as HTMLVideoElement;
}

function setup() {
  const track = new FakeTrack();
  const stream = mediaStream(track);
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  const camera = new CameraManager({ getUserMedia });
  const detector = new FakeDetector();
  const createDetector = vi.fn().mockResolvedValue(detector);
  let now = 0;
  const processor = new PoseFrameProcessor({ now: () => ++now });
  const engine = new BrowserPoseEngine(camera, createDetector, processor);
  return {
    camera,
    createDetector,
    detector,
    engine,
    getUserMedia,
    stream,
    track,
  };
}

describe('BrowserPoseEngine', () => {
  it('runs the complete lifecycle while retaining the stream across stop/start', async () => {
    const { detector, engine, getUserMedia, stream, track } = setup();
    const cameraStatuses: CameraStatus[] = [];
    const events: PoseUpdatedEvent[] = [];
    engine.subscribeCameraStatus((status) => cameraStatuses.push(status));
    engine.subscribe((event) => events.push(event));

    expect(engine.provider).toBe('mediapipe');
    expect(engine.status).toBe('new');
    await engine.initialize();
    expect(engine.status).toBe('ready');
    expect(engine.getMediaStream()).toBe(stream);
    expect(cameraStatuses).toEqual(['initializing', 'ready']);
    expect(getUserMedia).toHaveBeenCalledOnce();

    const video = readyVideo();
    engine.attachVideo(video);
    engine.start();
    expect(engine.status).toBe('running');
    detector.emit({ timestampMs: 10, landmarks: createYPose() });
    expect(events[0]?.payload.frame).toMatchObject({
      detectedAction: 'ACT_01',
      trackingStatus: 'tracking',
    });
    expect(poseFrameSchema.safeParse(events[0]?.payload.frame).success).toBe(
      true,
    );

    detector.emit({ timestampMs: 11, landmarks: null });
    expect(events[1]?.payload.frame).toMatchObject({
      detectedAction: null,
      confidence: 0,
      landmarks: [],
      trackingStatus: 'lost',
    });

    engine.stop();
    expect(engine.status).toBe('stopped');
    expect(track.stop).not.toHaveBeenCalled();
    expect(engine.getMediaStream()).toBe(stream);
    engine.start();
    expect(detector.start).toHaveBeenCalledTimes(2);

    engine.dispose();
    engine.dispose();
    expect(engine.status).toBe('disposed');
    expect(detector.dispose).toHaveBeenCalledOnce();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(cameraStatuses).toEqual(['initializing', 'ready', 'stopped']);
  });

  it('shares concurrent initialization and initializes each resource once', async () => {
    const { createDetector, engine, getUserMedia } = setup();
    const first = engine.initialize();
    const second = engine.initialize();
    expect(first).toBe(second);
    await Promise.all([first, second]);
    await engine.initialize();
    expect(createDetector).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenCalledOnce();
    engine.dispose();
  });

  it('requires initialization, an attached video and a decoded frame', async () => {
    const { engine } = setup();
    expect(() => engine.start()).toThrow('Initialize');
    await engine.initialize();
    expect(() => engine.start()).toThrow('Attach a video');
    const video = readyVideo(1);
    engine.attachVideo(video);
    expect(() => engine.start()).toThrow('decoded frame');
    (video as unknown as { readyState: number }).readyState = 2;
    engine.start();
    expect(() => engine.attachVideo(readyVideo())).toThrow('Stop');
    engine.dispose();
  });

  it('turns inference failures into an unavailable frame and error status', async () => {
    const { detector, engine, track } = setup();
    const events: PoseUpdatedEvent[] = [];
    const cameraStatuses: CameraStatus[] = [];
    engine.subscribe((event) => events.push(event));
    engine.subscribeCameraStatus((status) => cameraStatuses.push(status));
    await engine.initialize();
    engine.attachVideo(readyVideo());
    engine.start();

    detector.fail(new Error('inference failed'));

    expect(engine.status).toBe('stopped');
    expect(engine.cameraStatus).toBe('error');
    expect(cameraStatuses).toContain('error');
    expect(detector.stop).toHaveBeenCalledOnce();
    expect(track.stop).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
    expect(events[0]?.payload.frame).toMatchObject({
      trackingStatus: 'unavailable',
      detectedAction: null,
      confidence: 0,
      landmarks: [],
    });
    engine.dispose();
  });

  it('validates every tracking frame before publishing', async () => {
    const { camera, detector } = setup();
    const invalidFrame: PoseFrameResult = {
      timestampMs: 1,
      detectedAction: null,
      confidence: 0,
      landmarks: [],
      trackingStatus: 'tracking',
    };
    const unavailableFrame: PoseFrameResult = {
      timestampMs: 2,
      detectedAction: null,
      confidence: 0,
      landmarks: [],
      trackingStatus: 'unavailable',
    };
    const policy: PoseFramePolicy = {
      processTracking: vi.fn(() => invalidFrame),
      processLost: vi.fn(() => unavailableFrame),
      processUnavailable: vi.fn(() => unavailableFrame),
      reset: vi.fn(),
    };
    const engine = new BrowserPoseEngine(
      camera,
      vi.fn().mockResolvedValue(detector),
      policy,
    );
    const listener = vi.fn();
    engine.subscribe(listener);
    await engine.initialize();
    engine.attachVideo(readyVideo());
    engine.start();

    detector.emit({ timestampMs: 1, landmarks: createYPose() });

    expect(engine.cameraStatus).toBe('error');
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      type: 'POSE_UPDATED',
      timestampMs: 2,
      payload: { frame: unavailableFrame },
    });
    engine.dispose();
  });

  it('stops inference and emits unavailable when the camera track ends', async () => {
    const { detector, engine, track } = setup();
    const listener = vi.fn();
    engine.subscribe(listener);
    await engine.initialize();
    engine.attachVideo(readyVideo());
    engine.start();

    track.end();

    expect(engine.status).toBe('stopped');
    expect(engine.cameraStatus).toBe('stopped');
    expect(detector.stop).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          frame: expect.objectContaining({ trackingStatus: 'unavailable' }),
        },
      }),
    );
    engine.dispose();
  });

  it('reports model initialization failure without requesting a camera', async () => {
    const track = new FakeTrack();
    const getUserMedia = vi.fn().mockResolvedValue(mediaStream(track));
    const camera = new CameraManager({ getUserMedia });
    const error = new Error('model failed');
    const engine = new BrowserPoseEngine(
      camera,
      vi.fn().mockRejectedValue(error),
      new PoseFrameProcessor({ now: () => 1 }),
    );
    const cameraListener = vi.fn();
    engine.subscribeCameraStatus(cameraListener);

    await expect(engine.initialize()).rejects.toBe(error);

    expect(engine.status).toBe('new');
    expect(engine.cameraStatus).toBe('error');
    expect(cameraListener).toHaveBeenCalledWith('error');
    expect(getUserMedia).not.toHaveBeenCalled();
    engine.dispose();
  });

  it('unsubscribes pose and camera listeners', async () => {
    const { detector, engine } = setup();
    const poseListener = vi.fn();
    const cameraListener = vi.fn();
    const unsubscribePose = engine.subscribe(poseListener);
    const unsubscribeCamera = engine.subscribeCameraStatus(cameraListener);
    unsubscribePose();
    unsubscribeCamera();
    await engine.initialize();
    engine.attachVideo(readyVideo());
    engine.start();
    detector.emit({ timestampMs: 1, landmarks: createYPose() });
    expect(poseListener).not.toHaveBeenCalled();
    expect(cameraListener).not.toHaveBeenCalled();
    engine.dispose();
  });
});
