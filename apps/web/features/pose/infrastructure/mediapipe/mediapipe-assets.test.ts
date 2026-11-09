import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LOCAL_MEDIAPIPE_ASSETS,
  MEDIAPIPE_ASSET_PATHS,
  POSE_LANDMARKER_OPTIONS,
} from './mediapipe-assets';

describe('local MediaPipe assets', () => {
  it.each(LOCAL_MEDIAPIPE_ASSETS)(
    'matches the recorded checksum for $path',
    ({ path, bytes, sha256 }) => {
      const assetPath = resolve(process.cwd(), path);
      expect(statSync(assetPath).size).toBe(bytes);
      expect(
        createHash('sha256').update(readFileSync(assetPath)).digest('hex'),
      ).toBe(sha256);
    },
  );

  it('uses only same-origin runtime paths', () => {
    expect(MEDIAPIPE_ASSET_PATHS.wasmRoot).toBe('/mediapipe/wasm');
    expect(MEDIAPIPE_ASSET_PATHS.poseLandmarkerModel).toBe(
      '/mediapipe/models/pose_landmarker_lite.task',
    );
    expect(JSON.stringify(MEDIAPIPE_ASSET_PATHS)).not.toMatch(/https?:\/\//);
  });

  it('uses the agreed single-pose video configuration', () => {
    expect(POSE_LANDMARKER_OPTIONS).toEqual({
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });
  });
});
