import {
  quizQuestionSchema,
  submitAnswerRequestSchema,
  type QuizQuestion,
  type SubmissionResult,
  type SubmitAnswerRequest,
} from '@action-quiz/contracts';
import type { QuizGateway } from '../../application/ports/quiz-gateway';
import { MOCK_QUESTIONS } from './quiz-fixtures';

/** In-memory adapter only. Acceptance is not scoring or server persistence. */
export class MockQuizGateway implements QuizGateway {
  private submissionCount = 0;
  async loadQuestions(): Promise<readonly QuizQuestion[]> {
    return MOCK_QUESTIONS.map((q) => quizQuestionSchema.parse(q));
  }
  async submitAnswer(request: SubmitAnswerRequest): Promise<SubmissionResult> {
    const valid = submitAnswerRequestSchema.parse(request);
    const question = MOCK_QUESTIONS.find((q) => q.id === valid.questionId);
    if (
      !question ||
      !question.options.some((o) => o.id === valid.selectedOptionId)
    ) {
      throw new Error('Unknown question or option ID.');
    }
    this.submissionCount += 1;
    return {
      questionId: valid.questionId,
      selectedOptionId: valid.selectedOptionId,
      submissionId: 'mock-submission-' + this.submissionCount,
    };
  }
}
