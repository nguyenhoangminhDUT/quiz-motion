import { expect, it } from 'vitest';
import {
  experiencePreviewReducer as reduce,
  INITIAL_EXPERIENCE_PREVIEW as initial,
} from './experience-preview';

it('bounds manual progress, keeps a full ring unconfirmed and drops stale selections on pose/camera changes', () => {
  const selected = reduce(initial, {
    type: 'pose',
    actionId: 'ACT_01',
    optionId: '__proto__',
  });
  const full = reduce(selected, { type: 'progress', progress: 2 });
  expect(full).toMatchObject({
    status: 'holding',
    progress: 1,
    confirmedOptionId: null,
  });
  expect(reduce(selected, { type: 'progress', progress: NaN }).progress).toBe(
    0,
  );
  expect(reduce(selected, { type: 'progress', progress: -1 }).progress).toBe(0);
  const confirmed = reduce(full, { type: 'status', status: 'confirmed' });
  expect(confirmed.confirmedOptionId).toBe('__proto__');
  const unrelated = reduce(confirmed, {
    type: 'pose',
    actionId: 'ACT_08',
    optionId: null,
  });
  expect(unrelated).toMatchObject({
    progress: 0,
    candidateOptionId: null,
    confirmedOptionId: null,
  });
  expect(reduce(unrelated, { type: 'status', status: 'submitted' })).toBe(
    unrelated,
  );
  const denied = reduce(confirmed, { type: 'camera', camera: 'denied' });
  expect(denied).toMatchObject({
    progress: 0,
    candidateOptionId: null,
    confirmedOptionId: null,
    trackingStatus: 'unavailable',
  });
  expect(reduce(denied, { type: 'progress', progress: 0.8 })).toBe(denied);
});
