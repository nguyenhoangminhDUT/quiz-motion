import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ExperienceFeedback,
  FeedbackAudio,
  FeedbackCue,
} from '@/features/experience';
import { WebAudioFeedback } from '@/features/experience/infrastructure/audio/web-audio-feedback';

const createAudio = () => new WebAudioFeedback();
// Leave room for the two-note confirmation before a receipt/error replaces it.
const CONFIRMATION_CUE_MS = 300;

export function usePreviewAudio(
  feedback: ExperienceFeedback,
  questionId: string | undefined,
  factory: () => FeedbackAudio = createAudio,
) {
  const audioRef = useRef<FeedbackAudio | null>(null);
  const operationRef = useRef(0);
  const confirmationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingCueRef = useRef<FeedbackCue | null>(null);
  const previousRef = useRef<{
    questionId: string | undefined;
    status: ExperienceFeedback['status'];
    confirmedOptionId: string | null;
  } | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (confirmationTimerRef.current !== null) {
      clearTimeout(confirmationTimerRef.current);
      confirmationTimerRef.current = null;
    }
    pendingCueRef.current = null;
    audioRef.current?.stop();
  }, []);

  useEffect(() => {
    const audio = factory();
    audioRef.current = audio;
    previousRef.current = null;
    return () => {
      stop();
      audioRef.current = null;
      audio.dispose();
    };
  }, [factory, stop]);

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
    // Question changes are resets, never terminal feedback for the new question.
    const audio = audioRef.current;
    if (previous.questionId !== questionId || !audio?.enabled) {
      stop();
      return;
    }
    // A fast submission may batch away intermediate statuses; the locked ID persists.
    const justConfirmed =
      (confirmedOptionId !== null &&
        previous.confirmedOptionId !== confirmedOptionId) ||
      (status === 'confirmed' && previous.status !== 'confirmed');
    if (justConfirmed) {
      stop();
      audio.play('confirmed');
      confirmationTimerRef.current = setTimeout(() => {
        confirmationTimerRef.current = null;
        const pending = pendingCueRef.current;
        pendingCueRef.current = null;
        if (pending && audioRef.current === audio && audio.enabled)
          audio.play(pending);
      }, CONFIRMATION_CUE_MS);
    }
    if (status === 'submitted' || status === 'error') {
      if (confirmationTimerRef.current !== null) pendingCueRef.current = status;
      else {
        stop();
        audio.play(status);
      }
    } else if (
      !justConfirmed &&
      status !== 'confirmed' &&
      !(status === 'submitting' && confirmedOptionId !== null)
    ) {
      stop();
    }
  }, [questionId, status, confirmedOptionId, stop]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    const operation = ++operationRef.current;
    setMessage(null);
    if (audio.enabled) {
      stop();
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
    test: () => {
      stop();
      audioRef.current?.play('confirmed');
    },
    stop,
  };
}
