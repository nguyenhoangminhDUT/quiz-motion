import { useEffect, useRef, useState } from 'react';
import type {
  ExperienceFeedback,
  FeedbackAudio,
  FeedbackCue,
} from '@/features/experience';
import { WebAudioFeedback } from '@/features/experience/infrastructure/audio/web-audio-feedback';

const createAudio = () => new WebAudioFeedback();

export function usePreviewAudio(
  feedback: ExperienceFeedback,
  questionId: string | undefined,
  factory: () => FeedbackAudio = createAudio,
) {
  const audioRef = useRef<FeedbackAudio | null>(null);
  const operationRef = useRef(0);
  const previousRef = useRef<{
    questionId: string | undefined;
    status: ExperienceFeedback['status'];
    confirmedOptionId: string | null;
  } | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const audio = factory();
    audioRef.current = audio;
    return () => {
      audioRef.current = null;
      audio.dispose();
    };
  }, [factory]);

  const { status, confirmedOptionId } = feedback;
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = { questionId, status, confirmedOptionId };
    if (
      !previous ||
      (previous.questionId === questionId &&
        previous.status === status &&
        previous.confirmedOptionId === confirmedOptionId)
    )
      return;
    audioRef.current?.stop();
    // Question changes are resets, never terminal feedback for the new question.
    if (previous.questionId !== questionId) return;
    const cue: FeedbackCue | null =
      status === 'confirmed' || status === 'submitted' || status === 'error'
        ? status
        : null;
    if (cue && audioRef.current?.enabled) audioRef.current.play(cue);
  }, [questionId, status, confirmedOptionId]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    const operation = ++operationRef.current;
    setMessage(null);
    if (audio.enabled) {
      audio.mute();
      setEnabled(false);
      return;
    }
    setPending(true);
    try {
      const started = await audio.enable();
      if (audioRef.current === audio && operationRef.current === operation)
        setEnabled(started);
    } catch (cause: unknown) {
      if (audioRef.current === audio && operationRef.current === operation) {
        audio.mute();
        setEnabled(false);
        setMessage(
          cause instanceof Error
            ? cause.message
            : 'Sound could not start. Visual feedback is still available.',
        );
      }
    } finally {
      if (audioRef.current === audio && operationRef.current === operation)
        setPending(false);
    }
  }

  return {
    enabled,
    pending,
    message,
    toggle,
    test: () => audioRef.current?.play('confirmed'),
    stop: () => audioRef.current?.stop(),
  };
}
