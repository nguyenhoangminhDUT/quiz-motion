import { describe, expect, it, vi } from 'vitest';
import type { PoseFrameResult, QuizQuestion } from '@action-quiz/contracts';
import { createGameSession } from './game-session';
import type { QuizGateway } from './ports/quiz-gateway';

const question: QuizQuestion = {
  id: 'question-test',
  content: 'Choose an answer',
  options: [
    { id: 'option-one', text: 'One' },
    { id: 'option-two', text: 'Two' },
    { id: 'option-three', text: 'Three' },
    { id: 'option-four', text: 'Four' },
  ],
};

const trackedLandmarks = Array.from({ length: 33 }, (_, index) => ({
  x: index / 32,
  y: 0.5,
  z: 0,
  visibility: 1,
  presence: 1,
}));

describe('createGameSession', () => {
  it('submits the mapped option once after a continuous hold', async () => {
    const submitAnswer = vi.fn<QuizGateway['submitAnswer']>(
      async (request) => ({
        questionId: request.questionId,
        selectedOptionId: request.selectedOptionId,
        submissionId: 'submission-1',
      }),
    );

    const gateway: QuizGateway = {
      loadQuestions: async () => [question],
      submitAnswer,
    };

    const session = createGameSession({
      gateway,
      rng: () => 0,
      now: () => 0,
      createAttemptId: () => 'attempt-1',
      minConfidence: 0.7,
      maxFrameGapMs: 250,
    });

    const generation = session.selectQuestion(question);

    expect(session.getState().status).toBe('READY');

    // Với rng luôn trả 0, option-one được gán ACT_02.
    const frame: PoseFrameResult = {
      timestampMs: 0,
      detectedAction: 'ACT_02',
      confidence: 1,
      trackingStatus: 'tracking',
      landmarks: trackedLandmarks,
    };

    for (let time = 0; time < 1500; time += 250) {
      await session.processFrame({ ...frame, timestampMs: time }, generation);
    }

    expect(submitAnswer).not.toHaveBeenCalled();
    expect(session.getState().status).toBe('HOLDING');

    await session.processFrame({ ...frame, timestampMs: 1500 }, generation);

    expect(submitAnswer).toHaveBeenCalledExactlyOnceWith({
      questionId: 'question-test',
      selectedOptionId: 'option-one',
      attemptId: 'attempt-1',
    });

    expect(session.getState()).toMatchObject({
      status: 'SUBMITTED',
      confirmedOptionId: 'option-one',
      holdProgress: 1,
      error: null,
    });

    await session.processFrame({ ...frame, timestampMs: 1750 }, generation);

    expect(submitAnswer).toHaveBeenCalledTimes(1);
  });
});
// Tạo session độc lập cho từng test.
function setupSession(submitAnswer: QuizGateway['submitAnswer']) {
  const gateway: QuizGateway = {
    loadQuestions: async () => [question],
    submitAnswer,
  };

  const session = createGameSession({
    gateway,
    rng: () => 0,
    now: () => 0,
    createAttemptId: () => 'test-attempt',
    minConfidence: 0.7,
    maxFrameGapMs: 250,
  });

  const generation = session.selectQuestion(question);

  return { session, generation };
}

function trackingFrame(timestampMs: number, confidence = 1): PoseFrameResult {
  return {
    timestampMs,
    detectedAction: 'ACT_02',
    confidence,
    trackingStatus: 'tracking',
    landmarks: trackedLandmarks,
  };
}

// Giữ đến 1250 ms, còn thiếu 250 ms để xác nhận.
async function holdBeforeConfirmation(
  session: ReturnType<typeof createGameSession>,
  generation: number,
) {
  for (let time = 0; time <= 1250; time += 250) {
    await session.processFrame(trackingFrame(time), generation);
  }
}

function successfulSubmit() {
  return vi.fn<QuizGateway['submitAnswer']>(async (request) => ({
    questionId: request.questionId,
    selectedOptionId: request.selectedOptionId,
    submissionId: 'submission-success',
  }));
}

// Cho phép test chủ động quyết định lúc request hoàn thành.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe('game session edge cases', () => {
  it('stores grading from the gateway and clears it when the question changes', async () => {
    const { session, generation } = setupSession(async (request) => ({
      ...request,
      submissionId: 'graded',
      evaluation: { isCorrect: false, correctOptionId: 'option-two' },
    }));
    await holdBeforeConfirmation(session, generation);
    await session.processFrame(trackingFrame(1500), generation);
    expect(session.getState().evaluation).toEqual({
      isCorrect: false,
      correctOptionId: 'option-two',
    });
    session.selectQuestion(question);
    expect(session.getState().evaluation).toBeNull();
  });

  it.each([
    { isCorrect: true, correctOptionId: 'option-two' },
    { isCorrect: false, correctOptionId: 'missing' },
  ])('rejects inconsistent answer evaluation %j', async (evaluation) => {
    const { session, generation } = setupSession(async (request) => ({
      ...request,
      submissionId: 'invalid-grade',
      evaluation,
    }));
    await holdBeforeConfirmation(session, generation);
    await session.processFrame(trackingFrame(1500), generation);
    expect(session.getState()).toMatchObject({
      status: 'ERROR',
      evaluation: null,
    });
  });

  it('keeps the confirmed answer and reports submission failure', async () => {
    const submitAnswer = vi.fn<QuizGateway['submitAnswer']>(async () => {
      throw new Error('Network unavailable');
    });

    const { session, generation } = setupSession(submitAnswer);

    await holdBeforeConfirmation(session, generation);
    await session.processFrame(trackingFrame(1500), generation);

    expect(session.getState()).toMatchObject({
      status: 'ERROR',
      confirmedOptionId: 'option-one',
      holdProgress: 1,
      error: 'Network unavailable',
    });

    // Không tự gửi lại chỉ vì nhận thêm frame.
    await session.processFrame(trackingFrame(1750), generation);

    expect(submitAnswer).toHaveBeenCalledTimes(1);
  });

  it('does not submit again while a request is pending', async () => {
    const pending =
      deferred<Awaited<ReturnType<QuizGateway['submitAnswer']>>>();

    const submitAnswer = vi.fn<QuizGateway['submitAnswer']>(
      () => pending.promise,
    );

    const { session, generation } = setupSession(submitAnswer);

    await holdBeforeConfirmation(session, generation);

    // Không await ngay vì ta cần kiểm tra lúc request đang chờ.
    const processing = session.processFrame(trackingFrame(1500), generation);

    expect(session.getState().status).toBe('SUBMITTING');

    await session.processFrame(trackingFrame(1750), generation);
    await session.processFrame(trackingFrame(2000), generation);

    expect(submitAnswer).toHaveBeenCalledTimes(1);

    pending.resolve({
      questionId: question.id,
      selectedOptionId: 'option-one',
      submissionId: 'submission-delayed',
    });

    await processing;

    expect(session.getState().status).toBe('SUBMITTED');
  });

  it.each(['success', 'failure'] as const)(
    'ignores a late submission %s after changing questions',
    async (outcome) => {
      const pending =
        deferred<Awaited<ReturnType<QuizGateway['submitAnswer']>>>();

      const submitAnswer = vi.fn<QuizGateway['submitAnswer']>(
        () => pending.promise,
      );

      const { session, generation } = setupSession(submitAnswer);

      await holdBeforeConfirmation(session, generation);

      const processing = session.processFrame(trackingFrame(1500), generation);

      const nextQuestion: QuizQuestion = {
        ...question,
        id: 'question-next',
        content: 'Next question',
      };

      session.selectQuestion(nextQuestion);
      const nextState = session.getState();

      if (outcome === 'success') {
        pending.resolve({
          questionId: question.id,
          selectedOptionId: 'option-one',
          submissionId: 'submission-old',
        });
      } else {
        pending.reject(new Error('Old request failed'));
      }

      await processing;

      expect(session.getState()).toEqual(nextState);
      expect(session.getState()).toMatchObject({
        status: 'READY',
        question: { id: 'question-next' },
        candidateOptionId: null,
        confirmedOptionId: null,
        holdProgress: 0,
        error: null,
      });
    },
  );

  it('ignores frames belonging to the previous question generation', async () => {
    const submitAnswer = successfulSubmit();
    const { session, generation } = setupSession(submitAnswer);

    session.selectQuestion({
      ...question,
      id: 'question-next',
    });

    const nextState = session.getState();

    for (let time = 0; time <= 1500; time += 250) {
      await session.processFrame(trackingFrame(time), generation);
    }

    expect(session.getState()).toEqual(nextState);
    expect(submitAnswer).not.toHaveBeenCalled();
  });

  it.each(['low-confidence', 'tracking-lost'] as const)(
    'resets the hold on %s',
    async (reason) => {
      const submitAnswer = successfulSubmit();
      const { session, generation } = setupSession(submitAnswer);

      await holdBeforeConfirmation(session, generation);

      expect(session.getState().holdProgress).toBeGreaterThan(0);

      const interruptedFrame: PoseFrameResult =
        reason === 'low-confidence'
          ? trackingFrame(1500, 0.2)
          : {
              timestampMs: 1500,
              detectedAction: null,
              confidence: 0,
              trackingStatus: 'lost',
              landmarks: [],
            };

      await session.processFrame(interruptedFrame, generation);

      expect(session.getState()).toMatchObject({
        status: 'DETECTING',
        candidateOptionId: null,
        confirmedOptionId: null,
        holdProgress: 0,
      });

      // Khi tracking trở lại phải bắt đầu giữ từ đầu.
      await session.processFrame(trackingFrame(1750), generation);

      expect(session.getState().holdProgress).toBe(0);
      expect(submitAnswer).not.toHaveBeenCalled();

      for (let time = 2000; time <= 3250; time += 250) {
        await session.processFrame(trackingFrame(time), generation);
      }

      expect(submitAnswer).toHaveBeenCalledTimes(1);
      expect(session.getState().status).toBe('SUBMITTED');
    },
  );
});

describe('game session subscriptions', () => {
  it.each(['success', 'failure'] as const)(
    'notifies listeners about progress and async submission %s',
    async (outcome) => {
      const pending =
        deferred<Awaited<ReturnType<QuizGateway['submitAnswer']>>>();
      const submitAnswer = vi.fn<QuizGateway['submitAnswer']>(
        () => pending.promise,
      );
      const { session, generation } = setupSession(submitAnswer);
      const observed: Array<ReturnType<typeof session.getState>> = [];
      const unsubscribe = session.subscribe(() =>
        observed.push(session.getState()),
      );

      expect(observed).toHaveLength(0);
      await holdBeforeConfirmation(session, generation);
      expect(
        observed.some(
          (state) => state.status === 'HOLDING' && state.holdProgress > 0,
        ),
      ).toBe(true);
      const processing = session.processFrame(trackingFrame(1500), generation);
      expect(observed.at(-1)?.status).toBe('SUBMITTING');
      if (outcome === 'success') {
        pending.resolve({
          questionId: question.id,
          selectedOptionId: 'option-one',
          submissionId: 'submission-test',
        });
      } else {
        pending.reject(new Error('Network unavailable'));
      }
      await processing;
      expect(observed.at(-1)?.status).toBe(
        outcome === 'success' ? 'SUBMITTED' : 'ERROR',
      );
      unsubscribe();
    },
  );

  it('notifies independent listeners and supports idempotent unsubscribe', () => {
    const { session } = setupSession(successfulSubmit());
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribe = session.subscribe(first);
    session.subscribe(second);
    session.reset();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    unsubscribe();
    unsubscribe();
    session.selectQuestion(question);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    expect(session.getState().status).toBe('READY');
  });

  it('does not notify for ignored frames', async () => {
    const { session, generation } = setupSession(successfulSubmit());
    const listener = vi.fn();
    session.subscribe(listener);
    await session.processFrame(trackingFrame(0), generation);
    expect(listener).toHaveBeenCalledTimes(1);
    await session.processFrame(trackingFrame(0), generation);
    await session.processFrame(trackingFrame(250), generation - 1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not submit the old answer if a listener changes the question on confirmation', async () => {
    const submitAnswer = successfulSubmit();
    const { session, generation } = setupSession(submitAnswer);
    session.subscribe(() => {
      if (session.getState().confirmedOptionId !== null) {
        session.selectQuestion({ ...question, id: 'next-question' });
      }
    });
    await holdBeforeConfirmation(session, generation);
    await session.processFrame(trackingFrame(1500), generation);
    expect(submitAnswer).not.toHaveBeenCalled();
    expect(session.getState()).toMatchObject({
      status: 'READY',
      question: { id: 'next-question' },
    });
  });
});

describe('game session timeout', () => {
  it('resets silence only after the gap limit and ignores frames older than the timeout', async () => {
    const { session, generation } = setupSession(successfulSubmit());
    await session.processFrame(trackingFrame(0), generation);
    await session.processFrame(trackingFrame(200), generation);
    session.checkTimeout(450);
    expect(session.getState().status).toBe('HOLDING');
    session.checkTimeout(451);
    expect(session.getState()).toMatchObject({
      status: 'DETECTING',
      holdProgress: 0,
      candidateOptionId: null,
    });
    const listener = vi.fn();
    session.subscribe(listener);
    session.checkTimeout(900);
    await session.processFrame(trackingFrame(400), generation);
    expect(listener).not.toHaveBeenCalled();
    await session.processFrame(trackingFrame(950), generation);
    expect(session.getState().holdProgress).toBe(0);
  });

  it('does not reset a pending submission on timeout', async () => {
    const pending =
      deferred<Awaited<ReturnType<QuizGateway['submitAnswer']>>>();
    const { session, generation } = setupSession(() => pending.promise);
    await holdBeforeConfirmation(session, generation);
    const processing = session.processFrame(trackingFrame(1500), generation);
    session.checkTimeout(10000);
    expect(session.getState().status).toBe('SUBMITTING');
    pending.resolve({
      questionId: question.id,
      selectedOptionId: 'option-one',
      submissionId: 'done',
    });
    await processing;
  });
});
