import {
  ACTION_IDS,
  type ActionId,
  type GameEvent,
  type PoseFrameResult,
  type QuestionActionConfig,
  type QuizQuestion,
} from '@action-quiz/contracts';
import {
  createLoadQuestions,
  createGameStore,
  setReadyQuestion,
  validateQuestionConfig,
} from '@/features/game';
import { MockQuizGateway } from '@/features/game/infrastructure/mock/mock-quiz-gateway';
import { MockPoseEngine } from '@/features/pose/infrastructure/mock/mock-pose-engine';
import { readProviders } from '@/shared/config/env';

/** Per mounted playground, never a module-scope singleton. */
export function createPlayground(now: () => number) {
  readProviders({
    poseProvider: process.env.NEXT_PUBLIC_POSE_PROVIDER,
    quizProvider: process.env.NEXT_PUBLIC_QUIZ_PROVIDER,
  });
  const poseEngine = new MockPoseEngine(now);
  const gateway = new MockQuizGateway();
  const loadQuestions = createLoadQuestions(gateway);
  const gameStore = createGameStore();
  let questions: readonly QuizQuestion[] = [];
  const configs = new Map<string, QuestionActionConfig>();
  let disposed = false;

  function selectQuestion(index: number): GameEvent {
    if (disposed) throw new Error('Playground has been disposed.');
    const question = questions[index];
    if (!question) throw new Error('Question not found.');
    const previousQuestionId = gameStore.getState().question?.id ?? null;
    let config = configs.get(question.id);
    if (!config) {
      // Deliberately fixed fixture mapping. Production randomization is Phase 3.
      const optionMap: Record<string, ActionId> = Object.create(null);
      question.options.forEach((option, i) => {
        const actionId = ACTION_IDS[i];
        if (actionId) optionMap[option.id] = actionId;
      });
      config = { questionId: question.id, optionMap };
      validateQuestionConfig(question, config);
      configs.set(question.id, config);
    }
    setReadyQuestion(gameStore, question, config);
    return {
      type: 'QUESTION_CHANGED',
      timestampMs: now(),
      payload: { previousQuestionId, questionId: question.id },
    };
  }

  return {
    poseEngine,
    gameStore,
    async initialize(): Promise<GameEvent | null> {
      await poseEngine.initialize();
      const loaded = await loadQuestions();
      if (disposed) return null;
      questions = loaded;
      selectQuestion(0);
      poseEngine.start();
      const state = gameStore.getState();
      if (!state.question || !state.actionConfig)
        throw new Error('Question initialization failed.');
      return {
        type: 'QUESTION_LOADED',
        timestampMs: now(),
        payload: { question: state.question, config: state.actionConfig },
      };
    },
    selectQuestion,
    getQuestionCount: () => questions.length,
    emitAction: (actionId: ActionId | null) => poseEngine.emitAction(actionId),
    dispose() {
      disposed = true;
      poseEngine.stop();
      poseEngine.dispose();
      configs.clear();
    },
  };
}
export type PlaygroundRuntime = ReturnType<typeof createPlayground>;
export type PlaygroundDebug = {
  frame: PoseFrameResult | null;
  event: GameEvent | null;
};
