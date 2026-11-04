import { StrictMode } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createPlayground } from './create-playground';
import { PlaygroundView } from './playground-view';
import { PlaygroundClient } from './playground-client';

describe('development playground integration', () => {
  it('uses one event pathway for buttons and keyboard, resets tracking on question change and never submits', async () => {
    const runtime = createPlayground(() => 123);
    await runtime.initialize();
    const { unmount } = render(<PlaygroundView runtime={runtime} />);
    expect(
      screen.getByText('Which planet is known as the Red Planet?'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Hold progress')).toHaveValue(0);
    const mapping = runtime.gameStore.getState().actionConfig;
    fireEvent.click(screen.getByRole('button', { name: /1 Y-Pose/ }));
    expect(screen.getByTestId('last-action')).toHaveTextContent('ACT_01');
    expect(screen.getByText('POSE_UPDATED')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: '8' });
    expect(screen.getByTestId('last-action')).toHaveTextContent('ACT_08');
    expect(runtime.gameStore.getState().actionConfig).toBe(mapping);
    expect(runtime.gameStore.getState()).toMatchObject({
      status: 'READY',
      candidateOptionId: null,
      confirmedOptionId: null,
      holdProgress: 0,
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Simulate tracking loss' }),
    );
    expect(screen.getByTestId('last-action')).toHaveTextContent('None');
    fireEvent.click(screen.getByRole('button', { name: /Load next/ }));
    expect(
      screen.getByText('Which is the largest ocean on Earth?'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('last-action')).toHaveTextContent('None');
    fireEvent.click(screen.getByRole('button', { name: /Load next/ }));
    expect(runtime.gameStore.getState().actionConfig).toBe(mapping);
    const emit = vi.spyOn(runtime, 'emitAction');
    unmount();
    fireEvent.keyDown(window, { key: '1' });
    expect(emit).not.toHaveBeenCalled();
    runtime.dispose();
    expect(runtime.poseEngine.status).toBe('disposed');
  });
  it('handles StrictMode mount cleanup and receives mock events after remount', async () => {
    const { unmount } = render(
      <StrictMode>
        <PlaygroundClient />
      </StrictMode>,
    );
    // Flush async adapter initialization before querying the mounted view.
    await act(async () => {
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /1 Y-Pose/ }),
      ).toBeInTheDocument(),
    );
    fireEvent.keyDown(window, { key: '2' });
    expect(screen.getByTestId('last-action')).toHaveTextContent('ACT_02');
    unmount();
  });
  it('ignores shortcuts in editable fields and after disposal during initialization', async () => {
    const runtime = createPlayground(() => 50);
    const pending = runtime.initialize();
    runtime.dispose();
    await expect(pending).resolves.toBeNull();
    const active = createPlayground(() => 51);
    await active.initialize();
    const { unmount } = render(
      <>
        <input aria-label="Example field" />
        <PlaygroundView runtime={active} />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText('Example field'), { key: '1' });
    expect(screen.getByTestId('last-action')).toHaveTextContent('None');
    act(() => active.emitAction('ACT_03'));
    expect(screen.getByTestId('last-action')).toHaveTextContent('ACT_03');
    unmount();
    active.dispose();
  });
});
