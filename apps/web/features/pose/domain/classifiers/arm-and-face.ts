import type { PoseLandmark } from '@action-quiz/contracts';
import { midpoint, normalizeDistance, shoulderWidth } from '../geometry';
import type { ActionScore } from './classifier-types';
import {
  elbowAngle,
  normalizedDistance,
  reliablePoints,
} from './pose-features';
import { averageScore, scoreAtLeast, scoreAtMost } from './scoring';

export function scoreCrossArms(
  landmarks: readonly PoseLandmark[],
): ActionScore {
  const points = reliablePoints(landmarks, [
    'leftShoulder',
    'rightShoulder',
    'leftElbow',
    'rightElbow',
    'leftWrist',
    'rightWrist',
  ]);
  const scale = shoulderWidth(landmarks);
  if (!points || scale === null) return { actionId: 'ACT_05', score: 0 };

  const shoulderCenter = midpoint(points.leftShoulder, points.rightShoulder);
  if (!shoulderCenter) return { actionId: 'ACT_05', score: 0 };

  const leftToOppositeShoulder = normalizedDistance(
    points.leftWrist,
    points.rightShoulder,
    scale,
  );
  const rightToOppositeShoulder = normalizedDistance(
    points.rightWrist,
    points.leftShoulder,
    scale,
  );
  const leftCross = normalizeDistance(
    shoulderCenter.x - points.leftWrist.x,
    scale,
  );
  const rightCross = normalizeDistance(
    points.rightWrist.x - shoulderCenter.x,
    scale,
  );
  const wristHeightGap = normalizeDistance(
    Math.abs(points.leftWrist.y - points.rightWrist.y),
    scale,
  );

  const score = averageScore(
    scoreAtMost(leftToOppositeShoulder, 0.35, 1.1),
    scoreAtMost(rightToOppositeShoulder, 0.35, 1.1),
    scoreAtLeast(leftCross, 0.05, 0.35),
    scoreAtLeast(rightCross, 0.05, 0.35),
    scoreAtMost(wristHeightGap, 0.15, 0.65),
  );
  return {
    actionId: 'ACT_05',
    score:
      leftCross !== null &&
      rightCross !== null &&
      leftCross > 0 &&
      rightCross > 0
        ? score
        : 0,
  };
}

export function scoreSalute(landmarks: readonly PoseLandmark[]): ActionScore {
  const points = reliablePoints(landmarks, [
    'rightEar',
    'mouthRight',
    'rightShoulder',
    'rightElbow',
    'rightWrist',
  ]);
  const scale = shoulderWidth(landmarks);
  if (!points || scale === null) return { actionId: 'ACT_06', score: 0 };

  const wristToEar = normalizedDistance(
    points.rightWrist,
    points.rightEar,
    scale,
  );
  const elbowOutward = normalizeDistance(
    points.rightShoulder.x - points.rightElbow.x,
    scale,
  );
  const wristAboveMouth = normalizeDistance(
    points.mouthRight.y - points.rightWrist.y,
    scale,
  );
  const elbowBelowWrist = normalizeDistance(
    points.rightElbow.y - points.rightWrist.y,
    scale,
  );
  const angle = elbowAngle(
    points.rightShoulder,
    points.rightElbow,
    points.rightWrist,
  );

  const score = averageScore(
    scoreAtMost(wristToEar, 0.1, 0.65),
    scoreAtLeast(elbowOutward, 0.15, 0.55),
    scoreAtLeast(wristAboveMouth, 0.02, 0.18),
    scoreAtLeast(elbowBelowWrist, 0.1, 0.4),
    scoreAtMost(angle, 90, 145),
  );
  return {
    actionId: 'ACT_06',
    score:
      elbowOutward !== null &&
      wristAboveMouth !== null &&
      elbowBelowWrist !== null &&
      elbowOutward > 0 &&
      wristAboveMouth > 0 &&
      elbowBelowWrist > 0
        ? score
        : 0,
  };
}

type BodySide = 'left' | 'right';

function scoreDabDirection(
  landmarks: readonly PoseLandmark[],
  bentSide: BodySide,
): number {
  const straightSide = bentSide === 'left' ? 'right' : 'left';
  const points = reliablePoints(landmarks, [
    'nose',
    `${bentSide}Shoulder`,
    `${bentSide}Elbow`,
    `${bentSide}Wrist`,
    `${straightSide}Shoulder`,
    `${straightSide}Elbow`,
    `${straightSide}Wrist`,
  ]);
  const scale = shoulderWidth(landmarks);
  if (!points || scale === null) return 0;

  const bentShoulder = points[`${bentSide}Shoulder`];
  const bentElbow = points[`${bentSide}Elbow`];
  const bentWrist = points[`${bentSide}Wrist`];
  const straightShoulder = points[`${straightSide}Shoulder`];
  const straightElbow = points[`${straightSide}Elbow`];
  const straightWrist = points[`${straightSide}Wrist`];
  const wristToFace = normalizedDistance(bentWrist, points.nose, scale);
  const bentAngle = elbowAngle(bentShoulder, bentElbow, bentWrist);
  const straightAngle = elbowAngle(
    straightShoulder,
    straightElbow,
    straightWrist,
  );
  const straightOutward = normalizeDistance(
    straightSide === 'left'
      ? straightWrist.x - straightShoulder.x
      : straightShoulder.x - straightWrist.x,
    scale,
  );
  const straightVertical = normalizeDistance(
    Math.abs(straightWrist.y - straightShoulder.y),
    scale,
  );

  const score = averageScore(
    scoreAtMost(wristToFace, 0.2, 0.8),
    scoreAtMost(bentAngle, 75, 135),
    scoreAtLeast(straightAngle, 145, 170),
    scoreAtLeast(straightOutward, 0.6, 1.4),
    scoreAtLeast(straightVertical, 0.25, 0.75),
  );
  return wristToFace !== null &&
    straightOutward !== null &&
    wristToFace < 0.9 &&
    straightOutward > 0.5
    ? score
    : 0;
}

export function scoreDab(landmarks: readonly PoseLandmark[]): ActionScore {
  return {
    actionId: 'ACT_07',
    score: Math.max(
      scoreDabDirection(landmarks, 'left'),
      scoreDabDirection(landmarks, 'right'),
    ),
  };
}

function scoreThinkingSide(
  landmarks: readonly PoseLandmark[],
  side: BodySide,
): number {
  const points = reliablePoints(landmarks, [
    'leftEar',
    'rightEar',
    'mouthLeft',
    'mouthRight',
    `${side}Shoulder`,
    `${side}Elbow`,
    `${side}Wrist`,
  ]);
  const scale = shoulderWidth(landmarks);
  if (!points || scale === null) return 0;

  const mouthCenter = midpoint(points.mouthLeft, points.mouthRight);
  const earCenter = midpoint(points.leftEar, points.rightEar);
  if (!mouthCenter || !earCenter) return 0;

  const wrist = points[`${side}Wrist`];
  const elbow = points[`${side}Elbow`];
  const shoulder = points[`${side}Shoulder`];
  const wristToMouth = normalizedDistance(wrist, mouthCenter, scale);
  const wristBelowEar = normalizeDistance(wrist.y - earCenter.y, scale);
  const elbowBelowWrist = normalizeDistance(elbow.y - wrist.y, scale);
  const angle = elbowAngle(shoulder, elbow, wrist);

  return averageScore(
    scoreAtMost(wristToMouth, 0.12, 0.6),
    scoreAtLeast(wristBelowEar, 0.05, 0.22),
    scoreAtLeast(elbowBelowWrist, 0.2, 0.7),
    scoreAtMost(angle, 55, 125),
  );
}

export function scoreThinking(landmarks: readonly PoseLandmark[]): ActionScore {
  return {
    actionId: 'ACT_08',
    score: Math.max(
      scoreThinkingSide(landmarks, 'left'),
      scoreThinkingSide(landmarks, 'right'),
    ),
  };
}
