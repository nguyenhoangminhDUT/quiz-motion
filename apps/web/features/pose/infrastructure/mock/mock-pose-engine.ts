import {
  poseFrameSchema,
  type ActionId,
  type PoseFrameResult,
  type PoseUpdatedEvent,
} from '@action-quiz/contracts';
import type {
  PoseEngine,
  PoseEngineStatus,
} from '../../application/ports/pose-engine';

export class MockPoseEngine implements PoseEngine {
  readonly provider = 'mock';
  private currentStatus: PoseEngineStatus = 'new';
  private readonly listeners = new Set<(event: PoseUpdatedEvent) => void>();
  private lastTimestampMs = 0;

  constructor(private readonly now: () => number) {}
  get status(): PoseEngineStatus {
    return this.currentStatus;
  }

  async initialize(): Promise<void> {
    this.assertAlive();
    if (this.currentStatus === 'new') this.currentStatus = 'ready';
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
      landmarks: [],
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
    this.listeners.clear();
    this.currentStatus = 'disposed';
  }
  private assertAlive(): void {
    if (this.currentStatus === 'disposed')
      throw new Error('Pose engine has been disposed.');
  }
}
