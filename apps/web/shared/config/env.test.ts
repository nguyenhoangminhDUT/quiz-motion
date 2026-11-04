import { expect, it } from 'vitest';
import { readProviders } from './env';

it('defaults to mocks and fails explicitly for unimplemented providers', () => {
  expect(readProviders({})).toEqual({
    poseProvider: 'mock',
    quizProvider: 'mock',
  });
  expect(() => readProviders({ poseProvider: 'mediapipe' })).toThrow(
    'mock providers only',
  );
  expect(() => readProviders({ quizProvider: 'http' })).toThrow(
    'mock providers only',
  );
});
