import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveGameView } from './live-game-panel';
import { createLiveGameRuntime } from './live-game-runtime';
import { MockQuizGateway } from '@/features/game/infrastructure/mock/mock-quiz-gateway';
import { WebAudioFeedback } from '@/features/experience/infrastructure/audio/web-audio-feedback';

afterEach(() => {
  vi.useRealTimers();
});

describe('live game view', () => {
  it('keeps a new pointer hold when the previous button blurs or releases', async () => {
    let time = 0;
    const runtime = createLiveGameRuntime(
      () => ++time,
      new MockQuizGateway(),
      () => 0,
    );
    await runtime.initialize();
    const { unmount } = render(<LiveGameView runtime={runtime} />);
    const first = screen.getByRole('button', { name: 'Hold 1 Y-Pose' });
    const second = screen.getByRole('button', { name: 'Hold 2 Lean Left' });
    Object.defineProperty(second, 'setPointerCapture', { value: vi.fn() });
    act(() => first.focus());
    // Native pointerdown precedes focus moving to the newly pressed button.
    fireEvent.pointerDown(second, { pointerId: 1 });
    act(() => second.focus());
    fireEvent.pointerUp(first);
    fireEvent.pointerCancel(first);
    fireEvent.lostPointerCapture(first);
    fireEvent.keyUp(first, { key: ' ' });
    expect(runtime.getAction()).toBe('ACT_02');
    fireEvent.pointerUp(second);
    expect(runtime.getAction()).toBeNull();
    fireEvent.keyDown(second, { key: 'Enter' });
    expect(runtime.getAction()).toBe('ACT_02');
    act(() => second.blur());
    expect(runtime.getAction()).toBeNull();
    unmount();
    runtime.dispose();
  });

  it.each(['success', 'failure'] as const)(
    'plays confirmation once before a fast submission %s cue',
    async (outcome) => {
      vi.useFakeTimers();
      let enabled = false;
      vi.spyOn(WebAudioFeedback.prototype, 'enabled', 'get').mockImplementation(
        () => enabled,
      );
      vi.spyOn(WebAudioFeedback.prototype, 'enable').mockImplementation(
        async () => {
          enabled = true;
          return true;
        },
      );
      const play = vi
        .spyOn(WebAudioFeedback.prototype, 'play')
        .mockImplementation(() => {});
      const gateway = new MockQuizGateway();
      if (outcome === 'failure')
        vi.spyOn(gateway, 'submitAnswer').mockRejectedValue(
          new Error('Offline'),
        );
      const runtime = createLiveGameRuntime(
        () => performance.now(),
        gateway,
        () => 0,
      );
      await runtime.initialize();
      const { unmount, rerender } = render(<LiveGameView runtime={runtime} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Sound feedback' }));
      });
      fireEvent.keyDown(window, { key: '2' });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      expect(screen.getByTestId('live-game-status')).toHaveTextContent(
        outcome === 'success' ? 'SUBMITTED' : 'ERROR',
      );
      expect(play.mock.calls).toEqual([['confirmed']]);
      rerender(<LiveGameView runtime={runtime} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(play.mock.calls).toEqual([
        ['confirmed'],
        [outcome === 'success' ? 'submitted' : 'error'],
      ]);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
      runtime.dispose();
    },
  );

  it('drives visible progress from held keys, resets on release, submits and cleans up', async () => {
    vi.useFakeTimers();
    const runtime = createLiveGameRuntime(
      () => performance.now(),
      new MockQuizGateway(),
      () => 0,
    );
    await runtime.initialize();
    const { unmount } = render(<LiveGameView runtime={runtime} />);
    fireEvent.keyDown(window, { key: '2' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(screen.getByLabelText('Hold progress')).toHaveValue(500 / 1500);
    fireEvent.keyUp(window, { key: '2' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(screen.getByLabelText('Hold progress')).toHaveValue(0);
    fireEvent.keyDown(window, { key: '2' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1550);
    });
    expect(screen.getByTestId('live-game-status')).toHaveTextContent(
      'SUBMITTED',
    );
    expect(screen.getByText('Answer sent')).toBeInTheDocument();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    runtime.dispose();
  });
});
