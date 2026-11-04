import type {
  FeedbackAudio,
  FeedbackCue,
} from '../../application/ports/feedback-audio';

const NOTES: Record<FeedbackCue, readonly number[]> = {
  confirmed: [523.25, 659.25],
  submitted: [659.25, 783.99, 1046.5],
  error: [220, 164.81],
};

/** Lazy, user-enabled tones; no downloads, microphone access, or autoplay. */
export class WebAudioFeedback implements FeedbackAudio {
  private context: AudioContext | null = null;
  private voices = new Set<{ oscillator: OscillatorNode; gain: GainNode }>();
  private isEnabled = false;
  private disposed = false;
  private generation = 0;

  get enabled() {
    return this.isEnabled;
  }

  async enable(): Promise<boolean> {
    if (this.disposed) return false;
    const generation = ++this.generation;
    if (typeof AudioContext === 'undefined')
      throw new Error(
        'Sound is unavailable in this browser. You can continue with visual feedback.',
      );
    this.context ??= new AudioContext();
    if (this.context.state !== 'running') await this.context.resume();
    if (this.disposed || generation !== this.generation) return false;
    if (this.context.state !== 'running')
      throw new Error('Sound could not start. Try enabling it again.');
    this.isEnabled = true;
    return true;
  }

  play(cue: FeedbackCue): void {
    const context = this.context;
    if (
      !this.isEnabled ||
      this.disposed ||
      !context ||
      context.state !== 'running'
    )
      return;
    this.stop();
    try {
      NOTES[cue].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const voice = { oscillator, gain };
        this.voices.add(voice);
        const start = context.currentTime + index * 0.13;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.04, start + 0.015);
        gain.gain.linearRampToValueAtTime(0, start + 0.12);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
          this.voices.delete(voice);
        };
        oscillator.start(start);
        oscillator.stop(start + 0.13);
      });
    } catch {
      // A device failure must not interrupt the visual experience.
      this.stop();
    }
  }

  stop(): void {
    for (const { oscillator, gain } of this.voices) {
      oscillator.onended = null;
      try {
        oscillator.stop();
      } catch {
        /* It may have already ended. */
      }
      oscillator.disconnect();
      gain.disconnect();
    }
    this.voices.clear();
  }

  mute(): void {
    this.generation++;
    this.isEnabled = false;
    this.stop();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mute();
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed')
      void context.close().catch(() => {});
  }
}
