import type { ActionId } from './action';
import type { PoseFrameResult } from './pose';
import type {
  QuestionActionConfig,
  QuizQuestion,
  SubmissionResult,
} from './quiz';

export interface EventPayloads {
  QUESTION_LOADED: {
    readonly question: QuizQuestion;
    readonly config: QuestionActionConfig;
  };
  POSE_UPDATED: { readonly frame: PoseFrameResult };
  ACTION_DETECTED: {
    readonly questionId: string;
    readonly actionId: ActionId;
    readonly confidence: number;
  };
  HOLD_PROGRESS_UPDATED: {
    readonly questionId: string;
    readonly optionId: string;
    readonly progress: number;
  };
  ANSWER_CONFIRMED: {
    readonly questionId: string;
    readonly selectedOptionId: string;
  };
  SUBMISSION_SUCCEEDED: { readonly result: SubmissionResult };
  SUBMISSION_FAILED: {
    readonly questionId: string;
    readonly selectedOptionId: string;
    readonly message: string;
  };
  QUESTION_CHANGED: {
    readonly previousQuestionId: string | null;
    readonly questionId: string;
  };
  SESSION_RESET: { readonly reason: 'manual' | 'completed' | 'error' };
}
export type GameEvent = {
  [Type in keyof EventPayloads]: {
    readonly type: Type;
    readonly timestampMs: number;
    readonly payload: EventPayloads[Type];
  };
}[keyof EventPayloads];
export type PoseUpdatedEvent = Extract<GameEvent, { type: 'POSE_UPDATED' }>;
