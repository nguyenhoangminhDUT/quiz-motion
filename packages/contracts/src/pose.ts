import type { ActionId } from './action';

export interface PoseLandmark {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly visibility?: number | undefined;
  readonly presence?: number | undefined;
}
export type TrackingStatus = 'tracking' | 'lost' | 'unavailable';
export interface PoseFrameResult {
  /** Monotonic milliseconds from the same session clock, never a Unix date. */
  readonly timestampMs: number;
  readonly detectedAction: ActionId | null;
  /** Rule match strength [0,1], not a calibrated probability. */
  readonly confidence: number;
  readonly landmarks: readonly PoseLandmark[];
  readonly trackingStatus: TrackingStatus;
}
