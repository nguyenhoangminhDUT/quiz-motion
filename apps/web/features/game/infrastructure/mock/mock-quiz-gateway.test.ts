import { describe, expect, it } from 'vitest';
import { quizQuestionSchema } from '@action-quiz/contracts';
import { MockQuizGateway } from './mock-quiz-gateway';

describe('MockQuizGateway', () => {
  it('returns ten independent questions with four unique options and no answer keys', async () => {
    const gateway = new MockQuizGateway();
    const questions = await gateway.loadQuestions();
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const question of questions) {
      expect(quizQuestionSchema.safeParse(question).success).toBe(true);
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options.map((o) => o.id)).size).toBe(4);
      expect(question).not.toHaveProperty('correctOptionId');
    }
    const again = await gateway.loadQuestions();
    expect(again).toEqual(questions);
    expect(again[0]).not.toBe(questions[0]);
  });
  it('grades every option and reveals the same valid answer key only on submission', async () => {
    const gateway = new MockQuizGateway();
    const questions = await gateway.loadQuestions();
    for (const question of questions) {
      const results = await Promise.all(
        question.options.map((option) =>
          gateway.submitAnswer({
            questionId: question.id,
            selectedOptionId: option.id,
          }),
        ),
      );
      expect(
        results.filter((result) => result.evaluation?.isCorrect),
      ).toHaveLength(1);
      const correctOptionId = results[0]?.evaluation?.correctOptionId;
      expect(
        question.options.some((option) => option.id === correctOptionId),
      ).toBe(true);
      for (const result of results) {
        expect(result.evaluation).toEqual({
          correctOptionId,
          isCorrect: result.selectedOptionId === correctOptionId,
        });
      }
    }
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
