import type { PoseLandmark } from '@action-quiz/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  convertPoseLandmarks,
  createMediaPipePoseLandmarker,
  type MediaPipeVisionSdk,
  type NormalizedLandmarkLike,
  type PoseLandmarkerLike,
} from './mediapipe-pose-landmarker';

function sdkLandmarks(count = 33): NormalizedLandmarkLike[] {
  return Array.from({ length: count }, (_, index) => ({
    x: index / 100,
    y: index / 200,
    z: index === 0 ? 0 : -index / 300,
    visibility: 0.9,
    presence: index === 0 ? undefined : 0.8,
  }));
}

describe('MediaPipe pose landmarker adapter', () => {
  it('initializes the SDK from local assets with the agreed options', async () => {
    const landmarker: PoseLandmarkerLike = {
      detectForVideo: vi.fn(),
      close: vi.fn(),
    };
    const fileset = {} as Awaited<
      ReturnType<MediaPipeVisionSdk['createFileset']>
    >;
    const sdk: MediaPipeVisionSdk = {
      createFileset: vi.fn().mockResolvedValue(fileset),
      createPoseLandmarker: vi.fn().mockResolvedValue(landmarker),
    };

    await expect(createMediaPipePoseLandmarker(sdk)).resolves.toBe(landmarker);
    expect(sdk.createFileset).toHaveBeenCalledWith('/mediapipe/wasm');
    expect(sdk.createPoseLandmarker).toHaveBeenCalledWith(fileset, {
      baseOptions: {
        modelAssetPath: '/mediapipe/models/pose_landmarker_lite.task',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });
  });

  it('converts all 33 landmarks without mirroring or compacting indices', () => {
    const source = sdkLandmarks();
    const converted = convertPoseLandmarks({ landmarks: [source] });
    expect(converted).toHaveLength(33);
    expect(converted?.[0]).toEqual({
      x: 0,
      y: 0,
      z: 0,
      visibility: 0.9,
      presence: undefined,
    });
    expect(converted?.[32]).toEqual<PoseLandmark>({
      x: 0.32,
      y: 0.16,
      z: -32 / 300,
      visibility: 0.9,
      presence: 0.8,
    });
  });

  it('returns null when MediaPipe does not detect a pose', () => {
    expect(convertPoseLandmarks({ landmarks: [] })).toBeNull();
  });

  it('rejects an incomplete or non-finite result', () => {
    expect(() =>
      convertPoseLandmarks({ landmarks: [sdkLandmarks(32)] }),
    ).toThrow('Expected 33');
    const invalid = sdkLandmarks();
    invalid[5] = { ...invalid[5]!, x: Number.NaN };
    expect(() => convertPoseLandmarks({ landmarks: [invalid] })).toThrow(
      'non-finite landmark coordinate',
    );
  });
});
