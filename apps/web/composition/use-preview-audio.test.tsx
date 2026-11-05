import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ExperienceFeedback, FeedbackAudio } from '@/features/experience';
import { usePreviewAudio } from './use-preview-audio';

afterEach(() => vi.useRealTimers());

function fakeAudio() {
  let enabled = false;
  return {
    get enabled() {
      return enabled;
    },
    enable: vi.fn(async () => {
      enabled = true;
      return true;
    }),
    play: vi.fn(),
    stop: vi.fn(),
    mute: vi.fn(() => {
      enabled = false;
    }),
    dispose: vi.fn(),
  } satisfies FeedbackAudio;
}

const ready: ExperienceFeedback = {
  status: 'ready',
  candidateOptionId: null,
  confirmedOptionId: null,
  error: null,
};
const confirmed: ExperienceFeedback = {
  ...ready,
  status: 'confirmed',
  candidateOptionId: 'answer',
  confirmedOptionId: 'answer',
};

it.each(['reset', 'question', 'mute', 'stop', 'unmount'] as const)(
  'cancels a queued receipt on %s without replaying confirmation',
  async (reason) => {
    vi.useFakeTimers();
    const audio = fakeAudio();
    const factory = () => audio;
    const { result, rerender, unmount } = renderHook(
      ({ feedback, questionId }) =>
        usePreviewAudio(feedback, questionId, factory),
      { initialProps: { feedback: ready, questionId: 'question-1' } },
    );
    await act(async () => {
      await result.current.toggle();
    });
    const submitted: ExperienceFeedback = { ...confirmed, status: 'submitted' };
    rerender({ feedback: submitted, questionId: 'question-1' });
    rerender({ feedback: { ...submitted }, questionId: 'question-1' });
    expect(audio.play).toHaveBeenCalledExactlyOnceWith('confirmed');
    if (reason === 'reset')
      rerender({ feedback: ready, questionId: 'question-1' });
    else if (reason === 'question')
      rerender({ feedback: submitted, questionId: 'question-2' });
    else if (reason === 'mute') {
      await act(async () => {
        await result.current.toggle();
      });
    } else if (reason === 'stop') act(() => result.current.stop());
    else unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(audio.play).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    if (reason !== 'unmount') unmount();
    expect(audio.dispose).toHaveBeenCalledOnce();
  },
);

it('lets confirmation finish when the receipt arrives in a separate render', async () => {
  vi.useFakeTimers();
  const audio = fakeAudio();
  const factory = () => audio;
  const { result, rerender, unmount } = renderHook(
    ({ feedback }) => usePreviewAudio(feedback, 'question-1', factory),
    { initialProps: { feedback: ready } },
  );
  await act(async () => {
    await result.current.toggle();
  });
  rerender({ feedback: { ...confirmed, status: 'submitting' } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
  const stops = audio.stop.mock.calls.length;
  rerender({ feedback: { ...confirmed, status: 'submitted' } });
  expect(audio.stop).toHaveBeenCalledTimes(stops);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(199);
  });
  expect(audio.play).toHaveBeenCalledExactlyOnceWith('confirmed');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(audio.play.mock.calls).toEqual([['confirmed'], ['submitted']]);
  unmount();
});

it('plays once per transition after opt-in, never replays on enable or question change, and disposes StrictMode instances', async () => {
  const instances: ReturnType<typeof fakeAudio>[] = [];
  const factory = () => {
    const audio = fakeAudio();
    instances.push(audio);
    return audio;
  };
  const { result, rerender, unmount } = renderHook(
    ({ feedback, questionId }) =>
      usePreviewAudio(feedback, questionId, factory),
    {
      initialProps: { feedback: ready, questionId: 'question-1' },
      wrapper: StrictMode,
    },
  );
  expect(instances).toHaveLength(2);
  expect(instances[0]?.dispose).toHaveBeenCalledOnce();
  const audio = instances.at(-1);
  if (!audio) throw new Error('Missing active audio adapter.');
  rerender({ feedback: confirmed, questionId: 'question-1' });
  expect(audio.play).not.toHaveBeenCalled();
  await act(async () => {
    await result.current.toggle();
  });
  expect(result.current.enabled).toBe(true);
  expect(audio.play).not.toHaveBeenCalled();
  rerender({ feedback: ready, questionId: 'question-1' });
  rerender({ feedback: confirmed, questionId: 'question-1' });
  expect(audio.play).toHaveBeenCalledExactlyOnceWith('confirmed');
  rerender({ feedback: { ...confirmed }, questionId: 'question-1' });
  expect(audio.play).toHaveBeenCalledOnce();
  rerender({ feedback: confirmed, questionId: 'question-2' });
  expect(audio.play).toHaveBeenCalledOnce();
  rerender({
    feedback: { ...confirmed, status: 'submitted' },
    questionId: 'question-2',
  });
  expect(audio.play).toHaveBeenLastCalledWith('submitted');
  await act(async () => {
    await result.current.toggle();
  });
  expect(result.current.enabled).toBe(false);
  expect(audio.mute).toHaveBeenCalledOnce();
  rerender({
    feedback: { ...ready, status: 'error', error: 'Try again.' },
    questionId: 'question-2',
  });
  expect(audio.play).toHaveBeenCalledTimes(2);
  unmount();
  expect(audio.dispose).toHaveBeenCalledOnce();
});

it('keeps visual feedback usable after audio enable fails and ignores late completion after unmount', async () => {
  const audio = fakeAudio();
  audio.enable.mockRejectedValueOnce(new Error('Audio is blocked.'));
  const factory = () => audio;
  const { result, unmount } = renderHook(() =>
    usePreviewAudio(ready, 'question', factory),
  );
  await act(async () => {
    await result.current.toggle();
  });
  expect(result.current.message).toBe('Audio is blocked.');
  expect(result.current.pending).toBe(false);
  expect(result.current.enabled).toBe(false);
  let finish: ((value: boolean) => void) | undefined;
  audio.enable.mockImplementationOnce(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
  );
  let enabling: Promise<void> | undefined;
  act(() => {
    enabling = result.current.toggle();
  });
  expect(result.current.pending).toBe(true);
  unmount();
  await act(async () => {
    finish?.(true);
    await enabling;
  });
  expect(audio.dispose).toHaveBeenCalledOnce();
  expect(audio.play).not.toHaveBeenCalled();
});

it('ignores an older enable result when a newer request has already completed', async () => {
  const audio = fakeAudio();
  let finishFirst: ((value: boolean) => void) | undefined;
  let finishSecond: ((value: boolean) => void) | undefined;
  audio.enable.mockImplementationOnce(
    () =>
      new Promise<boolean>((resolve) => {
        finishFirst = resolve;
      }),
  );
  audio.enable.mockImplementationOnce(
    () =>
      new Promise<boolean>((resolve) => {
        finishSecond = resolve;
      }),
  );
  const factory = () => audio;
  const { result } = renderHook(() =>
    usePreviewAudio(ready, 'question', factory),
  );
  let first: Promise<void> | undefined;
  let second: Promise<void> | undefined;
  act(() => {
    first = result.current.toggle();
    second = result.current.toggle();
  });
  await act(async () => {
    finishSecond?.(true);
    await second;
  });
  expect(result.current.enabled).toBe(true);
  await act(async () => {
    finishFirst?.(false);
    await first;
  });
  expect(result.current.enabled).toBe(true);
  expect(result.current.pending).toBe(false);
});
