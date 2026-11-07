import type { PoseLandmark } from '@action-quiz/contracts';
import { POSE_LANDMARK_INDEX } from '../landmark-index';

type Point = readonly [number, number];

export function createNeutralPose(): PoseLandmark[] {
  const pose: PoseLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1,
    presence: 1,
  }));
  const set = (name: keyof typeof POSE_LANDMARK_INDEX, point: Point) => {
    pose[POSE_LANDMARK_INDEX[name]] = {
      x: point[0],
      y: point[1],
      z: 0,
      visibility: 1,
      presence: 1,
    };
  };
  set('nose', [0.5, 0.2]);
  set('leftEar', [0.56, 0.22]);
  set('rightEar', [0.44, 0.22]);
  set('mouthLeft', [0.52, 0.25]);
  set('mouthRight', [0.48, 0.25]);
  set('leftShoulder', [0.62, 0.36]);
  set('rightShoulder', [0.38, 0.36]);
  set('leftElbow', [0.66, 0.5]);
  set('rightElbow', [0.34, 0.5]);
  set('leftWrist', [0.67, 0.64]);
  set('rightWrist', [0.33, 0.64]);
  set('leftHip', [0.57, 0.68]);
  set('rightHip', [0.43, 0.68]);
  return pose;
}

export function setPoint(
  pose: PoseLandmark[],
  name: keyof typeof POSE_LANDMARK_INDEX,
  point: Point,
): void {
  pose[POSE_LANDMARK_INDEX[name]] = {
    x: point[0],
    y: point[1],
    z: 0,
    visibility: 1,
    presence: 1,
  };
}

export function createYPose(): PoseLandmark[] {
  const pose = createNeutralPose();
  setPoint(pose, 'leftElbow', [0.72, 0.22]);
  setPoint(pose, 'rightElbow', [0.28, 0.22]);
  setPoint(pose, 'leftWrist', [0.82, 0.06]);
  setPoint(pose, 'rightWrist', [0.18, 0.06]);
  return pose;
}

export function createHeartPose(): PoseLandmark[] {
  const pose = createNeutralPose();
  setPoint(pose, 'leftElbow', [0.72, 0.16]);
  setPoint(pose, 'rightElbow', [0.28, 0.16]);
  setPoint(pose, 'leftWrist', [0.52, 0.06]);
  setPoint(pose, 'rightWrist', [0.48, 0.06]);
  return pose;
}

export function createLeanPose(direction: 'left' | 'right'): PoseLandmark[] {
  const pose = createNeutralPose();
  const offset = direction === 'left' ? 0.11 : -0.11;
  for (const name of [
    'nose',
    'leftEar',
    'rightEar',
    'leftShoulder',
    'rightShoulder',
    'leftElbow',
    'rightElbow',
    'leftWrist',
    'rightWrist',
  ] as const) {
    const index = POSE_LANDMARK_INDEX[name];
    const point = pose[index];
    if (point) setPoint(pose, name, [point.x + offset, point.y]);
  }
  return pose;
}
