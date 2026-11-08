import type { ActionId, PoseLandmark } from '@action-quiz/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { ActionSelection } from './classifiers/classifier-types';
import { createYPose } from './classifiers/pose-fixtures.test-helper';
import { LandmarkSmoother } from './landmark-smoother';
import {
  PoseFrameProcessor,
  type MonotonicClock,
  type PoseClassifier,
} from './pose-frame-processor';

function sequenceClock(...timestamps: number[]): MonotonicClock {
  let index = 0;
  return {
    now: () => timestamps[Math.min(index++, timestamps.length - 1)] ?? 0,
  };
}

function classifierSequence(...actions: ActionId[]): PoseClassifier {
  let index = 0;
  return {
    classify: (): ActionSelection => ({
      detectedAction: actions[Math.min(index++, actions.length - 1)] ?? null,
      confidence: 0.9,
    }),
    reset: vi.fn(),
  };
}

describe('PoseFrameProcessor', () => {
  it('classifies a tracking frame after smoothing', () => {
    const processor = new PoseFrameProcessor(sequenceClock(10));
    const frame = processor.processTracking(createYPose());
    expect(frame).toMatchObject({
      timestampMs: 10,
      detectedAction: 'ACT_01',
      trackingStatus: 'tracking',
    });
    expect(frame.landmarks).toHaveLength(33);
    expect(frame.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('does not add a hold timer when the classified action changes', () => {
    const classifier = classifierSequence('ACT_01', 'ACT_08');
    const processor = new PoseFrameProcessor(
      sequenceClock(10, 11),
      new LandmarkSmoother(),
      classifier,
    );
    expect(processor.processTracking(createYPose()).detectedAction).toBe(
      'ACT_01',
    );
    expect(processor.processTracking(createYPose()).detectedAction).toBe(
      'ACT_08',
    );
  });

  it('emits lost immediately and resets smoothing and classifier state', () => {
    const classifier = classifierSequence('ACT_01');
    const smoother = new LandmarkSmoother();
    const resetSpy = vi.spyOn(smoother, 'reset');
    const processor = new PoseFrameProcessor(
      sequenceClock(10, 11),
      smoother,
      classifier,
    );
    processor.processTracking(createYPose());
    const lost = processor.processLost();
    expect(lost).toEqual({
      timestampMs: 11,
      detectedAction: null,
      confidence: 0,
      landmarks: [],
      trackingStatus: 'lost',
    });
    expect(resetSpy).toHaveBeenCalledOnce();
    expect(classifier.reset).toHaveBeenCalledOnce();
  });

  it('uses unavailable for a source that cannot run inference', () => {
    const processor = new PoseFrameProcessor(sequenceClock(5));
    expect(processor.processUnavailable()).toEqual({
      timestampMs: 5,
      detectedAction: null,
      confidence: 0,
      landmarks: [],
      trackingStatus: 'unavailable',
    });
  });

  it('does not carry EMA coordinates across tracking loss', () => {
    const classifier = classifierSequence('ACT_01');
    const processor = new PoseFrameProcessor(
      sequenceClock(1, 2, 3),
      new LandmarkSmoother(),
      classifier,
    );
    processor.processTracking(uniformLandmarks(0.2));
    processor.processLost();
    const recovered = processor.processTracking(uniformLandmarks(0.8));
    expect(recovered.landmarks[0]?.x).toBe(0.8);
  });

  it('keeps timestamps monotonic when the injected clock goes backwards', () => {
    const processor = new PoseFrameProcessor(sequenceClock(10, 8, 12));
    expect(processor.processLost().timestampMs).toBe(10);
    expect(processor.processUnavailable().timestampMs).toBe(10);
    expect(processor.processLost().timestampMs).toBe(12);
  });

  it('does not use an invalid or negative clock reading', () => {
    const processor = new PoseFrameProcessor(sequenceClock(-1, Number.NaN, 2));
    expect(processor.processLost().timestampMs).toBe(0);
    expect(processor.processLost().timestampMs).toBe(0);
    expect(processor.processLost().timestampMs).toBe(2);
  });
});

function uniformLandmarks(x: number): PoseLandmark[] {
  return Array.from({ length: 33 }, () => ({
    x,
    y: 0.5,
    z: 0,
    visibility: 1,
    presence: 1,
  }));
}
