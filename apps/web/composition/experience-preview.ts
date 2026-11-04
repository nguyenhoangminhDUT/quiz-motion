import type { ActionId, TrackingStatus } from '@action-quiz/contracts';
import type {
  CameraPreviewState,
  ExperienceFeedback,
  FeedbackStatus,
} from '@/features/experience';

export interface ExperiencePreviewState extends ExperienceFeedback {
  readonly progress: number;
  readonly actionId: ActionId | null;
  readonly trackingStatus: TrackingStatus;
  readonly camera: CameraPreviewState;
}

export const INITIAL_EXPERIENCE_PREVIEW: ExperiencePreviewState = {
  status: 'ready',
  candidateOptionId: null,
  confirmedOptionId: null,
  progress: 0,
  error: null,
  actionId: null,
  trackingStatus: 'tracking',
  camera: 'sample',
};

export type PreviewAction =
  | { readonly type: 'reset' }
  | {
      readonly type: 'pose';
      readonly actionId: ActionId | null;
      readonly optionId: string | null;
    }
  | { readonly type: 'camera'; readonly camera: CameraPreviewState }
  | { readonly type: 'tracking'; readonly trackingStatus: TrackingStatus }
  | { readonly type: 'progress'; readonly progress: number }
  | { readonly type: 'status'; readonly status: FeedbackStatus };

/** Development-only view simulator. Never writes to the game store or gateway. */
export function experiencePreviewReducer(
  state: ExperiencePreviewState,
  action: PreviewAction,
): ExperiencePreviewState {
  switch (action.type) {
    case 'reset':
      return INITIAL_EXPERIENCE_PREVIEW;
    case 'pose':
      return {
        ...INITIAL_EXPERIENCE_PREVIEW,
        actionId: action.actionId,
        candidateOptionId: action.actionId ? action.optionId : null,
        trackingStatus: action.actionId ? 'tracking' : 'lost',
        status: action.actionId ? 'detecting' : 'ready',
      };
    case 'camera':
      return {
        ...INITIAL_EXPERIENCE_PREVIEW,
        camera: action.camera,
        trackingStatus: action.camera === 'sample' ? 'tracking' : 'unavailable',
      };
    case 'tracking':
      return {
        ...INITIAL_EXPERIENCE_PREVIEW,
        camera: state.camera,
        trackingStatus:
          state.camera === 'sample' ? action.trackingStatus : 'unavailable',
      };
    case 'progress': {
      if (
        !state.candidateOptionId ||
        state.trackingStatus !== 'tracking' ||
        state.camera !== 'sample'
      )
        return state;
      return {
        ...state,
        status: 'holding',
        confirmedOptionId: null,
        error: null,
        progress: Number.isFinite(action.progress)
          ? Math.min(1, Math.max(0, action.progress))
          : 0,
      };
    }
    case 'status': {
      const requiresAnswer = [
        'holding',
        'confirmed',
        'submitting',
        'submitted',
      ].includes(action.status);
      if (
        requiresAnswer &&
        (!state.candidateOptionId ||
          state.trackingStatus !== 'tracking' ||
          state.camera !== 'sample')
      )
        return state;
      const confirmed = ['confirmed', 'submitting', 'submitted'].includes(
        action.status,
      );
      return {
        ...state,
        status: action.status,
        candidateOptionId:
          action.status === 'ready' ? null : state.candidateOptionId,
        confirmedOptionId: confirmed ? state.candidateOptionId : null,
        progress: confirmed
          ? 1
          : action.status === 'holding'
            ? state.progress
            : 0,
        error:
          action.status === 'error'
            ? 'The answer could not be sent. Please try again.'
            : null,
      };
    }
  }
}
