import { describe, expect, it } from 'vitest';
import {
  scoreHeartHead,
  scoreLeanLeft,
  scoreLeanRight,
  scoreYPose,
} from './overhead-and-lean';
import {
  createHeartPose,
  createLeanPose,
  createNeutralPose,
  createYPose,
} from './pose-fixtures.test-helper';

describe('overhead and lean classifiers', () => {
  it('recognizes Y-Pose and rejects the similar heart pose', () => {
    const yPose = createYPose();
    const heart = createHeartPose();
    expect(scoreYPose(yPose).score).toBeGreaterThanOrEqual(0.7);
    expect(scoreHeartHead(yPose).score).toBeLessThan(0.7);
    expect(scoreHeartHead(heart).score).toBeGreaterThanOrEqual(0.7);
    expect(scoreYPose(heart).score).toBeLessThan(0.7);
  });

  it('distinguishes anatomical left and right before display mirroring', () => {
    const left = createLeanPose('left');
    const right = createLeanPose('right');
    expect(scoreLeanLeft(left).score).toBeGreaterThanOrEqual(0.7);
    expect(scoreLeanRight(left).score).toBe(0);
    expect(scoreLeanRight(right).score).toBeGreaterThanOrEqual(0.7);
    expect(scoreLeanLeft(right).score).toBe(0);
  });

  it('does not classify a neutral pose or hidden required joints', () => {
    const neutral = createNeutralPose();
    expect(scoreYPose(neutral).score).toBeLessThan(0.7);
    expect(scoreLeanLeft(neutral).score).toBe(0);
    expect(scoreLeanRight(neutral).score).toBe(0);
    expect(scoreHeartHead(neutral).score).toBeLessThan(0.7);
    const yPose = createYPose();
    yPose[15] = { ...yPose[15]!, visibility: 0.1 };
    expect(scoreYPose(yPose).score).toBe(0);
  });
});
