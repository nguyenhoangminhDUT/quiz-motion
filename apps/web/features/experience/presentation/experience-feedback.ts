export const FEEDBACK_STATUSES = [
  'ready',
  'detecting',
  'holding',
  'confirmed',
  'submitting',
  'submitted',
  'error',
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export const CAMERA_PREVIEW_STATES = [
  'sample',
  'loading',
  'denied',
  'unavailable',
  'error',
] as const;
export type CameraPreviewState = (typeof CAMERA_PREVIEW_STATES)[number];

/** View snapshots, not game transitions or submission commands. */
export interface ExperienceFeedback {
  readonly status: FeedbackStatus;
  readonly candidateOptionId: string | null;
  readonly confirmedOptionId: string | null;
  readonly error: string | null;
}
