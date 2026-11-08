import { ACTION_IDS } from '@action-quiz/contracts';
import { describe, expect, it } from 'vitest';
import { classifyPose, selectAction } from './action-selector';
import {
  createCrossArmsPose,
  createDabPose,
  createHeartPose,
  createLeanPose,
  createNeutralPose,
  createSalutePose,
  createThinkingPose,
  createYPose,
} from './pose-fixtures.test-helper';

describe('action selector', () => {
  it.each(ACTION_IDS)(
    'selects %s when it is clearly the best action',
    (actionId) => {
      const scores = ACTION_IDS.map((candidate) => ({
        actionId: candidate,
        score: candidate === actionId ? 0.85 : 0.4,
      }));
      expect(selectAction(scores)).toEqual({
        detectedAction: actionId,
        confidence: 0.85,
      });
    },
  );

  it('returns no action below the minimum score', () => {
    expect(selectAction([{ actionId: 'ACT_01', score: 0.69 }])).toEqual({
      detectedAction: null,
      confidence: 0,
    });
  });

  it('returns no action when the best score lacks the required margin', () => {
    expect(
      selectAction([
        { actionId: 'ACT_06', score: 0.86 },
        { actionId: 'ACT_08', score: 0.77 },
      ]),
    ).toEqual({ detectedAction: null, confidence: 0 });
  });

  it('accepts an exact threshold and margin', () => {
    expect(
      selectAction([
        { actionId: 'ACT_01', score: 0.7 },
        { actionId: 'ACT_04', score: 0.6 },
      ]),
    ).toEqual({ detectedAction: 'ACT_01', confidence: 0.7 });
  });

  it('returns no action for neutral or invalid score input', () => {
    expect(selectAction([])).toEqual({ detectedAction: null, confidence: 0 });
    expect(selectAction([{ actionId: 'ACT_01', score: Number.NaN }])).toEqual({
      detectedAction: null,
      confidence: 0,
    });
    expect(selectAction([{ actionId: 'ACT_01', score: 1.1 }])).toEqual({
      detectedAction: null,
      confidence: 0,
    });
  });

  it.each([
    ['ACT_01', createYPose],
    ['ACT_02', () => createLeanPose('left')],
    ['ACT_03', () => createLeanPose('right')],
    ['ACT_04', createHeartPose],
    ['ACT_05', createCrossArmsPose],
    ['ACT_06', createSalutePose],
    ['ACT_07', () => createDabPose('left')],
    ['ACT_08', () => createThinkingPose('right')],
  ] as const)('classifies the %s fixture', (actionId, createPose) => {
    expect(classifyPose(createPose()).detectedAction).toBe(actionId);
  });

  it('returns no action for a neutral pose', () => {
    expect(classifyPose(createNeutralPose())).toEqual({
      detectedAction: null,
      confidence: 0,
    });
  });
});
