import type {
  CameraStatus,
  PoseFrameResult,
  QuizQuestion,
} from '@action-quiz/contracts';
import {
  createGameSession,
  createLoadQuestions,
  type QuizGateway,
} from '@/features/game';
import { MockQuizGateway } from '@/features/game/infrastructure/mock/mock-quiz-gateway';
import { createBrowserPoseEngine, type PoseEngine } from '@/features/pose';

type CameraPhase = 'idle' | 'starting' | 'running' | 'error';

interface CameraGameSnapshot {
  readonly phase: CameraPhase;
  readonly cameraStatus: CameraStatus;
  readonly frame: PoseFrameResult | null;
  readonly error: string | null;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly questionNumber: number;
  readonly questionCount: number;
  readonly nextQuestionInSeconds: number | null;
}

/** Real pose input and in-memory quiz data, scoped to one mounted game. */
export function createCameraGameRuntime({
  now = () => performance.now(),
  engineFactory = () => createBrowserPoseEngine({ now }),
  gateway = new MockQuizGateway(),
  rng = Math.random,
}: {
  now?: () => number;
  engineFactory?: () => PoseEngine;
  gateway?: QuizGateway;
  rng?: () => number;
} = {}) {
  let attempt = 0;
  const session = createGameSession({
    gateway,
    now,
    rng,
    createAttemptId: () => `camera-mock-attempt-${++attempt}`,
    minConfidence: 0.7,
    maxFrameGapMs: 250,
  });
  let snapshot: CameraGameSnapshot = {
    phase: 'idle',
    cameraStatus: 'idle',
    frame: null,
    error: null,
    sourceWidth: 1280,
    sourceHeight: 720,
    questionNumber: 0,
    questionCount: 0,
    nextQuestionInSeconds: null,
  };
  const listeners = new Set<() => void>();
  let questions: readonly QuizQuestion[] = [];
  let generation = 0;
  let disposed = false;
  let engine: PoseEngine | null = null;
  let video: HTMLVideoElement | null = null;
  let startup: AbortController | null = null;
  let unsubscribePose: (() => void) | null = null;
  let unsubscribeCamera: (() => void) | null = null;
  let nextQuestionAtMs: number | null = null;
  const unsubscribeSession = session.subscribe(() => {
    if (disposed) return;
    const state = session.getState();
    if (
      state.status === 'SUBMITTED' &&
      state.evaluation &&
      nextQuestionAtMs === null
    ) {
      nextQuestionAtMs = now() + 3000;
      publish({ nextQuestionInSeconds: 3 });
    }
  });

  function publish(update: Partial<CameraGameSnapshot>) {
    if (disposed) return;
    snapshot = { ...snapshot, ...update };
    for (const listener of [...listeners]) listener();
  }

  function releaseEngine() {
    startup?.abort();
    startup = null;
    unsubscribePose?.();
    unsubscribeCamera?.();
    unsubscribePose = unsubscribeCamera = null;
    const previous = engine;
    engine = null;
    previous?.dispose();
    if (video) {
      video.pause();
      video.srcObject = null;
      video = null;
    }
  }

  function clearHold() {
    void session.processFrame(
      {
        timestampMs: now(),
        detectedAction: null,
        confidence: 0,
        trackingStatus: 'unavailable',
        landmarks: [],
      },
      generation,
    );
  }

  function fail(cause: unknown, status: CameraStatus) {
    clearHold();
    releaseEngine();
    publish({
      phase: 'error',
      cameraStatus: status,
      frame: null,
      error: cameraError(cause, status),
    });
  }

  function selectQuestion(index: number) {
    const question = questions[index];
    if (disposed || !question) return;
    nextQuestionAtMs = null;
    generation = session.selectQuestion(question);
    publish({
      questionNumber: index + 1,
      frame: null,
      nextQuestionInSeconds: null,
    });
  }

  return {
    session,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async initialize() {
      const loaded = await createLoadQuestions(gateway)();
      if (disposed) return;
      questions = loaded;
      publish({ questionCount: questions.length });
      selectQuestion(0);
    },
    async startCamera(element: HTMLVideoElement) {
      if (
        disposed ||
        !questions.length ||
        snapshot.phase === 'starting' ||
        snapshot.phase === 'running'
      )
        return;
      releaseEngine();
      publish({
        phase: 'starting',
        cameraStatus: 'initializing',
        error: null,
        frame: null,
      });
      const controller = new AbortController();
      startup = controller;
      video = element;
      let current: PoseEngine | null = null;
      try {
        current = engineFactory();
        engine = current;
        const activeEngine = current;
        unsubscribeCamera = current.subscribeCameraStatus((status) => {
          if (engine !== activeEngine || disposed) return;
          publish({ cameraStatus: status });
          if (snapshot.phase === 'running' && status !== 'ready') {
            // Let the engine finish publishing its unavailable frame before disposal.
            clearHold();
            publish({
              phase: 'error',
              frame: null,
              error: cameraError(null, status),
            });
            queueMicrotask(() => {
              if (engine === activeEngine) releaseEngine();
            });
          }
        });
        unsubscribePose = current.subscribe((event) => {
          if (
            disposed ||
            engine !== activeEngine ||
            snapshot.phase !== 'running'
          )
            return;
          const token = generation;
          const frame = event.payload.frame;
          publish({ frame });
          void session.processFrame(frame, token).catch((cause: unknown) => {
            if (!disposed && engine === activeEngine && token === generation)
              fail(cause, 'error');
          });
        });
        await current.initialize();
        if (disposed || engine !== current) return;
        const stream = current.getMediaStream();
        if (!stream) throw new Error('Camera stream is unavailable.');
        element.srcObject = stream;
        await element.play();
        if (disposed || engine !== current) return;
        await waitForDecodedFrame(element, controller.signal);
        if (disposed || engine !== current) return;
        current.attachVideo(element);
        publish({
          phase: 'running',
          sourceWidth: element.videoWidth || 1280,
          sourceHeight: element.videoHeight || 720,
        });
        current.start();
      } catch (cause: unknown) {
        if (disposed || controller.signal.aborted || engine !== current) return;
        const status = current?.cameraStatus ?? 'error';
        fail(cause, status === 'ready' || status === 'idle' ? 'error' : status);
      }
    },
    closeCamera() {
      if (disposed) return;
      clearHold();
      releaseEngine();
      publish({
        phase: 'idle',
        cameraStatus: 'stopped',
        frame: null,
        error: null,
      });
    },
    tick() {
      if (disposed) return;
      const time = now();
      session.checkTimeout(time);
      if (nextQuestionAtMs !== null) {
        const remaining = Math.max(
          0,
          Math.ceil((nextQuestionAtMs - time) / 1000),
        );
        if (remaining === 0)
          selectQuestion(snapshot.questionNumber % questions.length);
        else if (snapshot.nextQuestionInSeconds !== remaining)
          publish({ nextQuestionInSeconds: remaining });
      }
    },
    nextQuestion() {
      selectQuestion(snapshot.questionNumber % questions.length);
    },
    restartQuestion() {
      selectQuestion(snapshot.questionNumber - 1);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      nextQuestionAtMs = null;
      unsubscribeSession();
      releaseEngine();
      session.reset();
      listeners.clear();
    },
  };
}

export type CameraGameRuntime = ReturnType<typeof createCameraGameRuntime>;

function cameraError(cause: unknown, status: CameraStatus): string {
  if (status === 'permission-denied')
    return 'Camera access is blocked. Allow camera access in your browser, then try again.';
  if (status === 'not-found')
    return 'No camera found. Connect a camera, then try again.';
  if (status === 'stopped')
    return 'The camera disconnected. Check your camera, then try again.';
  return cause instanceof Error
    ? cause.message
    : 'Camera or pose detection stopped. Try starting the camera again.';
}

function waitForDecodedFrame(
  video: HTMLVideoElement,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted)
    return Promise.reject(new Error('Camera startup cancelled.'));
  if (video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error', onError);
      signal.removeEventListener('abort', onAbort);
    };
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('The browser could not decode the camera stream.'));
    };
    const onAbort = () => {
      cleanup();
      reject(new Error('Camera startup cancelled.'));
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for the camera. Try again.'));
    }, 10_000);
    video.addEventListener('loadeddata', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
