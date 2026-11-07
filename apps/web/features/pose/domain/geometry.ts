import type { PoseLandmark } from '@action-quiz/contracts';
import { POSE_LANDMARK_INDEX, type PoseLandmarkIndex } from './landmark-index';

export const MIN_LANDMARK_RELIABILITY = 0.5;

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface Vector2D {
  readonly x: number;
  readonly y: number;
}

function finite(...values: readonly number[]): boolean {
  return values.every(Number.isFinite);
}

export function getLandmark(
  landmarks: readonly PoseLandmark[],
  index: PoseLandmarkIndex,
): PoseLandmark | null {
  const point = landmarks[index];
  return point && finite(point.x, point.y, point.z) ? point : null;
}

export function isReliableLandmark(
  point: PoseLandmark | null | undefined,
  threshold = MIN_LANDMARK_RELIABILITY,
): point is PoseLandmark {
  if (
    !point ||
    !finite(point.x, point.y, point.z, threshold) ||
    threshold < 0 ||
    threshold > 1
  ) {
    return false;
  }
  return (
    (point.visibility === undefined || point.visibility >= threshold) &&
    (point.presence === undefined || point.presence >= threshold)
  );
}

export function distance2D(first: Point2D, second: Point2D): number | null {
  if (!finite(first.x, first.y, second.x, second.y)) return null;
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function distance3D(
  first: PoseLandmark,
  second: PoseLandmark,
): number | null {
  if (!finite(first.x, first.y, first.z, second.x, second.y, second.z))
    return null;
  return Math.hypot(second.x - first.x, second.y - first.y, second.z - first.z);
}

export function midpoint(first: Point2D, second: Point2D): Point2D | null {
  if (!finite(first.x, first.y, second.x, second.y)) return null;
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

export function vector2D(from: Point2D, to: Point2D): Vector2D | null {
  if (!finite(from.x, from.y, to.x, to.y)) return null;
  return { x: to.x - from.x, y: to.y - from.y };
}

export function dot2D(first: Vector2D, second: Vector2D): number | null {
  if (!finite(first.x, first.y, second.x, second.y)) return null;
  return first.x * second.x + first.y * second.y;
}

export function angleDegrees(
  first: Point2D,
  vertex: Point2D,
  third: Point2D,
): number | null {
  const firstVector = vector2D(vertex, first);
  const secondVector = vector2D(vertex, third);
  if (!firstVector || !secondVector) return null;
  const firstLength = Math.hypot(firstVector.x, firstVector.y);
  const secondLength = Math.hypot(secondVector.x, secondVector.y);
  const dot = dot2D(firstVector, secondVector);
  if (dot === null || firstLength === 0 || secondLength === 0) return null;
  const cosine = Math.min(1, Math.max(-1, dot / (firstLength * secondLength)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function reliablePair(
  landmarks: readonly PoseLandmark[],
  firstIndex: PoseLandmarkIndex,
  secondIndex: PoseLandmarkIndex,
): readonly [PoseLandmark, PoseLandmark] | null {
  const first = getLandmark(landmarks, firstIndex);
  const second = getLandmark(landmarks, secondIndex);
  return isReliableLandmark(first) && isReliableLandmark(second)
    ? [first, second]
    : null;
}

export function shoulderWidth(
  landmarks: readonly PoseLandmark[],
): number | null {
  const shoulders = reliablePair(
    landmarks,
    POSE_LANDMARK_INDEX.leftShoulder,
    POSE_LANDMARK_INDEX.rightShoulder,
  );
  if (!shoulders) return null;
  const width = distance2D(shoulders[0], shoulders[1]);
  return width !== null && width > 0 ? width : null;
}

export function torsoLength(landmarks: readonly PoseLandmark[]): number | null {
  const shoulders = reliablePair(
    landmarks,
    POSE_LANDMARK_INDEX.leftShoulder,
    POSE_LANDMARK_INDEX.rightShoulder,
  );
  const hips = reliablePair(
    landmarks,
    POSE_LANDMARK_INDEX.leftHip,
    POSE_LANDMARK_INDEX.rightHip,
  );
  if (!shoulders || !hips) return null;
  const shoulderCenter = midpoint(shoulders[0], shoulders[1]);
  const hipCenter = midpoint(hips[0], hips[1]);
  if (!shoulderCenter || !hipCenter) return null;
  const length = distance2D(shoulderCenter, hipCenter);
  return length !== null && length > 0 ? length : null;
}

export function normalizeDistance(
  distance: number | null,
  bodyScale: number | null,
): number | null {
  if (
    distance === null ||
    bodyScale === null ||
    !finite(distance, bodyScale) ||
    distance < 0 ||
    bodyScale <= 0
  ) {
    return null;
  }
  return distance / bodyScale;
}
