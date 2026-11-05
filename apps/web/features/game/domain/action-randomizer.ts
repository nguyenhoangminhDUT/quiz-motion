import {
  ACTION_IDS,
  quizQuestionSchema,
  type ActionId,
  type QuestionActionConfig,
  type QuizQuestion,
} from '@action-quiz/contracts';
import { validateQuestionConfig } from './question-config';

export function createRandomQuestionConfig(
  question: QuizQuestion,
  rng: () => number,
): QuestionActionConfig {
  quizQuestionSchema.parse(question);

  // Sao chép để không thay đổi pool hành động dùng chung.
  const actions = [...ACTION_IDS];

  // Xáo trộn Fisher–Yates.
  for (let i = actions.length - 1; i > 0; i -= 1) {
    const random = rng();

    if (!Number.isFinite(random) || random < 0 || random >= 1) {
      throw new Error('Random value must be in [0, 1).');
    }

    const j = Math.floor(random * (i + 1));
    const current = actions[i];
    const selected = actions[j];

    if (current === undefined || selected === undefined) {
      throw new Error('Invalid action index.');
    }

    actions[i] = selected;
    actions[j] = current;
  }

  // Gán bốn hành động đầu tiên vào ID đáp án thật.
  const optionMap: Record<string, ActionId> = Object.create(null);

  question.options.forEach((option, index) => {
    const action = actions[index];

    if (action === undefined) {
      throw new Error('Not enough actions for question options.');
    }

    optionMap[option.id] = action;
  });

  const config: QuestionActionConfig = {
    questionId: question.id,
    optionMap,
  };

  validateQuestionConfig(question, config);

  return config;
}