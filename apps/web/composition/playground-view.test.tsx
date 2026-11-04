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
import { MockQuizGateway } from '@/features/game/infrastructure/mock/mock-quiz-gateway';

describe('development playground integration', () => {
  it('previews progress and terminal feedback without running hold detection or submitting an answer', async () => {
    const submit = vi.spyOn(MockQuizGateway.prototype, 'submitAnswer');
    const runtime = createPlayground(() => 123);
    await runtime.initialize();
    const { unmount } = render(<PlaygroundView runtime={runtime} />);
    const progress = screen.getByRole('slider', {
      name: 'Preview hold progress',
    });
    const status = screen.getByRole('combobox', { name: 'Preview game state' });
    expect(progress).toBeDisabled();
    fireEvent.change(status, { target: { value: 'confirmed' } });
    expect(screen.queryByText('Answer confirmed')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /1 Y-Pose/ }));
    expect(progress).toBeEnabled();
    fireEvent.change(progress, { target: { value: '100' } });
    expect(screen.getByLabelText('Hold progress')).toHaveValue(1);
    expect(screen.getByText('Keep holding')).toBeInTheDocument();
    expect(screen.queryByText('Answer confirmed')).not.toBeInTheDocument();
    fireEvent.change(status, { target: { value: 'confirmed' } });
    expect(screen.getByText('Answer confirmed')).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: 'Option A: Venus' }),
    ).toHaveAttribute('data-confirmed', 'true');
    fireEvent.change(status, { target: { value: 'submitting' } });
    expect(screen.getByText('Sending your answer')).toBeInTheDocument();
    fireEvent.change(status, { target: { value: 'submitted' } });
    expect(screen.getByText('Answer sent')).toBeInTheDocument();
    fireEvent.change(status, { target: { value: 'error' } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The answer could not be sent.',
    );
    fireEvent.click(screen.getByRole('button', { name: /2 Lean Left/ }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Hold progress')).toHaveValue(0);
    fireEvent.change(progress, { target: { value: '60' } });
    fireEvent.keyDown(progress, { key: '2' });
    expect(screen.getByTestId('last-action')).toHaveTextContent('ACT_02');
    expect(screen.getByLabelText('Hold progress')).toHaveValue(0.6);
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Tracking preview' }),
      { target: { value: 'lost' } },
    );
    expect(progress).toBeDisabled();
    expect(screen.getByLabelText('Hold progress')).toHaveValue(0);
    expect(screen.queryByText('Candidate')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /1 Y-Pose/ }));
    fireEvent.change(status, { target: { value: 'confirmed' } });
    fireEvent.click(screen.getByRole('button', { name: /Load next/ }));
    expect(screen.queryByText('Answer confirmed')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Hold progress')).toHaveValue(0);
    expect(status).toHaveValue('ready');
    expect(runtime.gameStore.getState()).toMatchObject({
      status: 'READY',
      candidateOptionId: null,
      confirmedOptionId: null,
      holdProgress: 0,
    });
    expect(submit).not.toHaveBeenCalled();
    unmount();
    runtime.dispose();
  });

  it('shows camera and tracking failures without opening a real device, and resets the preview', async () => {
    const runtime = createPlayground(() => 123);
    await runtime.initialize();
    const { unmount } = render(<PlaygroundView runtime={runtime} />);
    const camera = screen.getByRole('combobox', { name: 'Camera preview' });
    const cases = [
      ['loading', 'Getting the camera ready'],
      ['denied', 'Camera access is blocked'],
      ['unavailable', 'No camera found'],
      ['error', 'Camera could not start'],
    ] as const;
    for (const [value, message] of cases) {
      fireEvent.change(camera, { target: { value } });
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(
        screen.queryByRole('img', { name: /Sample pose:/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('slider', { name: 'Preview hold progress' }),
      ).toBeDisabled();
    }
    fireEvent.click(screen.getByRole('button', { name: /1 Y-Pose/ }));
    expect(camera).toHaveValue('sample');
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Tracking preview' }),
      { target: { value: 'unavailable' } },
    );
    expect(
      screen.getByRole('img', { name: /Sample tracking unavailable/ }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset experience preview' }),
    );
    expect(
      screen.getByRole('img', { name: 'Sample pose: Y-Pose' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('last-action')).toHaveTextContent('None');
    expect(
      screen.getByRole('button', { name: 'Sound feedback' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Test sound' })).toBeDisabled();
    unmount();
    runtime.dispose();
  });

  it('uses one event pathway for buttons and keyboard, resets tracking on question change and never submits', async () => {
    const runtime = createPlayground(() => 123);
    await runtime.initialize();
    const { unmount } = render(<PlaygroundView runtime={runtime} />);
    expect(
      screen.getByText('Which planet is known as the Red Planet?'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Hold progress')).toHaveValue(0);
    expect(
      screen.getByRole('img', { name: 'Sample pose: Y-Pose' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Mirror preview' }),
    ).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Upper body only' }));
    expect(
      screen.getByRole('checkbox', { name: 'Upper body only' }),
    ).toBeChecked();
    const mapping = runtime.gameStore.getState().actionConfig;
    fireEvent.click(screen.getByRole('button', { name: /1 Y-Pose/ }));
    expect(screen.getByTestId('last-action')).toHaveTextContent('ACT_01');
    expect(screen.getByText('POSE_UPDATED')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: '8' });
    expect(screen.getByTestId('last-action')).toHaveTextContent('ACT_08');
    expect(
      screen.getByRole('img', { name: 'Sample pose: Thinking' }),
    ).toBeInTheDocument();
    expect(runtime.poseEngine).toHaveProperty('provider', 'mock');
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
    expect(
      screen.getByRole('img', { name: /Sample tracking lost/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Load next/ }));
    expect(
      screen.getByText('Which is the largest ocean on Earth?'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('last-action')).toHaveTextContent('None');
    expect(
      screen.getByRole('img', { name: 'Sample pose: Y-Pose' }),
    ).toBeInTheDocument();
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
