import { describe, expect, it } from 'vitest';
import { ACTION_IDS, type QuizQuestion } from '@action-quiz/contracts';
import { createRandomQuestionConfig } from './action-randomizer';

const question: QuizQuestion = {
  id: 'question-test',
  content: 'Chọn đáp án',
  options: [
    { id: 'answer-venus', text: 'Venus' },
    { id: 'answer-mars', text: 'Mars' },
    { id: '__proto__', text: 'Jupiter' },
    { id: 'answer-neptune', text: 'Neptune' },
  ],
};

describe('createRandomQuestionConfig', () => {
  it('maps the exact option IDs to four distinct valid actions', () => {
    const config = createRandomQuestionConfig(question, () => 0.5);
    const actions = Object.values(config.optionMap);

    expect(config.questionId).toBe(question.id);
    expect(Object.keys(config.optionMap)).toEqual(
      question.options.map((option) => option.id),
    );
    expect(actions).toHaveLength(4);
    expect(new Set(actions).size).toBe(4);

    for (const action of actions) {
      expect(ACTION_IDS).toContain(action);
    }

    expect(Object.hasOwn(config.optionMap, '__proto__')).toBe(true);
  });

  it('produces a predictable mapping with a controlled RNG', () => {
    const config = createRandomQuestionConfig(question, () => 0);

    expect(Object.values(config.optionMap)).toEqual([
      'ACT_02',
      'ACT_03',
      'ACT_04',
      'ACT_05',
    ]);
  });

  it('does not mutate the question or shared action pool', () => {
    const originalQuestion = structuredClone(question);
    const originalActions = [...ACTION_IDS];

    createRandomQuestionConfig(question, () => 0.5);

    expect(question).toEqual(originalQuestion);
    expect(ACTION_IDS).toEqual(originalActions);
  });

  it.each([-0.1, 1, NaN, Infinity])(
    'rejects invalid RNG output: %s',
    (value) => {
      expect(() => createRandomQuestionConfig(question, () => value)).toThrow(
        'Random value must be in [0, 1).',
      );
    },
  );

  it('rejects a question without exactly four options', () => {
    const invalidQuestion = {
      ...question,
      options: question.options.slice(0, 3),
    };

    expect(() =>
      createRandomQuestionConfig(invalidQuestion, () => 0.5),
    ).toThrow();
  });
});
