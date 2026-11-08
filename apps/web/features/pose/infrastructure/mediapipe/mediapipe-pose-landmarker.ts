import type { PoseLandmark } from '@action-quiz/contracts';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { POSE_LANDMARK_COUNT } from '../../domain/landmark-index';
import {
  MEDIAPIPE_ASSET_PATHS,
  POSE_LANDMARKER_OPTIONS,
} from './mediapipe-assets';

export interface PoseLandmarkerResultLike {
  readonly landmarks: readonly (readonly NormalizedLandmarkLike[])[];
}

export interface NormalizedLandmarkLike {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly visibility?: number | undefined;
  readonly presence?: number | undefined;
}

export interface PoseLandmarkerLike {
  detectForVideo(
    video: HTMLVideoElement,
    timestampMs: number,
  ): PoseLandmarkerResultLike;
  close(): void;
}

export interface MediaPipeVisionSdk {
  createFileset(wasmRoot: string): Promise<MediaPipeWasmFileset>;
  createPoseLandmarker(
    fileset: MediaPipeWasmFileset,
    options: MediaPipePoseLandmarkerOptions,
  ): Promise<PoseLandmarkerLike>;
}

type MediaPipeWasmFileset = Awaited<
  ReturnType<typeof FilesetResolver.forVisionTasks>
>;

export interface MediaPipePoseLandmarkerOptions {
  readonly baseOptions: {
    readonly modelAssetPath: string;
  };
  readonly runningMode: 'VIDEO';
  readonly numPoses: number;
  readonly minPoseDetectionConfidence: number;
  readonly minPosePresenceConfidence: number;
  readonly minTrackingConfidence: number;
  readonly outputSegmentationMasks: boolean;
}

const BROWSER_MEDIAPIPE_SDK: MediaPipeVisionSdk = {
  createFileset: (wasmRoot) => FilesetResolver.forVisionTasks(wasmRoot),
  createPoseLandmarker: (fileset, options) =>
    PoseLandmarker.createFromOptions(fileset, options),
};

export async function createMediaPipePoseLandmarker(
  sdk: MediaPipeVisionSdk = BROWSER_MEDIAPIPE_SDK,
): Promise<PoseLandmarkerLike> {
  const fileset = await sdk.createFileset(MEDIAPIPE_ASSET_PATHS.wasmRoot);
  return sdk.createPoseLandmarker(fileset, {
    baseOptions: {
      modelAssetPath: MEDIAPIPE_ASSET_PATHS.poseLandmarkerModel,
    },
    ...POSE_LANDMARKER_OPTIONS,
  });
}

export function convertPoseLandmarks(
  result: PoseLandmarkerResultLike,
): readonly PoseLandmark[] | null {
  const pose = result.landmarks[0];
  if (!pose) return null;
  if (pose.length !== POSE_LANDMARK_COUNT) {
    throw new RangeError(
      `Expected ${POSE_LANDMARK_COUNT} MediaPipe landmarks, received ${pose.length}.`,
    );
  }

  return pose.map((landmark) => convertLandmark(landmark));
}

function convertLandmark(landmark: NormalizedLandmarkLike): PoseLandmark {
  if (![landmark.x, landmark.y, landmark.z].every(Number.isFinite)) {
    throw new TypeError('MediaPipe returned a non-finite landmark coordinate.');
  }
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: finiteOptional(landmark.visibility),
    presence: finiteOptional(landmark.presence),
  };
}

function finiteOptional(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value)) {
    throw new TypeError('MediaPipe returned a non-finite landmark confidence.');
  }
  return value;
}
