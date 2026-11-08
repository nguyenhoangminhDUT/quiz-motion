import type { PoseLandmark } from '@action-quiz/contracts';
import { isReliableLandmark } from './geometry';
import { POSE_LANDMARK_COUNT } from './landmark-index';
import { POSE_TRACKING_CONFIG } from './tracking-config';

export class LandmarkSmoother {
  private previous: PoseLandmark[] | null = null;

  constructor(
    private readonly alpha: number = POSE_TRACKING_CONFIG.smoothingAlpha,
    private readonly reliabilityThreshold: number = POSE_TRACKING_CONFIG.minimumLandmarkReliability,
  ) {
    if (!Number.isFinite(alpha) || alpha <= 0 || alpha > 1) {
      throw new RangeError('Smoothing alpha must be in the range (0, 1].');
    }
    if (
      !Number.isFinite(reliabilityThreshold) ||
      reliabilityThreshold < 0 ||
      reliabilityThreshold > 1
    ) {
      throw new RangeError(
        'Reliability threshold must be in the range [0, 1].',
      );
    }
  }

  update(landmarks: readonly PoseLandmark[]): readonly PoseLandmark[] {
    if (landmarks.length !== POSE_LANDMARK_COUNT) {
      throw new RangeError(
        `Expected ${POSE_LANDMARK_COUNT} landmarks, received ${landmarks.length}.`,
      );
    }

    const smoothed = landmarks.map((current, index) => {
      const previous = this.previous?.[index];
      if (!previous) return { ...current };

      const { visibility, presence } = current;
      if (!isReliableLandmark(current, this.reliabilityThreshold)) {
        return {
          ...previous,
          visibility,
          presence,
        };
      }

      return {
        x: ema(previous.x, current.x, this.alpha),
        y: ema(previous.y, current.y, this.alpha),
        z: ema(previous.z, current.z, this.alpha),
        visibility: current.visibility,
        presence: current.presence,
      };
    });
    this.previous = smoothed;
    return smoothed;
  }

  reset(): void {
    this.previous = null;
  }
}

function ema(previous: number, current: number, alpha: number): number {
  return alpha * current + (1 - alpha) * previous;
}
