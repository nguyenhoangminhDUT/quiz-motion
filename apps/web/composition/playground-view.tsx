'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import {
  ACTION_IDS,
  ACTION_DEFINITIONS,
  type ActionId,
} from '@action-quiz/contracts';
import {
  ActionInstruction,
  CameraViewport,
  HoldProgress,
  SkeletonOverlay,
} from '@/features/experience';
import type { PlaygroundDebug, PlaygroundRuntime } from './create-playground';

export function PlaygroundView({ runtime }: { runtime: PlaygroundRuntime }) {
  const state = useStore(runtime.gameStore);
  const [debug, setDebug] = useState<PlaygroundDebug>({
    frame: null,
    event: null,
  });
  const [questionIndex, setQuestionIndex] = useState(0);
  const emitAction = useCallback(
    (actionId: ActionId | null) => runtime.emitAction(actionId),
    [runtime],
  );

  useEffect(() => {
    const unsubscribe = runtime.poseEngine.subscribe((event) =>
      setDebug({ frame: event.payload.frame, event }),
    );
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
  }
  const lastAction = debug.frame?.detectedAction;
  return (
    <div className="playground-grid">
      <div className="space-y-5">
        <div className="section-heading">
          <h2>Pose input</h2>
          <span className="badge">
            <span className="status-dot" /> MOCK /{' '}
            {runtime.poseEngine.status.toUpperCase()}
          </span>
        </div>
        <CameraViewport
          overlay={<SkeletonOverlay landmarks={debug.frame?.landmarks ?? []} />}
        />
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
                aria-pressed={lastAction === id}
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
          <dl className="debug-list" aria-live="polite">
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
      <div className="space-y-5">
        <div className="section-heading">
          <h2>Question preview</h2>
          <span className="muted">
            Fixture {questionIndex + 1} / {runtime.getQuestionCount()}
          </span>
        </div>
        <section className="panel question-panel">
          <span className="eyebrow">MOCK QUIZ / {state.question?.id}</span>
          <h3>{state.question?.content}</h3>
          <p className="muted">
            Four options. Four distinct actions. Fixed fixture mapping.
          </p>
          <div className="options">
            {state.question?.options.map((option, index) => {
              const actionId = state.actionConfig?.optionMap[option.id];
              return (
                <article
                  className="option"
                  key={option.id}
                  data-detected={actionId === lastAction}
                >
                  <div className="row">
                    <span className="option-number">0{index + 1}</span>
                    <strong>{option.text}</strong>
                  </div>
                  {actionId && <ActionInstruction actionId={actionId} />}
                  <code>{option.id}</code>
                </article>
              );
            })}
          </div>
          <button
            type="button"
            className="secondary-button w-full"
            onClick={changeQuestion}
          >
            Load next mock question &rarr;
          </button>
        </section>
        <section className="panel">
          <HoldProgress progress={state.holdProgress} />
        </section>
        <p className="notice">
          Development only. Detection updates this inspector; answers are never
          confirmed or submitted. Webcam, classifiers, Canvas effects and hold
          detection are TODO.
        </p>
      </div>
    </div>
  );
}
