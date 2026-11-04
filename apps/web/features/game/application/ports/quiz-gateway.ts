import type {
  QuizQuestion,
  SubmissionResult,
  SubmitAnswerRequest,
} from '@action-quiz/contracts';

export interface QuizGateway {
  loadQuestions(): Promise<readonly QuizQuestion[]>;
  submitAnswer(request: SubmitAnswerRequest): Promise<SubmissionResult>;
}
