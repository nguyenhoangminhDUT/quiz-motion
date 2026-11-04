'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';
import { useStore } from 'zustand';
import {
  ACTION_IDS,
  ACTION_DEFINITIONS,
  type ActionId,
} from '@action-quiz/contracts';
import { GameplayScreen, SampleSkeletonPreview } from '@/features/experience';
import type { PlaygroundDebug, PlaygroundRuntime } from './create-playground';
import {
  experiencePreviewReducer,
  INITIAL_EXPERIENCE_PREVIEW,
} from './experience-preview';
import { ExperiencePreviewControls } from './experience-preview-controls';
import { usePreviewAudio } from './use-preview-audio';

export function PlaygroundView({ runtime }: { runtime: PlaygroundRuntime }) {
  const state = useStore(runtime.gameStore);
  const [debug, setDebug] = useState<PlaygroundDebug>({
    frame: null,
    event: null,
  });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [preview, dispatchPreview] = useReducer(
    experiencePreviewReducer,
    INITIAL_EXPERIENCE_PREVIEW,
  );
  const audio = usePreviewAudio(preview, state.question?.id);
  const emitAction = useCallback(
    (actionId: ActionId | null) => runtime.emitAction(actionId),
    [runtime],
  );

  useEffect(() => {
    const unsubscribe = runtime.poseEngine.subscribe((event) => {
      const frame = event.payload.frame;
      setDebug({ frame, event });
      const current = runtime.gameStore.getState();
      const optionId =
        frame.detectedAction === null
          ? null
          : (current.question?.options.find(
              (option) =>
                current.actionConfig?.optionMap[option.id] ===
                frame.detectedAction,
            )?.id ?? null);
      dispatchPreview({
        type: 'pose',
        actionId: frame.detectedAction,
        optionId,
      });
    });
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)))
      )
        return;
      if (!/^[1-8]$/.test(event.key)) return;
      const actionId = ACTION_IDS[Number(event.key) - 1];
      if (actionId) {
        event.preventDefault();
        emitAction(actionId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [runtime, emitAction]);

  function changeQuestion() {
    const nextIndex = (questionIndex + 1) % runtime.getQuestionCount();
    const event = runtime.selectQuestion(nextIndex);
    setQuestionIndex(nextIndex);
    setDebug({ frame: null, event });
    dispatchPreview({ type: 'reset' });
    audio.stop();
  }
  const lastAction = debug.frame?.detectedAction;
  return (
    <>
      {state.question && state.actionConfig && (
        <GameplayScreen
          question={state.question}
          actionConfig={state.actionConfig}
          questionNumber={questionIndex + 1}
          questionCount={runtime.getQuestionCount()}
          holdProgress={preview.progress}
          detectedAction={preview.actionId}
          feedback={preview}
          soundEnabled={audio.enabled}
          soundPending={audio.pending}
          soundMessage={audio.message}
          onToggleSound={() => {
            void audio.toggle();
          }}
          cameraPreview={
            <SampleSkeletonPreview
              actionId={preview.actionId}
              trackingStatus={preview.trackingStatus}
              camera={preview.camera}
            />
          }
          onNextQuestion={changeQuestion}
        />
      )}
      <ExperiencePreviewControls
        preview={preview}
        soundEnabled={audio.enabled}
        onCamera={(camera) => {
          audio.stop();
          dispatchPreview({ type: 'camera', camera });
        }}
        onTracking={(trackingStatus) => {
          audio.stop();
          dispatchPreview({ type: 'tracking', trackingStatus });
        }}
        onStatus={(status) => dispatchPreview({ type: 'status', status })}
        onProgress={(progress) =>
          dispatchPreview({ type: 'progress', progress })
        }
        onReset={() => {
          audio.stop();
          dispatchPreview({ type: 'reset' });
          setDebug({ frame: null, event: null });
        }}
        onTestSound={audio.test}
      />
      <div className="playground-grid" aria-label="Development controls">
        <section className="panel">
          <div className="section-heading">
            <h3>Simulate an action</h3>
            <span className="muted">Keys 1-8</span>
          </div>
          <div className="simulation-grid">
            {ACTION_IDS.map((id, index) => (
              <button
                type="button"
                className="simulation-button"
                aria-label={
                  String(index + 1) + ' ' + ACTION_DEFINITIONS[id].name
                }
                aria-pressed={preview.actionId === id}
                key={id}
                onClick={() => emitAction(id)}
              >
                <kbd>{index + 1}</kbd>
                <span>{ACTION_DEFINITIONS[id].name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-button mt-4"
            onClick={() => emitAction(null)}
          >
            Simulate tracking loss
          </button>
        </section>
        <section className="debug-panel" aria-label="Event inspector">
          <div className="section-heading">
            <h3>Event inspector</h3>
            <span className="badge">LIVE MOCK DATA</span>
          </div>
          <dl className="debug-list">
            <div>
              <dt>Last detected action</dt>
              <dd data-testid="last-action">
                {lastAction
                  ? lastAction + ' / ' + ACTION_DEFINITIONS[lastAction].name
                  : 'None'}
              </dd>
            </div>
            <div>
              <dt>Last received event</dt>
              <dd>{debug.event?.type ?? 'Waiting for input'}</dd>
            </div>
            <div>
              <dt>Tracking</dt>
              <dd>{debug.frame?.trackingStatus ?? 'unavailable'}</dd>
            </div>
            <div>
              <dt>Game state</dt>
              <dd>{state.status}</dd>
            </div>
            <div>
              <dt>Experience preview state</dt>
              <dd>{preview.status}</dd>
            </div>
            <div>
              <dt>Actual game progress</dt>
              <dd>{Math.round(state.holdProgress * 100)}%</dd>
            </div>
            <div>
              <dt>Timestamp (monotonic ms)</dt>
              <dd>{debug.frame?.timestampMs.toFixed(1) ?? '-'}</dd>
            </div>
          </dl>
          <details>
            <summary>Inspect event payload</summary>
            <pre>{JSON.stringify(debug.event, null, 2)}</pre>
          </details>
        </section>
      </div>
      <p className="notice mt-5">
        Development only. Detection updates this inspector; answers are never
        confirmed or submitted by the game. Experience controls simulate visual
        feedback only; they do not call a gateway or change game rules. Skeleton
        samples are drawn locally. Real webcam, classifiers, continuous hold
        detection and API submission remain future integration work.
      </p>
    </>
  );
}
