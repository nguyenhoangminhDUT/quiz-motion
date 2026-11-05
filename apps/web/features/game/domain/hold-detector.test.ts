import { describe, expect, it } from 'vitest';
import { createHoldDetector } from './hold-detector';

function createDetector() {
  return createHoldDetector({ maxFrameGapMs: 250 });
}

describe('createHoldDetector', () => {
  it('confirms only after a continuous 1500 ms hold', () => {
    const detector = createDetector();

    for (let time = 0; time <= 1250; time += 250) {
      const result = detector.update('answer-mars', time);

      expect(result.confirmedOptionId).toBeNull();
      expect(result.justConfirmed).toBe(false);
    }

    const before = detector.update('answer-mars', 1499);
    expect(before.holdProgress).toBeCloseTo(1499 / 1500);
    expect(before.justConfirmed).toBe(false);

    expect(detector.update('answer-mars', 1500)).toEqual({
      candidateOptionId: 'answer-mars',
      confirmedOptionId: 'answer-mars',
      holdProgress: 1,
      justConfirmed: true,
    });
  });

  it('resets progress when the candidate changes', () => {
    const detector = createDetector();

    detector.update('answer-mars', 0);
    expect(detector.update('answer-mars', 250).holdProgress).toBeGreaterThan(0);

    expect(detector.update('answer-venus', 500)).toEqual({
      candidateOptionId: 'answer-venus',
      confirmedOptionId: null,
      holdProgress: 0,
      justConfirmed: false,
    });
  });

  it('resets progress on tracking loss', () => {
    const detector = createDetector();

    detector.update('answer-mars', 0);
    detector.update('answer-mars', 250);

    expect(detector.update(null, 500)).toEqual({
      candidateOptionId: null,
      confirmedOptionId: null,
      holdProgress: 0,
      justConfirmed: false,
    });

    expect(detector.update('answer-mars', 750).holdProgress).toBe(0);
  });

  it('starts over after a gap longer than the allowed limit', () => {
    const detector = createDetector();

    detector.update('answer-mars', 0);
    detector.update('answer-mars', 250);

    const result = detector.update('answer-mars', 2000);

    expect(result.holdProgress).toBe(0);
    expect(result.confirmedOptionId).toBeNull();
  });

  it('ignores old and duplicate frames', () => {
    const detector = createDetector();

    detector.update('answer-mars', 0);
    const current = detector.update('answer-mars', 250);

    expect(detector.update(null, 100)).toEqual(current);
    expect(detector.update('answer-venus', 250)).toEqual(current);
  });

  it('confirms once and stays locked until reset', () => {
    const detector = createDetector();

    for (let time = 0; time <= 1500; time += 250) {
      detector.update('answer-mars', time);
    }

    const next = detector.update('answer-mars', 1750);
    expect(next.justConfirmed).toBe(false);
    expect(next.confirmedOptionId).toBe('answer-mars');

    const changed = detector.update('answer-venus', 2000);
    expect(changed.justConfirmed).toBe(false);
    expect(changed.confirmedOptionId).toBe('answer-mars');

    detector.reset();

    expect(detector.update('answer-venus', 2250)).toEqual({
      candidateOptionId: 'answer-venus',
      confirmedOptionId: null,
      holdProgress: 0,
      justConfirmed: false,
    });
  });

  it.each([-1, NaN, Infinity])('rejects invalid timestamp %s', (timestamp) => {
    const detector = createDetector();

    expect(() => detector.update('answer-mars', timestamp)).toThrow(
      'Timestamp must be finite and nonnegative.',
    );
  });

  it('rejects invalid timing configuration', () => {
    expect(() => createHoldDetector({ maxFrameGapMs: 0 })).toThrow();

    expect(() =>
      createHoldDetector({
        holdDurationMs: -1,
        maxFrameGapMs: 250,
      }),
    ).toThrow();
  });
});
