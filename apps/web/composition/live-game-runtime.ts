import { type ActionId, type QuizQuestion } from '@action-quiz/contracts';
import {
  createGameSession,
  createLoadQuestions,
  type QuizGateway,
} from '@/features/game';
import { MockQuizGateway } from '@/features/game/infrastructure/mock/mock-quiz-gateway';

/** Manual frames drive real game rules; submissions remain in memory. */
export function createLiveGameRuntime(
  now: () => number,
  gateway: QuizGateway = new MockQuizGateway(),
  rng: () => number = Math.random,
) {
  let attempt = 0;
  const session = createGameSession({
    gateway,
    now,
    rng,
    createAttemptId: () => `mock-attempt-${++attempt}`,
    minConfidence: 0.7,
    maxFrameGapMs: 250,
  });
  let questions: readonly QuizQuestion[] = [];
  let generation = 0;
  let index = 0;
  let action: ActionId | null = null;
  let paused = false;
  let disposed = false;

  function emit() {
    if (disposed || !questions.length) return;
    void session.processFrame(
      {
        timestampMs: now(),
        detectedAction: action,
        confidence: action ? 1 : 0,
        trackingStatus: action ? 'tracking' : 'lost',
        landmarks: [],
      },
      generation,
    );
  }
  function select(next: number) {
    const question = questions[next];
    if (disposed || !question) return;
    action = null;
    paused = false;
    index = next;
    generation = session.selectQuestion(question);
  }
  return {
    session,
    async initialize() {
      const loaded = await createLoadQuestions(gateway)();
      if (disposed) return;
      questions = loaded;
      select(0);
    },
    getQuestionNumber: () => index + 1,
    getQuestionCount: () => questions.length,
    getAction: () => action,
    setAction(next: ActionId | null) {
      action = next;
      paused = false;
      emit();
    },
    pauseFrames() {
      paused = true;
    },
    tick() {
      if (disposed) return;
      // Check before emitting: a stalled producer must not bridge a long gap.
      session.checkTimeout(now());
      if (action && !paused) emit();
    },
    nextQuestion() {
      select((index + 1) % questions.length);
    },
    restartQuestion() {
      select(index);
    },
    dispose() {
      disposed = true;
      action = null;
      session.reset();
    },
  };
}
export type LiveGameRuntime = ReturnType<typeof createLiveGameRuntime>;
