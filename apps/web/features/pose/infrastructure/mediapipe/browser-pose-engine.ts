import {
  poseFrameSchema,
  type CameraStatus,
  type PoseFrameResult,
  type PoseLandmark,
  type PoseUpdatedEvent,
} from '@action-quiz/contracts';
import type {
  PoseEngine,
  PoseEngineStatus,
} from '../../application/ports/pose-engine';
import {
  PoseFrameProcessor,
  type MonotonicClock,
} from '../../domain/pose-frame-processor';
import {
  CameraManager,
  type CameraMediaDevices,
} from '../camera/camera-manager';
import { createMediaPipePoseLandmarker } from './mediapipe-pose-landmarker';
import {
  MediaPipeVideoPoseDetector,
  type VideoPoseDetection,
  type VideoPoseDetectionListener,
  type VideoPoseErrorListener,
} from './video-pose-detector';

const HAVE_CURRENT_DATA = 2;

export interface BrowserCameraController {
  readonly status: CameraStatus;
  initialize(): Promise<MediaStream>;
  getMediaStream(): MediaStream | null;
  subscribe(listener: (status: CameraStatus) => void): () => void;
  dispose(): void;
}

export interface VideoPoseDetectorController {
  start(
    video: HTMLVideoElement,
    onResult: VideoPoseDetectionListener,
    onError: VideoPoseErrorListener,
  ): void;
  stop(): void;
  dispose(): void;
}

export interface PoseFramePolicy {
  processTracking(landmarks: readonly PoseLandmark[]): PoseFrameResult;
  processLost(): PoseFrameResult;
  processUnavailable(): PoseFrameResult;
  reset(): void;
}

export type VideoPoseDetectorFactory =
  () => Promise<VideoPoseDetectorController>;

export class BrowserPoseEngine implements PoseEngine {
  readonly provider = 'mediapipe';
  private currentStatus: PoseEngineStatus = 'new';
  private currentCameraStatus: CameraStatus;
  private detector: VideoPoseDetectorController | null = null;
  private video: HTMLVideoElement | null = null;
  private initialization: Promise<void> | null = null;
  private readonly listeners = new Set<(event: PoseUpdatedEvent) => void>();
  private readonly cameraListeners = new Set<(status: CameraStatus) => void>();
  private readonly unsubscribeCamera: () => void;

  constructor(
    private readonly camera: BrowserCameraController,
    private readonly createDetector: VideoPoseDetectorFactory,
    private readonly framePolicy: PoseFramePolicy,
  ) {
    this.currentCameraStatus = camera.status;
    this.unsubscribeCamera = camera.subscribe((status) => {
      this.handleCameraStatus(status);
    });
  }

  get status(): PoseEngineStatus {
    return this.currentStatus;
  }

  get cameraStatus(): CameraStatus {
    return this.currentCameraStatus;
  }

  initialize(): Promise<void> {
    this.assertAlive();
    if (this.currentStatus !== 'new') return Promise.resolve();
    if (this.initialization) return this.initialization;

    const initialization = this.initializeResources().finally(() => {
      if (this.initialization === initialization) this.initialization = null;
    });
    this.initialization = initialization;
    return initialization;
  }

  getMediaStream(): MediaStream | null {
    this.assertAlive();
    return this.camera.getMediaStream();
  }

  attachVideo(video: HTMLVideoElement): void {
    this.assertAlive();
    if (this.currentStatus === 'running') {
      throw new Error(
        'Stop the pose engine before replacing its video source.',
      );
    }
    this.video = video;
  }

  start(): void {
    this.assertAlive();
    if (this.currentStatus === 'running') return;
    if (this.currentStatus === 'new' || !this.detector) {
      throw new Error('Initialize the pose engine before starting.');
    }
    if (!this.camera.getMediaStream() || this.currentCameraStatus !== 'ready') {
      throw new Error('Camera stream is not ready.');
    }
    if (!this.video) throw new Error('Attach a video before starting.');
    if (this.video.readyState < HAVE_CURRENT_DATA) {
      throw new Error('The attached video does not have a decoded frame yet.');
    }

    try {
      this.currentStatus = 'running';
      this.detector.start(
        this.video,
        (detection) => this.handleDetection(detection),
        () => this.handleInferenceError(),
      );
    } catch (error: unknown) {
      this.handleInferenceError();
      throw error;
    }
  }

  stop(): void {
    if (this.currentStatus === 'disposed' || this.currentStatus === 'new')
      return;
    if (this.currentStatus === 'running') this.detector?.stop();
    this.framePolicy.reset();
    this.currentStatus = 'stopped';
  }

  subscribe(listener: (event: PoseUpdatedEvent) => void): () => void {
    this.assertAlive();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeCameraStatus(listener: (status: CameraStatus) => void): () => void {
    this.assertAlive();
    this.cameraListeners.add(listener);
    return () => {
      this.cameraListeners.delete(listener);
    };
  }

  dispose(): void {
    if (this.currentStatus === 'disposed') return;
    this.currentStatus = 'disposed';
    this.detector?.dispose();
    this.detector = null;
    this.video = null;
    this.framePolicy.reset();
    this.camera.dispose();
    this.unsubscribeCamera();
    this.listeners.clear();
    this.cameraListeners.clear();
  }

  private async initializeResources(): Promise<void> {
    if (!this.detector) {
      try {
        const detector = await this.createDetector();
        if (this.currentStatus === 'disposed') {
          detector.dispose();
          throw new Error('Pose engine was disposed during initialization.');
        }
        this.detector = detector;
      } catch (error: unknown) {
        if (this.currentStatus !== 'disposed')
          this.publishCameraStatus('error');
        throw error;
      }
    }

    await this.camera.initialize();
    if (this.currentStatus === 'disposed') {
      throw new Error('Pose engine was disposed during initialization.');
    }
    this.currentStatus = 'ready';
  }

  private handleDetection(detection: VideoPoseDetection): void {
    if (this.currentStatus !== 'running') return;
    try {
      const frame = detection.landmarks
        ? this.framePolicy.processTracking(detection.landmarks)
        : this.framePolicy.processLost();
      this.publishFrame(frame);
    } catch {
      this.handleInferenceError();
    }
  }

  private handleInferenceError(): void {
    if (this.currentStatus === 'disposed') return;
    this.detector?.stop();
    this.currentStatus = 'stopped';
    this.publishCameraStatus('error');
    this.publishFrame(this.framePolicy.processUnavailable());
  }

  private handleCameraStatus(status: CameraStatus): void {
    this.publishCameraStatus(status);
    if (status === 'stopped' && this.currentStatus === 'running') {
      this.detector?.stop();
      this.currentStatus = 'stopped';
      this.publishFrame(this.framePolicy.processUnavailable());
    }
  }

  private publishFrame(frame: PoseFrameResult): void {
    const validatedFrame = poseFrameSchema.parse(frame);
    const event: PoseUpdatedEvent = {
      type: 'POSE_UPDATED',
      timestampMs: validatedFrame.timestampMs,
      payload: { frame: validatedFrame },
    };
    for (const listener of [...this.listeners]) listener(event);
  }

  private publishCameraStatus(status: CameraStatus): void {
    if (this.currentCameraStatus === status) return;
    this.currentCameraStatus = status;
    for (const listener of [...this.cameraListeners]) listener(status);
  }

  private assertAlive(): void {
    if (this.currentStatus === 'disposed') {
      throw new Error('Pose engine has been disposed.');
    }
  }
}

export function createBrowserPoseEngine(
  clock: MonotonicClock = { now: () => performance.now() },
  mediaDevices: CameraMediaDevices = navigator.mediaDevices,
): PoseEngine {
  const camera = new CameraManager(mediaDevices);
  return new BrowserPoseEngine(
    camera,
    async () =>
      new MediaPipeVideoPoseDetector(await createMediaPipePoseLandmarker()),
    new PoseFrameProcessor(clock),
  );
}
