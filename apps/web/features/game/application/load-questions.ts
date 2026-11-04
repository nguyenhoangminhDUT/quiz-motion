import { quizQuestionSchema, type QuizQuestion } from '@action-quiz/contracts';
import type { QuizGateway } from './ports/quiz-gateway';

export function createLoadQuestions(gateway: QuizGateway) {
  return async (): Promise<readonly QuizQuestion[]> => {
    const questions = (await gateway.loadQuestions()).map((q) =>
      quizQuestionSchema.parse(q),
    );
    if (
      questions.length === 0 ||
      new Set(questions.map((q) => q.id)).size !== questions.length
    ) {
      throw new Error('Quiz must have questions with unique IDs.');
    }
    return questions;
  };
}
