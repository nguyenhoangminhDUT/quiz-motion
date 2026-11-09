import type { PoseLandmark } from '@action-quiz/contracts';

/** Indexed placeholder body for manual input, not an inferred action pose. */
const points: readonly (readonly [number, number])[] = [
  [0.5, 0.23],
  [0.515, 0.215],
  [0.525, 0.215],
  [0.535, 0.215],
  [0.485, 0.215],
  [0.475, 0.215],
  [0.465, 0.215],
  [0.55, 0.23],
  [0.45, 0.23],
  [0.52, 0.265],
  [0.48, 0.265],
  [0.6, 0.36],
  [0.4, 0.36],
  [0.65, 0.48],
  [0.35, 0.48],
  [0.66, 0.6],
  [0.34, 0.6],
  [0.674, 0.615],
  [0.326, 0.615],
  [0.66, 0.63],
  [0.34, 0.63],
  [0.646, 0.605],
  [0.354, 0.605],
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

export const MOCK_LANDMARKS: readonly PoseLandmark[] = Object.freeze(
  points.map(([x, y]): PoseLandmark => ({
    x,
    y,
    z: 0,
    visibility: 1,
    presence: 1,
  })),
);
