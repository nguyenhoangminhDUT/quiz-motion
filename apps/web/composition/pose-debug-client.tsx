'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ACTION_DEFINITIONS,
  ACTION_IDS,
  type CameraStatus,
  type PoseFrameResult,
  type PoseUpdatedEvent,
} from '@action-quiz/contracts';
import { SkeletonOverlay } from '@/features/experience';
import { createBrowserPoseEngine, type PoseEngine } from '@/features/pose';
import styles from './pose-debug.module.css';

type DebugPhase = 'idle' | 'starting' | 'running' | 'paused' | 'error';
type EngineFactory = () => PoseEngine;

const EMPTY_LANDMARKS = Object.freeze([]);

export function PoseDebugClient({
  engineFactory = createBrowserPoseEngine,
}: {
  readonly engineFactory?: EngineFactory;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<PoseEngine | null>(null);
  const unsubscribePoseRef = useRef<(() => void) | null>(null);
  const unsubscribeCameraRef = useRef<(() => void) | null>(null);
  const fpsWindowRef = useRef({ startedAt: 0, frames: 0 });
  const [phase, setPhase] = useState<DebugPhase>('idle');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [frame, setFrame] = useState<PoseFrameResult | null>(null);
  const [fps, setFps] = useState(0);
  const [videoSize, setVideoSize] = useState({ width: 1280, height: 720 });
  const [error, setError] = useState<string | null>(null);

  const releaseEngine = useCallback(() => {
    unsubscribePoseRef.current?.();
    unsubscribeCameraRef.current?.();
    unsubscribePoseRef.current = null;
    unsubscribeCameraRef.current = null;
    const engine = engineRef.current;
    engineRef.current = null;
    if (engine) {
      engine.stop();
      engine.dispose();
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  useEffect(() => releaseEngine, [releaseEngine]);

  const handlePose = useCallback((event: PoseUpdatedEvent) => {
    const nextFrame = event.payload.frame;
    setFrame(nextFrame);
    const window = fpsWindowRef.current;
    if (window.startedAt === 0) window.startedAt = nextFrame.timestampMs;
    window.frames += 1;
    const elapsed = nextFrame.timestampMs - window.startedAt;
    if (elapsed >= 500) {
      setFps((window.frames * 1000) / elapsed);
      fpsWindowRef.current = {
        startedAt: nextFrame.timestampMs,
        frames: 0,
      };
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (engineRef.current) return;
    setPhase('starting');
    setError(null);
    setFrame(null);
    setFps(0);
    fpsWindowRef.current = { startedAt: 0, frames: 0 };
    const engine = engineFactory();
    engineRef.current = engine;
    unsubscribeCameraRef.current = engine.subscribeCameraStatus((status) => {
      setCameraStatus(status);
    });
    unsubscribePoseRef.current = engine.subscribe(handlePose);

    try {
      await engine.initialize();
      if (engineRef.current !== engine) return;
      const video = videoRef.current;
      const stream = engine.getMediaStream();
      if (!video || !stream) throw new Error('Camera stream is not available.');
      video.srcObject = stream;
      await video.play();
      await waitForDecodedFrame(video);
      setVideoSize({
        width: video.videoWidth || 1280,
        height: video.videoHeight || 720,
      });
      engine.attachVideo(video);
      engine.start();
      setPhase('running');
    } catch (cause: unknown) {
      if (engineRef.current !== engine) return;
      setError(errorMessage(cause, engine.cameraStatus));
      releaseEngine();
      setPhase('error');
    }
  }, [engineFactory, handlePose, releaseEngine]);

  const pauseInference = useCallback(() => {
    engineRef.current?.stop();
    setPhase('paused');
  }, []);

  const resumeInference = useCallback(() => {
    try {
      engineRef.current?.start();
      setError(null);
      setPhase('running');
    } catch (cause: unknown) {
      setError(errorMessage(cause, cameraStatus));
      setPhase('error');
    }
  }, [cameraStatus]);

  const closeCamera = useCallback(() => {
    releaseEngine();
    setPhase('idle');
    setCameraStatus('idle');
    setFrame(null);
    setFps(0);
    setError(null);
  }, [releaseEngine]);

  const trackingStatus = frame?.trackingStatus ?? 'unavailable';
  const landmarks = frame?.landmarks ?? EMPTY_LANDMARKS;
  const action = frame?.detectedAction ?? null;

  return (
    <div className={styles.workspace}>
      <section className={styles.cameraPanel} aria-label="Live pose camera">
        <div className={styles.videoFrame} data-phase={phase}>
          <video
            ref={videoRef}
            className={styles.video}
            muted
            playsInline
            aria-label="Live mirrored camera preview"
          />
          <SkeletonOverlay
            landmarks={landmarks}
            trackingStatus={trackingStatus}
            mirrored
            sourceWidth={videoSize.width}
            sourceHeight={videoSize.height}
            fit="cover"
            label="Live MediaPipe pose skeleton"
          />
          {phase !== 'running' && phase !== 'paused' && (
            <div className={styles.cameraPlaceholder}>
              <strong>
                {phase === 'starting' ? 'Preparing camera…' : 'Camera is off'}
              </strong>
              <span>
                Stand far enough away for your head, shoulders, arms and hips to
                remain visible.
              </span>
            </div>
          )}
          <span className={styles.liveBadge} data-active={phase === 'running'}>
            {phase === 'running' ? 'LIVE INFERENCE' : phase.toUpperCase()}
          </span>
        </div>

        <div className={styles.controls}>
          {(phase === 'idle' || phase === 'error') && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void startCamera()}
            >
              Enable camera and model
            </button>
          )}
          {phase === 'starting' && (
            <button type="button" disabled className={styles.primaryButton}>
              Loading local MediaPipe assets…
            </button>
          )}
          {phase === 'running' && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={pauseInference}
            >
              Pause inference
            </button>
          )}
          {phase === 'paused' && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={resumeInference}
            >
              Resume inference
            </button>
          )}
          {(phase === 'running' || phase === 'paused') && (
            <button
              type="button"
              className={styles.dangerButton}
              onClick={closeCamera}
            >
              Close camera
            </button>
          )}
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <p className={styles.privacyNote}>
          Frames are processed locally in this browser. This debug page does not
          submit answers or upload camera images.
        </p>
      </section>

      <aside className={styles.metricsPanel} aria-label="Pose debug metrics">
        <p className={styles.eyebrow}>LIVE RESULT</p>
        <div className={styles.result} data-detected={action !== null}>
          <span>{action ?? 'NO ACTION'}</span>
          <strong data-testid="pose-debug-action">
            {action ? ACTION_DEFINITIONS[action].name : 'Waiting for a pose'}
          </strong>
        </div>
        <dl className={styles.metrics}>
          <div>
            <dt>Engine</dt>
            <dd data-testid="pose-debug-phase">{phase}</dd>
          </div>
          <div>
            <dt>Camera</dt>
            <dd data-testid="pose-debug-camera">{cameraStatus}</dd>
          </div>
          <div>
            <dt>Tracking</dt>
            <dd data-testid="pose-debug-tracking">{trackingStatus}</dd>
          </div>
          <div>
            <dt>Rule score</dt>
            <dd data-testid="pose-debug-confidence">
              {frame ? frame.confidence.toFixed(3) : '0.000'}
            </dd>
          </div>
          <div>
            <dt>Landmarks</dt>
            <dd>{landmarks.length}/33</dd>
          </div>
          <div>
            <dt>Event FPS</dt>
            <dd>{fps.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Timestamp</dt>
            <dd>{frame ? `${frame.timestampMs.toFixed(1)} ms` : '—'}</dd>
          </div>
        </dl>
        <p className={styles.scoreNote}>
          Rule score measures geometry match strength; it is not a calibrated
          probability or an accuracy percentage.
        </p>
      </aside>

      <section className={styles.actionSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>ACTION CHECKLIST</p>
            <h2>Test all eight movements</h2>
          </div>
          <p>
            Hold each pose steadily, then return to neutral before trying the
            next one.
          </p>
        </div>
        <div className={styles.actionGrid}>
          {ACTION_IDS.map((actionId) => {
            const definition = ACTION_DEFINITIONS[actionId];
            const detected = action === actionId;
            return (
              <article
                key={actionId}
                className={styles.actionCard}
                data-detected={detected}
              >
                <div>
                  <span>{actionId}</span>
                  <strong>{definition.name}</strong>
                </div>
                <p>{definition.instruction}</p>
                <small>{detected ? 'DETECTED NOW' : 'NOT DETECTED'}</small>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function waitForDecodedFrame(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for the first decoded video frame.'));
    }, 10_000);
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('The browser could not decode the camera stream.'));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('loadeddata', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

function errorMessage(cause: unknown, cameraStatus: CameraStatus): string {
  if (cameraStatus === 'permission-denied') {
    return 'Camera permission was denied. Allow camera access and try again.';
  }
  if (cameraStatus === 'not-found') {
    return 'No camera was found on this device.';
  }
  return cause instanceof Error ? cause.message : 'Pose debug startup failed.';
}
