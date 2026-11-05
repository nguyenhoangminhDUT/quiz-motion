'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  ACTION_IDS,
  ACTION_DEFINITIONS,
  type GameStatus,
} from '@action-quiz/contracts';
import {
  GameplayScreen,
  SampleSkeletonPreview,
  type FeedbackStatus,
} from '@/features/experience';
import {
  createLiveGameRuntime,
  type LiveGameRuntime,
} from './live-game-runtime';
import { usePreviewAudio } from './use-preview-audio';

const feedbackStatuses: Record<GameStatus, FeedbackStatus> = {
  IDLE: 'ready',
  READY: 'ready',
  DETECTING: 'detecting',
  HOLDING: 'holding',
  SUBMITTING: 'submitting',
  SUBMITTED: 'submitted',
  ERROR: 'error',
};

export function LiveGamePanel() {
  const [runtime, setRuntime] = useState<LiveGameRuntime | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const instance = createLiveGameRuntime(() => performance.now());
    let active = true;
    void instance
      .initialize()
      .then(() => {
        if (active) setRuntime(instance);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : 'Initialization failed',
          );
      });
    return () => {
      active = false;
      instance.dispose();
    };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!runtime) return <p role="status">Preparing game session...</p>;
  return <LiveGameView runtime={runtime} />;
}

export function LiveGameView({ runtime }: { runtime: LiveGameRuntime }) {
  const state = useSyncExternalStore(
    runtime.session.subscribe,
    runtime.session.getState,
    runtime.session.getState,
  );
  const feedback = {
    status: feedbackStatuses[state.status],
    candidateOptionId: state.candidateOptionId,
    confirmedOptionId: state.confirmedOptionId,
    error: state.error,
  };
  const audio = usePreviewAudio(feedback, state.question?.id);
  useEffect(() => {
    const interval = window.setInterval(() => runtime.tick(), 50);
    const release = () => runtime.setAction(null);
    const keydown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)))
      )
        return;
      const action = /^[1-8]$/.test(event.key)
        ? ACTION_IDS[Number(event.key) - 1]
        : undefined;
      if (action) {
        event.preventDefault();
        runtime.setAction(action);
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (
        /^[1-8]$/.test(event.key) &&
        runtime.getAction() === ACTION_IDS[Number(event.key) - 1]
      )
        release();
    };
    const visibility = () => {
      if (document.hidden) release();
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', visibility);
      release();
    };
  }, [runtime]);
  if (!state.question || !state.actionConfig) return null;
  const action = state.candidateOptionId
    ? (state.actionConfig.optionMap[state.candidateOptionId] ?? null)
    : null;
  return (
    <>
      <p className="notice">
        Game session: hold a mapped key 1–8 or an action button for 1.5 seconds.
        Answers are submitted to an in-memory mock; no scoring or real camera.
      </p>
      <GameplayScreen
        question={state.question}
        actionConfig={state.actionConfig}
        questionNumber={runtime.getQuestionNumber()}
        questionCount={runtime.getQuestionCount()}
        holdProgress={state.holdProgress}
        detectedAction={action}
        feedback={feedback}
        soundEnabled={audio.enabled}
        soundPending={audio.pending}
        soundMessage={audio.message}
        onToggleSound={() => {
          void audio.toggle();
        }}
        cameraPreview={
          <SampleSkeletonPreview
            actionId={action}
            trackingStatus={action ? 'tracking' : 'lost'}
            camera="sample"
          />
        }
        onNextQuestion={() => {
          audio.stop();
          runtime.nextQuestion();
        }}
      />
      <section className="panel" aria-label="Game session controls">
        <p>
          Game state:{' '}
          <strong data-testid="live-game-status">{state.status}</strong>
        </p>
        <div className="simulation-grid">
          {ACTION_IDS.map((id, i) => (
            <button
              type="button"
              key={id}
              className="simulation-button"
              aria-label={`Hold ${i + 1} ${ACTION_DEFINITIONS[id].name}`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                runtime.setAction(id);
              }}
              onPointerUp={() => runtime.setAction(null)}
              onPointerCancel={() => runtime.setAction(null)}
              onLostPointerCapture={() => runtime.setAction(null)}
              onBlur={() => runtime.setAction(null)}
              onKeyDown={(event) => {
                if (!event.repeat && [' ', 'Enter'].includes(event.key)) {
                  event.preventDefault();
                  runtime.setAction(id);
                }
              }}
              onKeyUp={(event) => {
                if ([' ', 'Enter'].includes(event.key)) {
                  event.preventDefault();
                  runtime.setAction(null);
                }
              }}
            >
              {i + 1} · {ACTION_DEFINITIONS[id].name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => runtime.setAction(null)}
        >
          Lose tracking
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => runtime.pauseFrames()}
        >
          Pause frame stream
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            audio.stop();
            runtime.restartQuestion();
          }}
        >
          Restart question
        </button>
      </section>
    </>
  );
}
