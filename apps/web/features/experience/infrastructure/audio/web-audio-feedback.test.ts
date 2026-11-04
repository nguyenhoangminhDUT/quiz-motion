import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebAudioFeedback } from './web-audio-feedback';

class FakeOscillator {
  type = 'sine';
  frequency = { setValueAtTime: vi.fn() };
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  gain = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
}

let resumeGate: Promise<void>;
let contexts: FakeAudioContext[];
class FakeAudioContext {
  state: AudioContextState = 'suspended';
  currentTime = 10;
  destination = {};
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  constructor() {
    contexts.push(this);
  }
  resume = vi.fn(async () => {
    await resumeGate;
    this.state = 'running';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  createOscillator() {
    const node = new FakeOscillator();
    this.oscillators.push(node);
    return node;
  }
  createGain() {
    const node = new FakeGain();
    this.gains.push(node);
    return node;
  }
}

describe('Web Audio feedback resources', () => {
  beforeEach(() => {
    contexts = [];
    resumeGate = Promise.resolve();
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('creates nothing until enabled, schedules soft tones, and stops/disconnects all voices on mute and dispose', async () => {
    const audio = new WebAudioFeedback();
    audio.play('confirmed');
    expect(contexts).toHaveLength(0);
    expect(await audio.enable()).toBe(true);
    const context = contexts[0];
    if (!context) throw new Error('No audio context.');
    audio.play('confirmed');
    expect(context.oscillators).toHaveLength(2);
    expect(
      context.oscillators[0]?.frequency.setValueAtTime,
    ).toHaveBeenCalledWith(523.25, 10);
    expect(context.gains[0]?.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.04,
      10.015,
    );
    const first = context.oscillators[0];
    first?.onended?.();
    expect(first?.disconnect).toHaveBeenCalledOnce();
    audio.mute();
    expect(audio.enabled).toBe(false);
    expect(context.oscillators[1]?.stop).toHaveBeenCalledTimes(2);
    expect(context.gains[1]?.disconnect).toHaveBeenCalledOnce();
    audio.play('error');
    expect(context.oscillators).toHaveLength(2);
    audio.dispose();
    audio.dispose();
    expect(context.close).toHaveBeenCalledOnce();
    expect(await audio.enable()).toBe(false);
  });

  it('does not enable or play after an in-flight resume is disposed', async () => {
    let finish: (() => void) | undefined;
    resumeGate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const audio = new WebAudioFeedback();
    const enabling = audio.enable();
    audio.dispose();
    finish?.();
    expect(await enabling).toBe(false);
    audio.play('submitted');
    expect(contexts[0]?.oscillators).toHaveLength(0);
    expect(contexts[0]?.close).toHaveBeenCalledOnce();
  });

  it('reports unsupported audio without acquiring resources', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const audio = new WebAudioFeedback();
    await expect(audio.enable()).rejects.toThrow('Sound is unavailable');
    expect(audio.enabled).toBe(false);
    expect(contexts).toHaveLength(0);
    audio.dispose();
  });
});
