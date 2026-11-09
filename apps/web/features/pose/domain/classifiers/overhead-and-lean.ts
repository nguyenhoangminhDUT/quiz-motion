import type { PoseLandmark } from '@action-quiz/contracts';
import { normalizeDistance, shoulderWidth } from '../geometry';
import type { ActionScore } from './classifier-types';
import {
  bodyCenters,
  elbowAngle,
  normalizedDistance,
  reliablePoints,
} from './pose-features';
import { averageScore, scoreAtLeast, scoreAtMost } from './scoring';

export function scoreYPose(landmarks: readonly PoseLandmark[]): ActionScore {
  const points = reliablePoints(landmarks, [
    'nose',
    'leftShoulder',
    'rightShoulder',
    'leftElbow',
    'rightElbow',
    'leftWrist',
    'rightWrist',
  ]);
  const scale = shoulderWidth(landmarks);
  if (!points || scale === null) return { actionId: 'ACT_01', score: 0 };

  const leftRise = normalizeDistance(points.nose.y - points.leftWrist.y, scale);
  const rightRise = normalizeDistance(
    points.nose.y - points.rightWrist.y,
    scale,
  );
  const leftOutward = normalizeDistance(
    points.leftWrist.x - points.leftShoulder.x,
    scale,
  );
  const rightOutward = normalizeDistance(
    points.rightShoulder.x - points.rightWrist.x,
    scale,
  );
  const leftAngle = elbowAngle(
    points.leftShoulder,
    points.leftElbow,
    points.leftWrist,
  );
  const rightAngle = elbowAngle(
    points.rightShoulder,
    points.rightElbow,
    points.rightWrist,
  );

  const score = averageScore(
    scoreAtLeast(leftRise, 0.15, 0.55),
    scoreAtLeast(rightRise, 0.15, 0.55),
    scoreAtLeast(leftOutward, 0.25, 0.8),
    scoreAtLeast(rightOutward, 0.25, 0.8),
    scoreAtLeast(leftAngle, 135, 165),
    scoreAtLeast(rightAngle, 135, 165),
  );
  return { actionId: 'ACT_01', score };
}

function scoreLean(
  landmarks: readonly PoseLandmark[],
  direction: 'left' | 'right',
): ActionScore {
  const centers = bodyCenters(landmarks);
  const hips = reliablePoints(landmarks, ['leftHip', 'rightHip']);
  const actionId = direction === 'left' ? 'ACT_02' : 'ACT_03';
  if (!centers || !hips) return { actionId, score: 0 };

  // Anatomical left appears toward increasing x in the unmirrored camera image.
  const signedOffset =
    (centers.shoulderCenter.x - centers.hipCenter.x) / centers.torsoScale;
  const directionalOffset = direction === 'left' ? signedOffset : -signedOffset;
  const hipSlope = normalizeDistance(
    Math.abs(hips.leftHip.y - hips.rightHip.y),
    centers.shoulderScale,
  );
  const score = averageScore(
    scoreAtLeast(directionalOffset, 0.1, 0.28),
    scoreAtMost(hipSlope, 0.05, 0.3),
  );
  return { actionId, score: directionalOffset > 0.08 ? score : 0 };
}

export function scoreLeanLeft(landmarks: readonly PoseLandmark[]): ActionScore {
  return scoreLean(landmarks, 'left');
}

export function scoreLeanRight(
  landmarks: readonly PoseLandmark[],
): ActionScore {
  return scoreLean(landmarks, 'right');
}

export function scoreHeartHead(
  landmarks: readonly PoseLandmark[],
): ActionScore {
  const points = reliablePoints(landmarks, [
    'nose',
    'leftShoulder',
    'rightShoulder',
    'leftElbow',
    'rightElbow',
    'leftWrist',
    'rightWrist',
  ]);
  const scale = shoulderWidth(landmarks);
  if (!points || scale === null) return { actionId: 'ACT_04', score: 0 };

  const wristGap = normalizedDistance(
    points.leftWrist,
    points.rightWrist,
    scale,
  );
  const elbowGap = normalizedDistance(
    points.leftElbow,
    points.rightElbow,
    scale,
  );
  const leftRise = normalizeDistance(points.nose.y - points.leftWrist.y, scale);
  const rightRise = normalizeDistance(
    points.nose.y - points.rightWrist.y,
    scale,
  );
  const leftAngle = elbowAngle(
    points.leftShoulder,
    points.leftElbow,
    points.leftWrist,
  );
  const rightAngle = elbowAngle(
    points.rightShoulder,
    points.rightElbow,
    points.rightWrist,
  );
  const score = averageScore(
    scoreAtMost(wristGap, 0.15, 0.7),
    scoreAtLeast(elbowGap, 1.2, 1.8),
    scoreAtLeast(leftRise, 0.15, 0.5),
    scoreAtLeast(rightRise, 0.15, 0.5),
    scoreAtMost(leftAngle, 70, 150),
    scoreAtMost(rightAngle, 70, 150),
  );
  return {
    actionId: 'ACT_04',
    score: wristGap !== null && wristGap < 0.8 ? score : 0,
  };
}
