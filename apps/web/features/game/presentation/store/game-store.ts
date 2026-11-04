import { createStore } from 'zustand/vanilla';
import type {
  GameState,
  QuestionActionConfig,
  QuizQuestion,
} from '@action-quiz/contracts';

const initialState: GameState = {
  status: 'IDLE',
  question: null,
  actionConfig: null,
  candidateOptionId: null,
  confirmedOptionId: null,
  holdProgress: 0,
  error: null,
};
export function createGameStore() {
  return createStore<GameState>(() => ({ ...initialState }));
}
export function setReadyQuestion(
  store: ReturnType<typeof createGameStore>,
  question: QuizQuestion,
  actionConfig: QuestionActionConfig,
): void {
  store.setState(
    { ...initialState, status: 'READY', question, actionConfig },
    true,
  );
}
