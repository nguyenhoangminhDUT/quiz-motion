import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveGameView } from './live-game-panel';
import { createLiveGameRuntime } from './live-game-runtime';
import { MockQuizGateway } from '@/features/game/infrastructure/mock/mock-quiz-gateway';

afterEach(() => {
  vi.useRealTimers();
});

describe('live game view', () => {
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
