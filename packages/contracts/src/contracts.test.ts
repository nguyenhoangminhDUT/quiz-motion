import { describe, expect, it } from 'vitest';
import {
  ACTION_IDS,
  ACTION_DEFINITIONS,
  poseFrameSchema,
  quizQuestionSchema,
  questionBundleSchema,
} from './index';

describe('shared contracts', () => {
  it('exposes exactly eight stable, unique action IDs with complete metadata', () => {
    expect(ACTION_IDS).toEqual([
      'ACT_01',
      'ACT_02',
      'ACT_03',
      'ACT_04',
      'ACT_05',
      'ACT_06',
      'ACT_07',
      'ACT_08',
    ]);
    expect(new Set(ACTION_IDS).size).toBe(8);
    expect(Object.keys(ACTION_DEFINITIONS)).toEqual([...ACTION_IDS]);
    for (const id of ACTION_IDS) {
      const definition = ACTION_DEFINITIONS[id];
      expect(definition.id).toBe(id);
      for (const value of Object.values(definition))
        expect(value.length).toBeGreaterThan(0);
    }
  });
  it('rejects invalid tracking states and out-of-range confidence', () => {
    const frame = {
      timestampMs: 10,
      detectedAction: null,
      confidence: 0,
      landmarks: [],
      trackingStatus: 'lost',
    };
    expect(poseFrameSchema.safeParse(frame).success).toBe(true);
    expect(
      poseFrameSchema.safeParse({ ...frame, confidence: 1.1 }).success,
    ).toBe(false);
    expect(
      poseFrameSchema.safeParse({ ...frame, detectedAction: 'ACT_01' }).success,
    ).toBe(false);
    expect(
      poseFrameSchema.safeParse({ ...frame, timestampMs: -1 }).success,
    ).toBe(false);
    expect(
      poseFrameSchema.safeParse({
        ...frame,
        trackingStatus: 'tracking',
        landmarks: [{ x: 0.5, y: 0.3, z: -0.2 }],
      }).success,
    ).toBe(true);
  });
  const question = {
    id: 'q',
    content: 'Example?',
    options: ['__proto__', 'some-uuid', 'option/3', '4'].map((id) => ({
      id,
      text: id,
    })),
  };
  it('accepts arbitrary option IDs and rejects duplicate IDs or wrong counts', () => {
    expect(quizQuestionSchema.safeParse(question).success).toBe(true);
    expect(
      quizQuestionSchema.safeParse({
        ...question,
        options: question.options.slice(1),
      }).success,
    ).toBe(false);
    expect(
      quizQuestionSchema.safeParse({
        ...question,
        options: Array(4).fill(question.options[0]),
      }).success,
    ).toBe(false);
  });
  it('requires an exact four-option mapping with distinct actions and matching question ID', () => {
    const optionMap = Object.fromEntries(
      question.options.map((o, i) => [o.id, ACTION_IDS[i]]),
    );
    const bundle = { question, config: { questionId: 'q', optionMap } };
    expect(questionBundleSchema.safeParse(bundle).success).toBe(true);
    expect(
      questionBundleSchema.safeParse({
        ...bundle,
        config: { questionId: 'other', optionMap },
      }).success,
    ).toBe(false);
    expect(
      questionBundleSchema.safeParse({
        ...bundle,
        config: {
          questionId: 'q',
          optionMap: { a: 'ACT_01', b: 'ACT_02', c: 'ACT_03', d: 'ACT_04' },
        },
      }).success,
    ).toBe(false);
  });
});
