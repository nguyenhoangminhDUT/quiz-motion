import { describe, expect, it } from 'vitest';
import {
  ACTION_IDS,
  poseFrameSchema,
  type PoseLandmark,
} from '@action-quiz/contracts';
import { recordingCanvasContext } from '../../../../tests/recording-canvas';
import { SAMPLE_LANDMARKS } from '../fixtures/sample-landmarks';
import {
  drawSkeleton,
  projectLandmark,
  type SkeletonDrawing,
} from './skeleton-renderer';

const drawing: SkeletonDrawing = {
  width: 640,
  height: 480,
  sourceWidth: 640,
  sourceHeight: 480,
  fit: 'contain',
  mirrored: false,
  trackingStatus: 'tracking',
  landmarks: SAMPLE_LANDMARKS.ACT_01,
  minVisibility: 0.5,
};

describe('skeleton geometry', () => {
  it('aligns normalized points with letterboxing, cropping, resize and display mirroring', () => {
    const point = { x: 0.25, y: 0.25, z: -0.1 };
    expect(projectLandmark(point, drawing)).toEqual({ x: 160, y: 120 });
    expect(
      projectLandmark(point, { ...drawing, width: 1280, height: 960 }),
    ).toEqual({ x: 320, y: 240 });
    expect(projectLandmark(point, { ...drawing, width: 1000 })).toEqual({
      x: 340,
      y: 120,
    });
    expect(
      projectLandmark(point, { ...drawing, width: 1000, mirrored: true }),
    ).toEqual({ x: 660, y: 120 });
    expect(
      projectLandmark(point, { ...drawing, width: 1000, fit: 'cover' }),
    ).toEqual({ x: 250, y: 52.5 });
    expect(point).toEqual({ x: 0.25, y: 0.25, z: -0.1 });
  });

  it('rejects non-finite coordinates and invalid source sizes without clamping out-of-frame points', () => {
    expect(projectLandmark({ x: NaN, y: 0.5, z: 0 }, drawing)).toBeNull();
    expect(
      projectLandmark({ x: 0.5, y: 0.5, z: Infinity }, drawing),
    ).toBeNull();
    expect(
      projectLandmark({ x: 0.5, y: 0.5, z: 0 }, { ...drawing, sourceWidth: 0 }),
    ).toBeNull();
    expect(projectLandmark({ x: -0.1, y: 1.1, z: 0 }, drawing)).toEqual({
      x: -64,
      y: 528,
    });
  });

  it('clips to the source image so out-of-frame joints cannot appear in letterbox bars', () => {
    const context = recordingCanvasContext();
    drawSkeleton(context, {
      ...drawing,
      width: 1000,
      landmarks: [{ x: -0.1, y: 0.5, z: 0 }],
    });
    expect(context.rect).toHaveBeenCalledExactlyOnceWith(180, 0, 640, 480);
    expect(context.arc).toHaveBeenCalledExactlyOnceWith(
      116,
      240,
      4,
      0,
      Math.PI * 2,
    );
  });

  it('keeps landmark indices when joints are hidden, non-finite or absent', () => {
    const context = recordingCanvasContext();
    const landmarks: PoseLandmark[] = Array.from({ length: 17 }, () => ({
      x: 0,
      y: 0,
      z: 0,
      visibility: 0,
    }));
    landmarks[11] = { x: 0.4, y: 0.3, z: 0 };
    landmarks[12] = { x: 0.6, y: 0.3, z: 0 };
    landmarks[13] = { x: 0.8, y: 0.5, z: 0, visibility: 0.1 };
    landmarks[14] = { x: NaN, y: 0.5, z: 0 };
    landmarks[15] = { x: 0.9, y: 0.7, z: 0, presence: 0.1 };
    drawSkeleton(context, { ...drawing, landmarks });
    expect(context.arc).toHaveBeenCalledTimes(2);
    expect(context.moveTo).toHaveBeenCalledExactlyOnceWith(256, 144);
    expect(context.lineTo).toHaveBeenCalledExactlyOnceWith(384, 144);
    expect(context.clip).toHaveBeenCalledOnce();
    expect(context.restore).toHaveBeenCalledOnce();
  });

  it.each(['lost', 'unavailable'] as const)(
    'clears stale drawing on %s tracking, even when old landmarks remain',
    (trackingStatus) => {
      const context = recordingCanvasContext();
      drawSkeleton(context, { ...drawing, trackingStatus });
      expect(context.clearRect).toHaveBeenCalledExactlyOnceWith(0, 0, 640, 480);
      expect(context.arc).not.toHaveBeenCalled();
      expect(context.lineTo).not.toHaveBeenCalled();
    },
  );

  it('handles empty input and validates every hand-authored pose against the shared schema', () => {
    const emptyContext = recordingCanvasContext();
    drawSkeleton(emptyContext, { ...drawing, landmarks: [] });
    expect(emptyContext.arc).not.toHaveBeenCalled();
    expect(emptyContext.lineTo).not.toHaveBeenCalled();

    for (const actionId of ACTION_IDS) {
      const landmarks = SAMPLE_LANDMARKS[actionId];
      expect(landmarks).toHaveLength(33);
      expect(
        poseFrameSchema.safeParse({
          timestampMs: 0,
          detectedAction: actionId,
          confidence: 1,
          trackingStatus: 'tracking',
          landmarks,
        }).success,
      ).toBe(true);
      const context = recordingCanvasContext();
      drawSkeleton(context, { ...drawing, landmarks });
      expect(context.arc).toHaveBeenCalledTimes(33);
      expect(context.lineTo).toHaveBeenCalledTimes(35);
    }
  });
});
