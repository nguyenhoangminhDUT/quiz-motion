'use client';

import { useState } from 'react';
import {
  ACTION_DEFINITIONS,
  type ActionId,
  type TrackingStatus,
} from '@action-quiz/contracts';
import { SAMPLE_LANDMARKS, SAMPLE_SOURCE } from '../fixtures/sample-landmarks';
import { CameraViewport } from './camera-viewport';
import { SkeletonOverlay } from './skeleton-overlay';
import styles from './gameplay.module.css';
import type { CameraPreviewState } from '../experience-feedback';

const EMPTY_LANDMARKS = Object.freeze([]);

/** Local drawing fixture. It never changes a pose event or game decision. */
export function SampleSkeletonPreview({
  actionId,
  trackingStatus,
  camera = 'sample',
}: {
  readonly actionId: ActionId | null;
  readonly trackingStatus: TrackingStatus;
  readonly camera?: CameraPreviewState;
}) {
  const [mirrored, setMirrored] = useState(true);
  const [partial, setPartial] = useState(false);
  const sampleAction = actionId ?? 'ACT_01';
  const sample = SAMPLE_LANDMARKS[sampleAction];
  const landmarks =
    trackingStatus !== 'tracking'
      ? EMPTY_LANDMARKS
      : partial
        ? sample.slice(0, 25)
        : sample;
  const message =
    trackingStatus === 'tracking'
      ? `Sample pose: ${ACTION_DEFINITIONS[sampleAction].name}`
      : trackingStatus === 'lost'
        ? 'Sample tracking lost. Choose a pose below to restore it.'
        : 'Sample tracking unavailable. Choose a pose below to restore it.';

  if (camera !== 'sample') return <CameraViewport mode={camera} />;

  return (
    <div>
      <CameraViewport
        mode="sample"
        overlay={
          <>
            <svg
              className={styles.sampleGuide}
              viewBox="0 0 640 480"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="636" height="476" rx="12" />
              <path d="M200 452H440" />
            </svg>
            <SkeletonOverlay
              landmarks={landmarks}
              trackingStatus={trackingStatus}
              mirrored={mirrored}
              sourceWidth={SAMPLE_SOURCE.width}
              sourceHeight={SAMPLE_SOURCE.height}
              label={message}
            />
            <p className={styles.sampleCaption} role="status">
              {message}
            </p>
          </>
        }
      />
      <div
        className={styles.skeletonControls}
        aria-label="Skeleton preview settings"
      >
        <label>
          <input
            type="checkbox"
            checked={mirrored}
            onChange={(event) => setMirrored(event.target.checked)}
          />{' '}
          Mirror preview
        </label>
        <label>
          <input
            type="checkbox"
            checked={partial}
            onChange={(event) => setPartial(event.target.checked)}
          />{' '}
          Upper body only
        </label>
      </div>
      <p className={styles.sampleNotice}>
        Illustrative landmarks only. No camera or model is running.
      </p>
    </div>
  );
}
