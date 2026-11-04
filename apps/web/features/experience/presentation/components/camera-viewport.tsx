import type { ReactNode } from 'react';
import { CameraOff, ScanLine } from 'lucide-react';
import styles from './gameplay.module.css';
import type { CameraPreviewState } from '../experience-feedback';

const messages = {
  placeholder: {
    title: 'Your space to move',
    detail:
      'Camera is not connected. You can explore the poses without turning it on.',
  },
  loading: {
    title: 'Getting the camera ready',
    detail: 'Please wait while the camera starts.',
  },
  denied: {
    title: 'Camera access is blocked',
    detail: 'Check camera permissions in your browser, then try again.',
  },
  unavailable: {
    title: 'No camera found',
    detail: 'Connect a camera or choose another available device.',
  },
  error: {
    title: 'Camera could not start',
    detail: 'Check whether another app is using the camera, then try again.',
  },
} as const;

/** Presentation slot for future client-side video and canvas resources. */
export function CameraViewport({
  overlay,
  mode = 'placeholder',
}: {
  readonly overlay?: ReactNode;
  readonly mode?: CameraPreviewState | 'placeholder';
}) {
  return (
    <section
      className={styles.viewport}
      aria-label={
        mode === 'sample'
          ? 'Sample skeleton viewport'
          : 'Camera viewport placeholder'
      }
      data-mode={mode}
    >
      <span className={styles.viewportLabel}>
        {mode === 'sample' ? (
          <>
            <ScanLine size={13} aria-hidden="true" /> SAMPLE / NO CAMERA
          </>
        ) : (
          <>
            <CameraOff size={13} aria-hidden="true" /> CAMERA PREVIEW
          </>
        )}
      </span>
      {mode !== 'sample' && (
        <div
          className={styles.viewportContent}
          role={mode === 'error' || mode === 'denied' ? 'alert' : 'status'}
        >
          <span className={styles.cameraIcon}>
            <CameraOff size={26} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h4>{messages[mode].title}</h4>
          <p>{messages[mode].detail}</p>
        </div>
      )}
      {overlay}
    </section>
  );
}
