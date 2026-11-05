import { describe, expect, it, vi } from 'vitest';
import { createLiveGameRuntime } from './live-game-runtime';
import { MockQuizGateway } from '@/features/game/infrastructure/mock/mock-quiz-gateway';

describe('live game runtime', () => {
  it('resets on frame silence, rejects late frames and can complete a fresh hold', async () => {
    let time = 0;
    const gateway = new MockQuizGateway();
    const submit = vi.spyOn(gateway, 'submitAnswer');
    const runtime = createLiveGameRuntime(
      () => time,
      gateway,
      () => 0,
    );
    await runtime.initialize();
    runtime.setAction('ACT_02');
    time = 200;
    runtime.tick();
    expect(runtime.session.getState().holdProgress).toBeGreaterThan(0);
    runtime.pauseFrames();
    time = 450;
    runtime.tick();
    expect(runtime.session.getState().status).toBe('HOLDING');
    time = 451;
    runtime.tick();
    expect(runtime.session.getState()).toMatchObject({
      status: 'DETECTING',
      holdProgress: 0,
      candidateOptionId: null,
    });
    time = 500;
    runtime.setAction('ACT_02');
    for (time = 550; time <= 2000; time += 50) runtime.tick();
    await Promise.resolve();
    expect(runtime.session.getState().status).toBe('SUBMITTED');
    expect(submit).toHaveBeenCalledTimes(1);
    runtime.tick();
    expect(runtime.session.getState().status).toBe('SUBMITTED');
    runtime.nextQuestion();
    expect(runtime.session.getState().status).toBe('READY');
    expect(runtime.getAction()).toBeNull();
    runtime.dispose();
    runtime.tick();
    expect(runtime.session.getState().status).toBe('IDLE');
  });

  it('keeps mapping stable during frames and stops work after dispose', async () => {
    let time = 0;
    const runtime = createLiveGameRuntime(
      () => time,
      new MockQuizGateway(),
      () => 0,
    );
    await runtime.initialize();
    const mapping = runtime.session.getState().actionConfig;
    runtime.setAction('ACT_02');
    time = 100;
    runtime.tick();
    expect(runtime.session.getState().actionConfig).toBe(mapping);
    runtime.dispose();
    runtime.setAction('ACT_02');
    runtime.tick();
    expect(runtime.session.getState().status).toBe('IDLE');
  });
});
