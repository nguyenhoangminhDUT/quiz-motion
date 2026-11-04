import type { ActionId } from './action';

export interface QuizOption {
  readonly id: string;
  readonly text: string;
}
export interface QuizQuestion {
  readonly id: string;
  readonly content: string;
  readonly options: readonly QuizOption[];
}
export interface QuestionActionConfig {
  readonly questionId: string;
  readonly optionMap: Readonly<Record<string, ActionId>>;
}
export interface SubmitAnswerRequest {
  readonly questionId: string;
  readonly selectedOptionId: string;
  readonly attemptId?: string;
}
export interface SubmissionResult {
  readonly questionId: string;
  readonly selectedOptionId: string;
  readonly submissionId: string;
}
export const GAME_STATUSES = [
  'IDLE',
  'READY',
  'DETECTING',
  'HOLDING',
  'SUBMITTING',
  'SUBMITTED',
  'ERROR',
] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];
export interface GameState {
  readonly status: GameStatus;
  readonly question: QuizQuestion | null;
  readonly actionConfig: QuestionActionConfig | null;
  readonly candidateOptionId: string | null;
  readonly confirmedOptionId: string | null;
  readonly holdProgress: number;
  readonly error: string | null;
}
