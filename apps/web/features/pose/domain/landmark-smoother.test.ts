import type { PoseLandmark } from '@action-quiz/contracts';
import { describe, expect, it } from 'vitest';
import { LandmarkSmoother } from './landmark-smoother';

function landmarksAt(x: number): PoseLandmark[] {
  return Array.from({ length: 33 }, () => ({
    x,
    y: 0.5,
    z: 0,
    visibility: 1,
    presence: 1,
  }));
}

describe('LandmarkSmoother', () => {
  it('reduces coordinate noise with the configured EMA alpha', () => {
    const smoother = new LandmarkSmoother();
    smoother.update(landmarksAt(0.5));
    const result = smoother.update(landmarksAt(0.6));
    expect(result[0]?.x).toBeCloseTo(0.535);
  });

  it('does not update coordinates from an unreliable landmark', () => {
    const smoother = new LandmarkSmoother();
    smoother.update(landmarksAt(0.5));
    const hidden = landmarksAt(0.9);
    hidden[0] = { ...hidden[0]!, visibility: 0.1 };
    const result = smoother.update(hidden);
    expect(result[0]).toMatchObject({ x: 0.5, visibility: 0.1 });
  });

  it('starts from the next raw frame after reset', () => {
    const smoother = new LandmarkSmoother();
    smoother.update(landmarksAt(0.2));
    smoother.reset();
    expect(smoother.update(landmarksAt(0.8))[0]?.x).toBe(0.8);
  });

  it('requires exactly 33 indexed landmarks', () => {
    const smoother = new LandmarkSmoother();
    expect(() => smoother.update(landmarksAt(0.5).slice(0, 32))).toThrow(
      'Expected 33 landmarks',
    );
  });

  it('rejects invalid smoothing configuration', () => {
    expect(() => new LandmarkSmoother(0)).toThrow(RangeError);
    expect(() => new LandmarkSmoother(1.1)).toThrow(RangeError);
    expect(() => new LandmarkSmoother(0.35, -0.1)).toThrow(RangeError);
  });
});
