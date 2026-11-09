import { describe, expect, it } from 'vitest';
import type { PoseLandmark } from '@action-quiz/contracts';
import {
  angleDegrees,
  distance2D,
  distance3D,
  dot2D,
  getLandmark,
  isReliableLandmark,
  midpoint,
  normalizeDistance,
  shoulderWidth,
  torsoLength,
  vector2D,
} from './geometry';
import { POSE_LANDMARK_INDEX } from './landmark-index';

function body(): PoseLandmark[] {
  const landmarks: PoseLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 1,
    presence: 1,
  }));
  landmarks[POSE_LANDMARK_INDEX.leftShoulder] = {
    x: 0.6,
    y: 0.3,
    z: 0,
    visibility: 1,
  };
  landmarks[POSE_LANDMARK_INDEX.rightShoulder] = {
    x: 0.4,
    y: 0.3,
    z: 0,
    visibility: 1,
  };
  landmarks[POSE_LANDMARK_INDEX.leftHip] = {
    x: 0.55,
    y: 0.7,
    z: 0,
    visibility: 1,
  };
  landmarks[POSE_LANDMARK_INDEX.rightHip] = {
    x: 0.45,
    y: 0.7,
    z: 0,
    visibility: 1,
  };
  return landmarks;
}

describe('pose geometry', () => {
  it('calculates vectors, distances, midpoints, dot products and angles', () => {
    expect(distance2D({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distance3D({ x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 2 })).toBe(3);
    expect(midpoint({ x: -1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 1, y: 3 });
    expect(vector2D({ x: 1, y: 1 }, { x: 4, y: 5 })).toEqual({ x: 3, y: 4 });
    expect(dot2D({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe(11);
    expect(
      angleDegrees({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }),
    ).toBeCloseTo(90);
  });

  it('normalizes shoulder width and torso length for out-of-frame coordinates', () => {
    const landmarks = body();
    expect(shoulderWidth(landmarks)).toBeCloseTo(0.2);
    expect(torsoLength(landmarks)).toBeCloseTo(0.4);
    expect(normalizeDistance(0.1, shoulderWidth(landmarks))).toBeCloseTo(0.5);
    landmarks[POSE_LANDMARK_INDEX.leftShoulder] = {
      x: 1.2,
      y: 0.3,
      z: 0,
      visibility: 1,
    };
    expect(shoulderWidth(landmarks)).toBeCloseTo(0.8);
  });

  it('rejects hidden, missing, non-finite and zero-scale input', () => {
    const landmarks = body();
    landmarks[POSE_LANDMARK_INDEX.leftShoulder] = {
      x: 0.6,
      y: 0.3,
      z: 0,
      visibility: 0.49,
    };
    expect(shoulderWidth(landmarks)).toBeNull();
    expect(isReliableLandmark(landmarks[0])).toBe(true);
    expect(isReliableLandmark({ x: 0, y: 0, z: 0, presence: 0.2 })).toBe(false);
    expect(getLandmark([], POSE_LANDMARK_INDEX.nose)).toBeNull();
    expect(distance2D({ x: Number.NaN, y: 0 }, { x: 0, y: 0 })).toBeNull();
    expect(
      angleDegrees({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 }),
    ).toBeNull();
    expect(normalizeDistance(1, 0)).toBeNull();
  });
});
