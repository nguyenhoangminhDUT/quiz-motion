import {
  questionBundleSchema,
  type QuestionActionConfig,
  type QuizQuestion,
} from '@action-quiz/contracts';

export function validateQuestionConfig(
  question: QuizQuestion,
  config: QuestionActionConfig,
): void {
  questionBundleSchema.parse({ question, config });
}
