import type { PoseLandmark } from '@action-quiz/contracts';
import {
  scoreCrossArms,
  scoreDab,
  scoreSalute,
  scoreThinking,
} from './arm-and-face';
import { ACTION_SELECTION_CONFIG } from './classifier-config';
import type { ActionScore, ActionSelection } from './classifier-types';
import {
  scoreHeartHead,
  scoreLeanLeft,
  scoreLeanRight,
  scoreYPose,
} from './overhead-and-lean';

export function selectAction(
  scores: readonly ActionScore[],
  config = ACTION_SELECTION_CONFIG,
): ActionSelection {
  const ranked = scores
    .filter(({ score }) => Number.isFinite(score) && score >= 0 && score <= 1)
    .sort((first, second) => second.score - first.score);
  const best = ranked[0];
  if (!best || best.score < config.minimumScore) {
    return { detectedAction: null, confidence: 0 };
  }

  const runnerUpScore = ranked[1]?.score ?? 0;
  if (best.score - runnerUpScore + Number.EPSILON < config.minimumMargin) {
    return { detectedAction: null, confidence: 0 };
  }

  return { detectedAction: best.actionId, confidence: best.score };
}

export function scoreAllActions(
  landmarks: readonly PoseLandmark[],
): readonly ActionScore[] {
  return [
    scoreYPose(landmarks),
    scoreLeanLeft(landmarks),
    scoreLeanRight(landmarks),
    scoreHeartHead(landmarks),
    scoreCrossArms(landmarks),
    scoreSalute(landmarks),
    scoreDab(landmarks),
    scoreThinking(landmarks),
  ];
}

export function classifyPose(
  landmarks: readonly PoseLandmark[],
): ActionSelection {
  return selectAction(scoreAllActions(landmarks));
}
