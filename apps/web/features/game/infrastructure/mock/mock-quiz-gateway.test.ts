import { describe, expect, it } from 'vitest';
import { quizQuestionSchema } from '@action-quiz/contracts';
import { MockQuizGateway } from './mock-quiz-gateway';

describe('MockQuizGateway', () => {
  it('returns at least two valid independent fixtures with four unique option IDs', async () => {
    const gateway = new MockQuizGateway();
    const questions = await gateway.loadQuestions();
    expect(questions.length).toBeGreaterThanOrEqual(2);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const question of questions) {
      expect(quizQuestionSchema.safeParse(question).success).toBe(true);
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options.map((o) => o.id)).size).toBe(4);
    }
    const again = await gateway.loadQuestions();
    expect(again).toEqual(questions);
    expect(again[0]).not.toBe(questions[0]);
  });
  it('accepts real fixture option IDs and rejects Action IDs or unknown questions', async () => {
    const gateway = new MockQuizGateway();
    await expect(
      gateway.submitAnswer({
        questionId: 'question-orbit',
        selectedOptionId: 'planet-mars',
      }),
    ).resolves.toMatchObject({
      selectedOptionId: 'planet-mars',
      submissionId: 'mock-submission-1',
    });
    await expect(
      gateway.submitAnswer({
        questionId: 'question-orbit',
        selectedOptionId: 'ACT_01',
      }),
    ).rejects.toThrow('Unknown');
    await expect(
      gateway.submitAnswer({
        questionId: 'missing',
        selectedOptionId: 'planet-mars',
      }),
    ).rejects.toThrow('Unknown');
  });
});
