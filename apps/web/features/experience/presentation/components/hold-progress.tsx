import type { FeedbackStatus } from '../experience-feedback';
import styles from './gameplay.module.css';

export function HoldProgress({
  progress,
  status = 'ready',
}: {
  progress: number;
  status?: FeedbackStatus;
}) {
  const bounded = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  return (
    <div className={styles.holdLayout}>
      <div
        className={styles.holdRing}
        aria-hidden="true"
        style={{
          background: `conic-gradient(#416b30 ${bounded * 360}deg, #e0e6d9 0deg)`,
        }}
      >
        <span>{Math.round(bounded * 100)}%</span>
      </div>
      <div className={styles.holdDetail}>
        <strong>Hold progress</strong>
        <progress
          aria-label="Hold progress"
          aria-valuetext={`${Math.round(bounded * 100)} percent`}
          value={bounded}
          max={1}
        />
        <p>
          {status === 'confirmed' ||
          status === 'submitting' ||
          status === 'submitted'
            ? 'Selection confirmed.'
            : bounded === 1
              ? 'Pose held. Waiting for confirmation.'
              : 'Hold your answer pose until the ring fills.'}
        </p>
      </div>
    </div>
  );
}
