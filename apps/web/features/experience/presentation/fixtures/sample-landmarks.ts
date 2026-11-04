import type { ActionId, PoseLandmark } from '@action-quiz/contracts';

type Point = readonly [number, number];
interface SamplePose {
  readonly head: Point;
  readonly leftShoulder: Point;
  readonly rightShoulder: Point;
  readonly leftElbow: Point;
  readonly rightElbow: Point;
  readonly leftWrist: Point;
  readonly rightWrist: Point;
}

export const SAMPLE_SOURCE = { width: 640, height: 480 } as const;

const upright: SamplePose = {
  head: [0.5, 0.23],
  leftShoulder: [0.6, 0.36],
  rightShoulder: [0.4, 0.36],
  leftElbow: [0.65, 0.48],
  rightElbow: [0.35, 0.48],
  leftWrist: [0.66, 0.6],
  rightWrist: [0.34, 0.6],
};

const poses: Record<ActionId, SamplePose> = {
  ACT_01: {
    ...upright,
    leftElbow: [0.7, 0.24],
    rightElbow: [0.3, 0.24],
    leftWrist: [0.78, 0.1],
    rightWrist: [0.22, 0.1],
  },
  ACT_02: {
    ...upright,
    head: [0.63, 0.24],
    leftShoulder: [0.7, 0.4],
    rightShoulder: [0.52, 0.32],
    leftElbow: [0.75, 0.52],
    rightElbow: [0.45, 0.46],
    leftWrist: [0.73, 0.63],
    rightWrist: [0.41, 0.58],
  },
  ACT_03: {
    ...upright,
    head: [0.37, 0.24],
    leftShoulder: [0.48, 0.32],
    rightShoulder: [0.3, 0.4],
    leftElbow: [0.55, 0.46],
    rightElbow: [0.25, 0.52],
    leftWrist: [0.59, 0.58],
    rightWrist: [0.27, 0.63],
  },
  ACT_04: {
    ...upright,
    head: [0.5, 0.29],
    leftElbow: [0.68, 0.19],
    rightElbow: [0.32, 0.19],
    leftWrist: [0.51, 0.1],
    rightWrist: [0.49, 0.1],
  },
  ACT_05: {
    ...upright,
    leftElbow: [0.66, 0.5],
    rightElbow: [0.34, 0.5],
    leftWrist: [0.4, 0.4],
    rightWrist: [0.6, 0.4],
  },
  ACT_06: { ...upright, leftElbow: [0.76, 0.32], leftWrist: [0.56, 0.2] },
  ACT_07: {
    ...upright,
    head: [0.44, 0.28],
    leftElbow: [0.72, 0.24],
    leftWrist: [0.86, 0.12],
    rightElbow: [0.3, 0.36],
    rightWrist: [0.49, 0.26],
  },
  ACT_08: {
    ...upright,
    leftElbow: [0.65, 0.5],
    leftWrist: [0.51, 0.29],
    rightElbow: [0.35, 0.51],
    rightWrist: [0.6, 0.5],
  },
};

function landmark([x, y]: Point): PoseLandmark {
  return Object.freeze({ x, y, z: 0, visibility: 1, presence: 1 });
}

function makeSample(pose: SamplePose): readonly PoseLandmark[] {
  const [hx, hy] = pose.head;
  // Anatomical left is on the image's right before display mirroring.
  const points: readonly Point[] = [
    pose.head,
    [hx + 0.015, hy - 0.015],
    [hx + 0.025, hy - 0.015],
    [hx + 0.035, hy - 0.015],
    [hx - 0.015, hy - 0.015],
    [hx - 0.025, hy - 0.015],
    [hx - 0.035, hy - 0.015],
    [hx + 0.05, hy],
    [hx - 0.05, hy],
    [hx + 0.02, hy + 0.035],
    [hx - 0.02, hy + 0.035],
    pose.leftShoulder,
    pose.rightShoulder,
    pose.leftElbow,
    pose.rightElbow,
    pose.leftWrist,
    pose.rightWrist,
    [pose.leftWrist[0] + 0.014, pose.leftWrist[1] - 0.015],
    [pose.rightWrist[0] - 0.014, pose.rightWrist[1] - 0.015],
    [pose.leftWrist[0], pose.leftWrist[1] - 0.03],
    [pose.rightWrist[0], pose.rightWrist[1] - 0.03],
    [pose.leftWrist[0] - 0.014, pose.leftWrist[1] - 0.005],
    [pose.rightWrist[0] + 0.014, pose.rightWrist[1] - 0.005],
    [0.56, 0.6],
    [0.44, 0.6],
    [0.58, 0.75],
    [0.42, 0.75],
    [0.6, 0.88],
    [0.4, 0.88],
    [0.59, 0.9],
    [0.41, 0.9],
    [0.64, 0.91],
    [0.36, 0.91],
  ];
  return Object.freeze(points.map(landmark));
}

/** Hand-authored illustrations, never emitted as PoseEngine inference results. */
export const SAMPLE_LANDMARKS = Object.freeze({
  ACT_01: makeSample(poses.ACT_01),
  ACT_02: makeSample(poses.ACT_02),
  ACT_03: makeSample(poses.ACT_03),
  ACT_04: makeSample(poses.ACT_04),
  ACT_05: makeSample(poses.ACT_05),
  ACT_06: makeSample(poses.ACT_06),
  ACT_07: makeSample(poses.ACT_07),
  ACT_08: makeSample(poses.ACT_08),
}) satisfies Readonly<Record<ActionId, readonly PoseLandmark[]>>;
