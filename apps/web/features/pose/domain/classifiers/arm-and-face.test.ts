import { describe, expect, it } from 'vitest';
import {
  scoreCrossArms,
  scoreDab,
  scoreSalute,
  scoreThinking,
} from './arm-and-face';
import {
  createCrossArmsPose,
  createDabPose,
  createNeutralPose,
  createSalutePose,
  createThinkingPose,
} from './pose-fixtures.test-helper';

describe('arm and face classifiers', () => {
  it('recognizes crossed arms without accepting a neutral pose', () => {
    expect(scoreCrossArms(createCrossArmsPose()).score).toBeGreaterThanOrEqual(
      0.7,
    );
    expect(scoreCrossArms(createNeutralPose()).score).toBeLessThan(0.7);
  });

  it('recognizes only an anatomical right-hand salute', () => {
    const salute = createSalutePose();
    const leftHandAtTemple = createNeutralPose();
    leftHandAtTemple[13] = { ...leftHandAtTemple[13]!, x: 0.76, y: 0.31 };
    leftHandAtTemple[15] = { ...leftHandAtTemple[15]!, x: 0.57, y: 0.2 };
    expect(scoreSalute(salute).score).toBeGreaterThanOrEqual(0.7);
    expect(scoreSalute(leftHandAtTemple).score).toBeLessThan(0.7);
  });

  it.each(['left', 'right'] as const)(
    'recognizes a dab with the %s arm bent',
    (side) => {
      expect(scoreDab(createDabPose(side)).score).toBeGreaterThanOrEqual(0.7);
    },
  );

  it.each(['left', 'right'] as const)(
    'recognizes thinking with the %s hand',
    (side) => {
      expect(
        scoreThinking(createThinkingPose(side)).score,
      ).toBeGreaterThanOrEqual(0.7);
    },
  );

  it('distinguishes salute, thinking and dab', () => {
    const salute = createSalutePose();
    const thinking = createThinkingPose('right');
    const dab = createDabPose('right');
    expect(scoreThinking(salute).score).toBeLessThan(0.7);
    expect(scoreDab(salute).score).toBeLessThan(0.7);
    expect(scoreSalute(thinking).score).toBeLessThan(0.7);
    expect(scoreSalute(dab).score).toBeLessThan(0.7);
  });

  it('rejects missing reliable landmarks', () => {
    const salute = createSalutePose();
    salute[16] = { ...salute[16]!, presence: 0.1 };
    expect(scoreSalute(salute).score).toBe(0);
  });
});
