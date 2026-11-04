import { describe, expect, it, vi } from 'vitest';
import { poseFrameSchema } from '@action-quiz/contracts';
import { MockPoseEngine } from './mock-pose-engine';

describe('MockPoseEngine lifecycle', () => {
  it('emits typed validated events and represents tracking loss', async () => {
    const engine = new MockPoseEngine(() => 125);
    const listener = vi.fn();
    engine.subscribe(listener);
    expect(() => engine.start()).toThrow('Initialize');
    await engine.initialize();
    engine.start();
    engine.emitAction('ACT_08');
    const event = listener.mock.calls[0]?.[0];
    expect(event).toMatchObject({
      type: 'POSE_UPDATED',
      timestampMs: 125,
      payload: {
        frame: { detectedAction: 'ACT_08', trackingStatus: 'tracking' },
      },
    });
    expect(poseFrameSchema.safeParse(event.payload.frame).success).toBe(true);
    engine.emitAction(null);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        payload: {
          frame: {
            timestampMs: 125,
            detectedAction: null,
            confidence: 0,
            landmarks: [],
            trackingStatus: 'lost',
          },
        },
      }),
    );
    engine.dispose();
  });
  it('unsubscribes, stops and clears listeners on disposal', async () => {
    const engine = new MockPoseEngine(() => 1);
    await engine.initialize();
    engine.start();
    const first = vi.fn(),
      second = vi.fn();
    const unsubscribe = engine.subscribe(first);
    engine.subscribe(second);
    unsubscribe();
    unsubscribe();
    engine.emitAction('ACT_01');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    engine.stop();
    expect(() => engine.emitAction('ACT_01')).toThrow('not running');
    engine.start();
    engine.dispose();
    engine.dispose();
    expect(engine.status).toBe('disposed');
    expect(() => engine.subscribe(first)).toThrow('disposed');
    expect(() => engine.emitAction('ACT_01')).toThrow('disposed');
    expect(second).toHaveBeenCalledOnce();
  });
});
