import type { PoseFrameResult } from '@action-quiz/contracts';

export function hasTrackedAction(frame: PoseFrameResult): boolean {
  return frame.trackingStatus === 'tracking' && frame.detectedAction !== null;
}
