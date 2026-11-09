import type {
  PoseFrameResult,
  PoseLandmark,
  TrackingStatus,
} from '@action-quiz/contracts';
import { classifyPose } from './classifiers/action-selector';
import type { ActionSelection } from './classifiers/classifier-types';
import { LandmarkSmoother } from './landmark-smoother';

export interface MonotonicClock {
  now(): number;
}

export interface PoseClassifier {
  classify(landmarks: readonly PoseLandmark[]): ActionSelection;
  reset(): void;
}

const STATELESS_POSE_CLASSIFIER: PoseClassifier = {
  classify: classifyPose,
  reset: () => undefined,
};

export class PoseFrameProcessor {
  private lastTimestampMs = 0;

  constructor(
    private readonly clock: MonotonicClock,
    private readonly smoother = new LandmarkSmoother(),
    private readonly classifier = STATELESS_POSE_CLASSIFIER,
  ) {}

  processTracking(landmarks: readonly PoseLandmark[]): PoseFrameResult {
    const smoothedLandmarks = this.smoother.update(landmarks);
    const selection = this.classifier.classify(smoothedLandmarks);
    return {
      timestampMs: this.nextTimestamp(),
      detectedAction: selection.detectedAction,
      confidence: selection.confidence,
      landmarks: smoothedLandmarks,
      trackingStatus: 'tracking',
    };
  }

  processLost(): PoseFrameResult {
    return this.processNotTracking('lost');
  }

  processUnavailable(): PoseFrameResult {
    return this.processNotTracking('unavailable');
  }

  reset(): void {
    this.smoother.reset();
    this.classifier.reset();
  }

  private processNotTracking(
    trackingStatus: Exclude<TrackingStatus, 'tracking'>,
  ): PoseFrameResult {
    this.reset();
    return {
      timestampMs: this.nextTimestamp(),
      detectedAction: null,
      confidence: 0,
      landmarks: [],
      trackingStatus,
    };
  }

  private nextTimestamp(): number {
    const current = this.clock.now();
    if (Number.isFinite(current)) {
      this.lastTimestampMs = Math.max(0, this.lastTimestampMs, current);
    }
    return this.lastTimestampMs;
  }
}
