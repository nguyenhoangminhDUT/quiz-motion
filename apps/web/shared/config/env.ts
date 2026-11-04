import { z } from 'zod';

const providerSchema = z.object({
  poseProvider: z.literal('mock').default('mock'),
  quizProvider: z.literal('mock').default('mock'),
});
export function readProviders(input: {
  poseProvider?: string | undefined;
  quizProvider?: string | undefined;
}) {
  const result = providerSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      'Phase 0 supports mock providers only. MediaPipe and HTTP adapters are TODO.',
    );
  return result.data;
}
