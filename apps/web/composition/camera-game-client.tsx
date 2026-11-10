'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ACTION_DEFINITIONS, type GameStatus } from '@action-quiz/contracts';
import {
  GameplayScreen,
  SkeletonOverlay,
  type FeedbackStatus,
} from '@/features/experience';
import {
  createCameraGameRuntime,
  type CameraGameRuntime,
} from './camera-game-runtime';
import { usePreviewAudio } from './use-preview-audio';
import styles from './camera-game.module.css';

const feedbackStatuses: Record<GameStatus, FeedbackStatus> = {
  IDLE: 'ready',
  READY: 'ready',
  DETECTING: 'detecting',
  HOLDING: 'holding',
  SUBMITTING: 'submitting',
  SUBMITTED: 'submitted',
  ERROR: 'error',
};
const EMPTY_LANDMARKS = Object.freeze([]);

export function CameraGameClient() {
  const [runtime, setRuntime] = useState<CameraGameRuntime | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const instance = createCameraGameRuntime();
    let active = true;
    void instance
      .initialize()
      .then(() => {
        if (active) setRuntime(instance);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Could not load questions.',
          );
      });
    return () => {
      active = false;
      instance.dispose();
    };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!runtime) return <p role="status">Preparing your questions…</p>;
  return <CameraGameView runtime={runtime} />;
}

export function CameraGameView({
  runtime,
}: {
  readonly runtime: CameraGameRuntime;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const state = useSyncExternalStore(
    runtime.session.subscribe,
    runtime.session.getState,
    runtime.session.getState,
  );
  const camera = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );
  const feedback = {
    status:
      state.status === 'DETECTING' &&
      camera.frame?.trackingStatus !== 'tracking'
        ? ('ready' as const)
        : feedbackStatuses[state.status],
    candidateOptionId: state.candidateOptionId,
    confirmedOptionId: state.confirmedOptionId,
    error: state.error,
  };
  const audio = usePreviewAudio(feedback, state.question?.id);

  useEffect(() => {
    const timer = window.setInterval(() => runtime.tick(), 50);
    const onVisibility = () => {
      if (document.hidden) runtime.closeCamera();
    };
    const onPageHide = () => runtime.closeCamera();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [runtime]);

  if (!state.question || !state.actionConfig) return null;
  const running = camera.phase === 'running';
  const action = camera.frame?.detectedAction ?? null;
  const tracking = camera.frame?.trackingStatus ?? 'unavailable';
  const cameraLabel =
    camera.phase === 'starting'
      ? 'Starting camera…'
      : running
        ? tracking === 'tracking'
          ? 'Camera live · Body detected'
          : 'Camera live · Looking for you'
        : camera.phase === 'error'
          ? 'Camera needs attention'
          : 'Camera off';

  return (
    <>
      <GameplayScreen
        mode="camera"
        cameraLabel={cameraLabel}
        question={state.question}
        actionConfig={state.actionConfig}
        questionNumber={camera.questionNumber}
        questionCount={camera.questionCount}
        holdProgress={state.holdProgress}
        detectedAction={action}
        feedback={feedback}
        evaluation={state.evaluation}
        nextQuestionInSeconds={camera.nextQuestionInSeconds}
        soundEnabled={audio.enabled}
        soundPending={audio.pending}
        soundMessage={audio.message}
        onToggleSound={() => {
          void audio.toggle();
        }}
        onNextQuestion={() => {
          audio.stop();
          runtime.nextQuestion();
        }}
        cameraPreview={
          <div>
            <section className={styles.viewport} aria-label="Live game camera">
              <video
                ref={videoRef}
                className={styles.video}
                muted
                playsInline
                aria-label="Live mirrored camera preview"
              />
              <SkeletonOverlay
                landmarks={camera.frame?.landmarks ?? EMPTY_LANDMARKS}
                trackingStatus={tracking}
                mirrored
                sourceWidth={camera.sourceWidth}
                sourceHeight={camera.sourceHeight}
                fit="cover"
              />
              {!running && (
                <div className={styles.placeholder}>
                  <strong>
                    {camera.phase === 'starting'
                      ? 'Preparing your camera…'
                      : 'Move to answer'}
                  </strong>
                  <p>
                    {camera.phase === 'starting'
                      ? 'Allow camera access when your browser asks.'
                      : 'Enable your camera, then match the pose beside your answer.'}
                  </p>
                </div>
              )}
              <span className={styles.badge}>
                {running ? 'LIVE CAMERA' : 'CAMERA OFF'}
              </span>
            </section>
            <div className={styles.controls}>
              {running || camera.phase === 'starting' ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => runtime.closeCamera()}
                >
                  {running ? 'Close camera' : 'Cancel camera setup'}
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    if (videoRef.current)
                      void runtime.startCamera(videoRef.current);
                  }}
                >
                  {camera.phase === 'error'
                    ? 'Try camera again'
                    : 'Enable camera'}
                </button>
              )}
            </div>
            {camera.error && (
              <p role="alert" className={styles.error}>
                {camera.error}
              </p>
            )}
            <p role="status" className={styles.status}>
              {cameraLabel}.{' '}
              {running &&
                (tracking !== 'tracking'
                  ? 'Keep your head, hands and hips in the frame.'
                  : action
                    ? `Detected: ${ACTION_DEFINITIONS[action].name}.`
                    : 'Match one of the poses shown beside the answers.')}
            </p>
          </div>
        }
      />
      {state.status === 'ERROR' && (
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            audio.stop();
            runtime.restartQuestion();
          }}
        >
          Retry question
        </button>
      )}
    </>
  );
}
