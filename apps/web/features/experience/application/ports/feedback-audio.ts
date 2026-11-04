export type FeedbackCue = 'confirmed' | 'submitted' | 'error';

export interface FeedbackAudio {
  readonly enabled: boolean;
  enable(): Promise<boolean>;
  play(cue: FeedbackCue): void;
  stop(): void;
  mute(): void;
  dispose(): void;
}
