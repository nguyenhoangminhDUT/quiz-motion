import {
  poseFrameSchema,
  type ActionId,
  type CameraStatus,
  type PoseFrameResult,
  type PoseUpdatedEvent,
} from '@action-quiz/contracts';
import type {
  PoseEngine,
  PoseEngineStatus,
} from '../../application/ports/pose-engine';
import { MOCK_LANDMARKS } from './mock-landmarks';

export class MockPoseEngine implements PoseEngine {
  readonly provider = 'mock';
  private currentStatus: PoseEngineStatus = 'new';
  private currentCameraStatus: CameraStatus = 'idle';
  private readonly listeners = new Set<(event: PoseUpdatedEvent) => void>();
  private readonly cameraListeners = new Set<(status: CameraStatus) => void>();
  private lastTimestampMs = 0;

  constructor(private readonly now: () => number) {}
  get status(): PoseEngineStatus {
    return this.currentStatus;
  }
  /** Manual input never opens a camera. */
  get cameraStatus(): CameraStatus {
    return this.currentCameraStatus;
  }

  async initialize(): Promise<void> {
    this.assertAlive();
    if (this.currentStatus !== 'new') return;
    this.publishCameraStatus('initializing');
    this.currentStatus = 'ready';
    this.publishCameraStatus('ready');
  }
  getMediaStream(): MediaStream | null {
    this.assertAlive();
    return null;
  }
  attachVideo(): void {
    this.assertAlive();
    // The manual provider does not read video frames.
  }
  start(): void {
    this.assertAlive();
    if (this.currentStatus === 'new')
      throw new Error('Initialize the pose engine before starting.');
    this.currentStatus = 'running';
  }
  stop(): void {
    if (this.currentStatus !== 'disposed' && this.currentStatus !== 'new')
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
  /** Manual development input. Never represents webcam inference. */
  emitAction(actionId: ActionId | null): void {
    this.assertAlive();
    if (this.currentStatus !== 'running')
      throw new Error('Pose engine is not running.');
    const timestampMs = Math.max(this.lastTimestampMs, this.now());
    const frame: PoseFrameResult = poseFrameSchema.parse({
      timestampMs,
      detectedAction: actionId,
      confidence: actionId === null ? 0 : 1,
      trackingStatus: actionId === null ? 'lost' : 'tracking',
      landmarks: actionId === null ? [] : MOCK_LANDMARKS,
    });
    this.lastTimestampMs = timestampMs;
    const event: PoseUpdatedEvent = {
      type: 'POSE_UPDATED',
      timestampMs,
      payload: { frame },
    };
    for (const listener of [...this.listeners]) listener(event);
  }
  dispose(): void {
    if (this.currentStatus === 'disposed') return;
    this.publishCameraStatus('stopped');
    this.listeners.clear();
    this.cameraListeners.clear();
    this.currentStatus = 'disposed';
  }
  private publishCameraStatus(status: CameraStatus): void {
    this.currentCameraStatus = status;
    for (const listener of [...this.cameraListeners]) listener(status);
  }
  private assertAlive(): void {
    if (this.currentStatus === 'disposed')
      throw new Error('Pose engine has been disposed.');
  }
}
