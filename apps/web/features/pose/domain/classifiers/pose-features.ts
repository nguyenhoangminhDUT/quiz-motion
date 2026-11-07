import type { PoseLandmark } from '@action-quiz/contracts';
import {
  angleDegrees,
  distance2D,
  getLandmark,
  isReliableLandmark,
  midpoint,
  normalizeDistance,
  shoulderWidth,
  torsoLength,
  type Point2D,
} from '../geometry';
import { POSE_LANDMARK_INDEX, type PoseLandmarkName } from '../landmark-index';

export function reliableLandmark(
  landmarks: readonly PoseLandmark[],
  name: PoseLandmarkName,
): PoseLandmark | null {
  const point = getLandmark(landmarks, POSE_LANDMARK_INDEX[name]);
  return isReliableLandmark(point) ? point : null;
}

export function reliablePoints(
  landmarks: readonly PoseLandmark[],
  names: readonly PoseLandmarkName[],
): Readonly<Record<PoseLandmarkName, PoseLandmark>> | null {
  const entries: [PoseLandmarkName, PoseLandmark][] = [];
  for (const name of names) {
    const point = reliableLandmark(landmarks, name);
    if (!point) return null;
    entries.push([name, point]);
  }
  return Object.fromEntries(entries) as Readonly<
    Record<PoseLandmarkName, PoseLandmark>
  >;
}

export function normalizedDistance(
  first: Point2D,
  second: Point2D,
  scale: number | null,
): number | null {
  return normalizeDistance(distance2D(first, second), scale);
}

export function elbowAngle(
  shoulder: Point2D,
  elbow: Point2D,
  wrist: Point2D,
): number | null {
  return angleDegrees(shoulder, elbow, wrist);
}

export function bodyCenters(landmarks: readonly PoseLandmark[]): {
  readonly shoulderCenter: Point2D;
  readonly hipCenter: Point2D;
  readonly shoulderScale: number;
  readonly torsoScale: number;
} | null {
  const points = reliablePoints(landmarks, [
    'leftShoulder',
    'rightShoulder',
    'leftHip',
    'rightHip',
  ]);
  const shoulderScale = shoulderWidth(landmarks);
  const torsoScale = torsoLength(landmarks);
  if (!points || shoulderScale === null || torsoScale === null) return null;
  const shoulderCenter = midpoint(points.leftShoulder, points.rightShoulder);
  const hipCenter = midpoint(points.leftHip, points.rightHip);
  return shoulderCenter && hipCenter
    ? { shoulderCenter, hipCenter, shoulderScale, torsoScale }
    : null;
}
