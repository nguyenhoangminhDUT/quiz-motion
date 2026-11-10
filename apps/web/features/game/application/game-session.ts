import {
  poseFrameSchema,
  answerEvaluationSchema,
  type GameState,
  type PoseFrameResult,
  type QuizQuestion,
} from '@action-quiz/contracts';
import { createRandomQuestionConfig } from '../domain/action-randomizer';
import { createHoldDetector } from '../domain/hold-detector';
import type { QuizGateway } from './ports/quiz-gateway';

interface GameSessionOptions {
  readonly gateway: QuizGateway;
  readonly rng: () => number;
  readonly now: () => number;
  readonly createAttemptId: () => string;
  readonly minConfidence: number;
  readonly maxFrameGapMs: number;
}

function initialState(): GameState {
  return {
    status: 'IDLE',
    question: null,
    actionConfig: null,
    candidateOptionId: null,
    confirmedOptionId: null,
    holdProgress: 0,
    error: null,
    evaluation: null,
  };
}

export function createGameSession(options: GameSessionOptions) {
  const { gateway, rng, now, createAttemptId, minConfidence, maxFrameGapMs } =
    options;

  if (
    !Number.isFinite(minConfidence) ||
    minConfidence < 0 ||
    minConfidence > 1
  ) {
    throw new Error('Confidence threshold must be in [0, 1].');
  }

  const holdDetector = createHoldDetector({ maxFrameGapMs });

  let state = initialState();
  let generation = 0;
  let questionStartedAtMs = 0;
  let lastFrameTimestampMs: number | null = null;
  let attemptId = '';
  const listeners = new Set<() => void>();

  /** Subscribe to future state changes; read the current snapshot with getState. */
  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function publish(nextState: GameState): void {
    state = nextState;
    for (const listener of [...listeners]) {
      listener();
    }
  }

  function getState(): GameState {
    return state;
  }

  function selectQuestion(question: QuizQuestion): number {
    const config = createRandomQuestionConfig(question, rng);
    const startedAt = now();
    const nextAttemptId = createAttemptId();

    if (!Number.isFinite(startedAt) || startedAt < 0) {
      throw new Error('Session clock must be finite and nonnegative.');
    }

    if (nextAttemptId.trim().length === 0) {
      throw new Error('Attempt ID must not be blank.');
    }

    generation += 1;
    questionStartedAtMs = startedAt;
    lastFrameTimestampMs = null;
    attemptId = nextAttemptId;
    holdDetector.reset();

    publish({
      ...initialState(),
      status: 'READY',
      question,
      actionConfig: config,
    });

    // Tầng điều phối gắn token này vào công việc xử lý frame.
    return generation;
  }

  async function processFrame(
    input: PoseFrameResult,
    frameGeneration: number,
  ): Promise<void> {
    if (
      frameGeneration !== generation ||
      state.question === null ||
      state.actionConfig === null ||
      state.status === 'SUBMITTING' ||
      state.status === 'SUBMITTED' ||
      state.status === 'ERROR'
    ) {
      return;
    }

    const frame = poseFrameSchema.parse(input);

    if (
      frame.timestampMs < questionStartedAtMs ||
      (lastFrameTimestampMs !== null &&
        frame.timestampMs <= lastFrameTimestampMs)
    ) {
      return;
    }

    lastFrameTimestampMs = frame.timestampMs;

    const validAction =
      frame.trackingStatus === 'tracking' && frame.confidence >= minConfidence
        ? frame.detectedAction
        : null;

    const optionId =
      validAction === null
        ? null
        : (state.question.options.find(
            (option) =>
              state.actionConfig?.optionMap[option.id] === validAction,
          )?.id ?? null);

    const hold = holdDetector.update(optionId, frame.timestampMs);

    publish({
      ...state,
      status: hold.candidateOptionId === null ? 'DETECTING' : 'HOLDING',
      candidateOptionId: hold.candidateOptionId,
      confirmedOptionId: hold.confirmedOptionId,
      holdProgress: hold.holdProgress,
      error: null,
    });

    if (
      frameGeneration !== generation ||
      !hold.justConfirmed ||
      hold.confirmedOptionId === null
    ) {
      return;
    }

    const questionId = state.question?.id;

    if (questionId === undefined) {
      return;
    }

    const request = {
      questionId,
      selectedOptionId: hold.confirmedOptionId,
      attemptId,
    };

    const submissionGeneration = generation;

    // Khóa trước await để frame tiếp theo không submit lần nữa.
    publish({ ...state, status: 'SUBMITTING' });
    if (submissionGeneration !== generation) return;

    try {
      const result = await gateway.submitAnswer(request);

      // Người chơi có thể đã chuyển câu hỏi trong lúc chờ API.
      if (submissionGeneration !== generation) {
        return;
      }

      if (
        result.questionId !== request.questionId ||
        result.selectedOptionId !== request.selectedOptionId ||
        typeof result.submissionId !== 'string' ||
        result.submissionId.trim().length === 0
      ) {
        throw new Error('Submission response does not match the answer.');
      }

      const evaluation =
        result.evaluation === undefined
          ? null
          : answerEvaluationSchema.parse(result.evaluation);
      if (
        evaluation &&
        (!state.question?.options.some(
          (option) => option.id === evaluation.correctOptionId,
        ) ||
          evaluation.isCorrect !==
            (request.selectedOptionId === evaluation.correctOptionId))
      ) {
        throw new Error(
          'Submission evaluation does not match the question or answer.',
        );
      }
      publish({ ...state, status: 'SUBMITTED', error: null, evaluation });
    } catch (error: unknown) {
      if (submissionGeneration !== generation) {
        return;
      }

      publish({
        ...state,
        status: 'ERROR',
        error:
          error instanceof Error
            ? error.message
            : 'Could not submit the answer.',
      });
    }
  }

  /** Called by an external scheduler using the same monotonic session clock. */
  function checkTimeout(timestampMs: number = now()): void {
    if (!Number.isFinite(timestampMs) || timestampMs < 0) {
      throw new Error('Timestamp must be finite and nonnegative.');
    }
    if (
      state.status !== 'HOLDING' ||
      lastFrameTimestampMs === null ||
      timestampMs - lastFrameTimestampMs <= maxFrameGapMs
    )
      return;
    holdDetector.update(null, timestampMs);
    lastFrameTimestampMs = timestampMs;
    publish({
      ...state,
      status: 'DETECTING',
      candidateOptionId: null,
      confirmedOptionId: null,
      holdProgress: 0,
    });
  }

  function reset(): void {
    generation += 1;
    holdDetector.reset();
    lastFrameTimestampMs = null;
    attemptId = '';
    publish(initialState());
  }

  return {
    getState,
    subscribe,
    selectQuestion,
    processFrame,
    checkTimeout,
    reset,
  };
}
