import { z } from 'zod';
import { ACTION_IDS, type ActionId } from './action';

export const actionIdSchema = z.enum(ACTION_IDS);
const unit = z.number().finite().min(0).max(1);
const id = z.string().trim().min(1);
export const poseFrameSchema = z
  .object({
    timestampMs: z.number().finite().nonnegative(),
    detectedAction: actionIdSchema.nullable(),
    confidence: unit,
    trackingStatus: z.enum(['tracking', 'lost', 'unavailable']),
    landmarks: z.array(
      z.object({
        x: z.number().finite(),
        y: z.number().finite(),
        z: z.number().finite(),
        visibility: unit.optional(),
        presence: unit.optional(),
      }),
    ),
  })
  .superRefine((frame, ctx) => {
    if (frame.trackingStatus === 'tracking' && frame.landmarks.length !== 33) {
      ctx.addIssue({
        code: 'custom',
        path: ['landmarks'],
        message: 'Tracking frames must contain exactly 33 indexed landmarks.',
      });
    }
    if (
      frame.trackingStatus !== 'tracking' &&
      (frame.detectedAction !== null ||
        frame.confidence !== 0 ||
        frame.landmarks.length !== 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Lost/unavailable tracking must have no action, zero confidence and no landmarks.',
      });
    }
  });
export const quizQuestionSchema = z
  .object({
    id,
    content: z.string().min(1),
    options: z.array(z.object({ id, text: z.string().min(1) })).length(4),
  })
  .refine(
    (q) => new Set(q.options.map((o) => o.id)).size === 4,
    'Option IDs must be unique.',
  );
export const questionActionConfigSchema = z
  .object({
    questionId: id,
    optionMap: z.custom<Readonly<Record<string, ActionId>>>(
      (value) =>
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.entries(value).every(
          ([key, action]) =>
            id.safeParse(key).success &&
            actionIdSchema.safeParse(action).success,
        ),
      'Invalid option/action record',
    ),
  })
  .refine(
    (config) =>
      Object.keys(config.optionMap).length === 4 &&
      new Set(Object.values(config.optionMap)).size === 4,
    'Four distinct actions are required.',
  );
export const questionBundleSchema = z
  .object({
    question: quizQuestionSchema,
    config: questionActionConfigSchema,
  })
  .refine(
    ({ question, config }) =>
      question.id === config.questionId &&
      question.options.every((o) => Object.hasOwn(config.optionMap, o.id)),
    'Mapping must match the question and its exact option IDs.',
  );
export const submitAnswerRequestSchema = z.object({
  questionId: id,
  selectedOptionId: id,
  attemptId: id.optional(),
});
