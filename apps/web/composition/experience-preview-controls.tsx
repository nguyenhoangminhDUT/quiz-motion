import type { TrackingStatus } from '@action-quiz/contracts';
import {
  CAMERA_PREVIEW_STATES,
  FEEDBACK_STATUSES,
  type CameraPreviewState,
  type FeedbackStatus,
} from '@/features/experience';
import type { ExperiencePreviewState } from './experience-preview';
import styles from '@/features/experience/presentation/components/gameplay.module.css';

export function ExperiencePreviewControls({
  preview,
  soundEnabled,
  onCamera,
  onTracking,
  onStatus,
  onProgress,
  onReset,
  onTestSound,
}: {
  readonly preview: ExperiencePreviewState;
  readonly soundEnabled: boolean;
  readonly onCamera: (camera: CameraPreviewState) => void;
  readonly onTracking: (tracking: TrackingStatus) => void;
  readonly onStatus: (status: FeedbackStatus) => void;
  readonly onProgress: (progress: number) => void;
  readonly onReset: () => void;
  readonly onTestSound: () => void;
}) {
  const canSelect = Boolean(
    preview.candidateOptionId &&
    preview.camera === 'sample' &&
    preview.trackingStatus === 'tracking',
  );
  return (
    <fieldset className={styles.previewControls}>
      <legend>Experience simulation</legend>
      <p>
        Choose a pose mapped to an answer first. These controls only change the
        preview.
      </p>
      <div className={styles.controlGrid}>
        <label>
          Camera preview
          <select
            value={preview.camera}
            onChange={(event) => {
              const camera = CAMERA_PREVIEW_STATES.find(
                (value) => value === event.target.value,
              );
              if (camera) onCamera(camera);
            }}
          >
            {CAMERA_PREVIEW_STATES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tracking preview
          <select
            value={preview.trackingStatus}
            disabled={preview.camera !== 'sample'}
            onChange={(event) => {
              const tracking = (
                ['tracking', 'lost', 'unavailable'] as const
              ).find((value) => value === event.target.value);
              if (tracking) onTracking(tracking);
            }}
          >
            {['tracking', 'lost', 'unavailable'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Preview game state
          <select
            value={preview.status}
            onChange={(event) => {
              const status = FEEDBACK_STATUSES.find(
                (value) => value === event.target.value,
              );
              if (status) onStatus(status);
            }}
          >
            {FEEDBACK_STATUSES.map((value) => (
              <option
                key={value}
                value={value}
                disabled={
                  !canSelect &&
                  ['holding', 'confirmed', 'submitting', 'submitted'].includes(
                    value,
                  )
                }
              >
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Preview hold progress: {Math.round(preview.progress * 100)}%
          <input
            type="range"
            aria-label="Preview hold progress"
            min="0"
            max="100"
            step="1"
            value={Math.round(preview.progress * 100)}
            disabled={!canSelect}
            onChange={(event) => onProgress(Number(event.target.value) / 100)}
          />
        </label>
      </div>
      <p className={styles.controlHelp}>
        A full ring does not confirm or send an answer. Choose a state above to
        preview that feedback.
      </p>
      <div className={styles.controlButtons}>
        <button type="button" className="secondary-button" onClick={onReset}>
          Reset experience preview
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!soundEnabled}
          onClick={onTestSound}
        >
          Test sound
        </button>
      </div>
    </fieldset>
  );
}
