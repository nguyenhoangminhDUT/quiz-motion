import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import type {
  ActionId,
  CameraStatus,
  PoseFrameResult,
  PoseUpdatedEvent,
} from '@action-quiz/contracts';
import type { PoseEngine, PoseEngineStatus } from '@/features/pose';
import * as pose from '@/features/pose';
import { MockQuizGateway } from '@/features/game/infrastructure/mock/mock-quiz-gateway';
import { CameraGameClient, CameraGameView } from './camera-game-client';
import { createCameraGameRuntime } from './camera-game-runtime';

class FakePoseEngine implements PoseEngine {
  readonly provider = 'mediapipe';
  status: PoseEngineStatus = 'new';
  cameraStatus: CameraStatus = 'idle';
  readonly stream = { getTracks: () => [] } as unknown as MediaStream;
  readonly poseListeners = new Set<(event: PoseUpdatedEvent) => void>();
  readonly cameraListeners = new Set<(status: CameraStatus) => void>();
  readonly initialize = vi.fn(async () => {
    this.status = 'ready';
    this.publishCamera('ready');
  });
  readonly attachVideo = vi.fn();
  readonly start = vi.fn(() => {
    this.status = 'running';
  });
  readonly stop = vi.fn();
  readonly dispose = vi.fn(() => {
    this.status = 'disposed';
  });
  getMediaStream() {
    return this.stream;
  }
  subscribe(listener: (event: PoseUpdatedEvent) => void) {
    this.poseListeners.add(listener);
    return () => {
      this.poseListeners.delete(listener);
    };
  }
  subscribeCameraStatus(listener: (status: CameraStatus) => void) {
    this.cameraListeners.add(listener);
    return () => {
      this.cameraListeners.delete(listener);
    };
  }
  publishCamera(status: CameraStatus) {
    this.cameraStatus = status;
    for (const listener of [...this.cameraListeners]) listener(status);
  }
  emit(frame: PoseFrameResult) {
    for (const listener of [...this.poseListeners])
      listener({
        type: 'POSE_UPDATED',
        timestampMs: frame.timestampMs,
        payload: { frame },
      });
  }
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2);
});

async function setup(engines = [new FakePoseEngine()]) {
  let time = 0;
  let index = 0;
  const gateway = new MockQuizGateway();
  const submit = vi.spyOn(gateway, 'submitAnswer');
  const runtime = createCameraGameRuntime({
    now: () => time,
    gateway,
    rng: () => 0,
    engineFactory: () => engines[index++]!,
  });
  await runtime.initialize();
  const video = document.createElement('video');
  return {
    runtime,
    video,
    engine: engines[0]!,
    submit,
    at: (next: number) => {
      time = next;
    },
    emit: (
      next: number,
      action: ActionId | null = 'ACT_02',
      confidence = 1,
    ) => {
      time = next;
      engines[index - 1]!.emit({
        timestampMs: time,
        detectedAction: action,
        confidence: action ? confidence : 0,
        trackingStatus: action ? 'tracking' : 'lost',
        landmarks: action
          ? Array.from({ length: 33 }, () => ({
              x: 0.5,
              y: 0.5,
              z: 0,
              visibility: 1,
            }))
          : [],
      });
    },
  };
}

describe('camera gameplay integration', () => {
  it('owns camera cleanup when the full page unmounts under StrictMode', async () => {
    const engine = new FakePoseEngine();
    vi.spyOn(pose, 'createBrowserPoseEngine').mockReturnValue(engine);
    const view = render(
      <StrictMode>
        <CameraGameClient />
      </StrictMode>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Enable camera' }),
    );
    await waitFor(() => expect(engine.start).toHaveBeenCalledOnce());
    view.unmount();
    expect(engine.dispose).toHaveBeenCalledOnce();
    expect(engine.poseListeners.size).toBe(0);
    expect(engine.cameraListeners.size).toBe(0);
  });

  it('shows live video and game progress, submits once after 1.5 seconds, and changes question', async () => {
    const test = await setup();
    const view = render(<CameraGameView runtime={test.runtime} />);
    expect(screen.queryByText('Camera not connected')).not.toBeInTheDocument();
    expect(screen.queryByText(/simulation controls/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enable camera' }));
    await waitFor(() => expect(test.engine.start).toHaveBeenCalledOnce());
    const video = screen.getByLabelText('Live mirrored camera preview');
    expect((video as HTMLVideoElement).srcObject).toBe(test.engine.stream);
    expect(test.engine.attachVideo).toHaveBeenCalledWith(video);
    act(() => {
      for (let t = 100; t <= 1500; t += 100) test.emit(t);
    });
    expect(test.submit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Hold progress')).toHaveValue(1400 / 1500);
    await act(async () => test.emit(1600));
    expect(test.submit).toHaveBeenCalledOnce();
    expect(screen.getByText('Incorrect')).toBeInTheDocument();
    expect(screen.getByText('B. Mars')).toBeInTheDocument();
    expect(screen.getByText('Next question in 3s')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Option A:/ })).toHaveAttribute(
      'data-confirmed',
      'true',
    );
    expect(screen.getByRole('article', { name: /Option A:/ })).toHaveAttribute(
      'data-result',
      'incorrect',
    );
    expect(screen.getByRole('article', { name: /Option B:/ })).toHaveAttribute(
      'data-result',
      'correct',
    );
    act(() => test.emit(1700));
    expect(test.submit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    expect(screen.getByText('Question 2 / 10')).toBeInTheDocument();
    expect(screen.getByLabelText('Hold progress')).toHaveValue(0);
    expect(test.engine.start).toHaveBeenCalledOnce();
    act(() => {
      test.at(5000);
      test.runtime.tick();
    });
    expect(screen.getByText('Question 2 / 10')).toBeInTheDocument();
    expect(screen.queryByText('Incorrect')).not.toBeInTheDocument();
    test.at(5100);
    fireEvent.click(screen.getByRole('button', { name: 'Close camera' }));
    expect(test.engine.dispose).toHaveBeenCalledOnce();
    expect((video as HTMLVideoElement).srcObject).toBeNull();
    view.unmount();
    test.runtime.dispose();
  });

  it('shows a correct result for 3 seconds, then advances once without restarting the camera', async () => {
    const test = await setup();
    await test.runtime.startCamera(test.video);
    const view = render(<CameraGameView runtime={test.runtime} />);
    await act(async () => {
      for (let t = 100; t <= 1600; t += 100) test.emit(t, 'ACT_03');
    });
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(screen.getByText('B. Mars')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Option B:/ })).toHaveAttribute(
      'data-result',
      'correct',
    );
    expect(test.runtime.session.getState().evaluation).toEqual({
      isCorrect: true,
      correctOptionId: 'planet-mars',
    });
    act(() => {
      test.emit(1800, 'ACT_03');
      test.at(2600);
      test.runtime.tick();
    });
    expect(screen.getByText('Next question in 2s')).toBeInTheDocument();
    act(() => {
      test.at(4599);
      test.runtime.tick();
    });
    expect(screen.getByText('Next question in 1s')).toBeInTheDocument();
    expect(screen.getByText('Question 1 / 10')).toBeInTheDocument();
    act(() => {
      test.at(4600);
      test.runtime.tick();
    });
    expect(screen.getByText('Question 2 / 10')).toBeInTheDocument();
    expect(screen.queryByText('Correct!')).not.toBeInTheDocument();
    expect(test.runtime.session.getState().evaluation).toBeNull();
    expect(screen.getByLabelText('Hold progress')).toHaveValue(0);
    expect(test.engine.start).toHaveBeenCalledOnce();
    act(() => {
      test.at(10_000);
      test.runtime.tick();
    });
    expect(screen.getByText('Question 2 / 10')).toBeInTheDocument();
    expect(test.submit).toHaveBeenCalledOnce();
    view.unmount();
    test.runtime.dispose();
  });

  it('automatically advances after an incorrect answer, and cancels the countdown on dispose', async () => {
    const test = await setup();
    await test.runtime.startCamera(test.video);
    for (let t = 100; t <= 1600; t += 100) test.emit(t);
    await Promise.resolve();
    expect(test.runtime.session.getState().evaluation?.isCorrect).toBe(false);
    test.at(4599);
    test.runtime.tick();
    expect(test.runtime.getSnapshot().questionNumber).toBe(1);
    test.at(4600);
    test.runtime.tick();
    expect(test.runtime.getSnapshot().questionNumber).toBe(2);
    for (let t = 4700; t <= 6200; t += 100) test.emit(t);
    await Promise.resolve();
    expect(test.runtime.getSnapshot().nextQuestionInSeconds).toBe(3);
    test.runtime.dispose();
    test.at(10_000);
    test.runtime.tick();
    expect(test.runtime.getSnapshot().questionNumber).toBe(2);
    expect(test.runtime.session.getState().status).toBe('IDLE');
  });

  it('waits until the submission succeeds before starting the result countdown', async () => {
    const test = await setup();
    let finish!: () => void;
    test.submit.mockImplementation(
      (request) =>
        new Promise((resolve) => {
          finish = () =>
            resolve({
              ...request,
              submissionId: 'delayed',
              evaluation: { isCorrect: false, correctOptionId: 'planet-mars' },
            });
        }),
    );
    await test.runtime.startCamera(test.video);
    for (let t = 100; t <= 1600; t += 100) test.emit(t);
    test.at(5000);
    test.runtime.tick();
    expect(test.runtime.getSnapshot().nextQuestionInSeconds).toBeNull();
    expect(test.runtime.session.getState().status).toBe('SUBMITTING');
    finish();
    await Promise.resolve();
    expect(test.runtime.getSnapshot().nextQuestionInSeconds).toBe(3);
    test.at(7999);
    test.runtime.tick();
    expect(test.runtime.getSnapshot().questionNumber).toBe(1);
    test.at(8000);
    test.runtime.tick();
    expect(test.runtime.getSnapshot().questionNumber).toBe(2);
    test.runtime.dispose();
  });

  it('resets holds on low confidence, lost tracking, unassigned actions, and frame silence', async () => {
    const test = await setup();
    await test.runtime.startCamera(test.video);
    test.emit(100);
    test.emit(300);
    expect(test.runtime.session.getState().holdProgress).toBeGreaterThan(0);
    test.emit(400, 'ACT_02', 0.5);
    expect(test.runtime.session.getState().holdProgress).toBe(0);
    test.emit(500);
    test.emit(700);
    test.emit(800, null);
    expect(test.runtime.session.getState().candidateOptionId).toBeNull();
    test.emit(900);
    test.emit(1100);
    test.emit(1200, 'ACT_01');
    expect(test.runtime.session.getState().candidateOptionId).toBeNull();
    test.emit(1300);
    test.emit(1500);
    test.at(1751);
    test.runtime.tick();
    expect(test.runtime.session.getState().holdProgress).toBe(0);
    test.emit(1800);
    expect(test.runtime.session.getState().holdProgress).toBe(0);
    expect(test.submit).not.toHaveBeenCalled();
    test.runtime.dispose();
    expect(test.engine.poseListeners.size).toBe(0);
    expect(test.engine.cameraListeners.size).toBe(0);
  });

  it('rejects a frame from the previous question and ignores callbacks after disposal', async () => {
    const test = await setup();
    await test.runtime.startCamera(test.video);
    test.emit(100);
    test.emit(300);
    const oldCallback = [...test.engine.poseListeners][0]!;
    test.at(1000);
    test.runtime.nextQuestion();
    test.emit(900);
    expect(test.runtime.session.getState().status).toBe('READY');
    test.emit(1100);
    expect(test.runtime.session.getState().holdProgress).toBe(0);
    test.runtime.dispose();
    oldCallback({
      type: 'POSE_UPDATED',
      timestampMs: 2000,
      payload: {
        frame: {
          timestampMs: 2000,
          detectedAction: null,
          confidence: 0,
          trackingStatus: 'lost',
          landmarks: [],
        },
      },
    });
    expect(test.runtime.session.getState().status).toBe('IDLE');
    expect(test.engine.dispose).toHaveBeenCalledOnce();
    expect(test.video.srcObject).toBeNull();
  });

  it.each(['permission-denied', 'not-found'] as const)(
    'reports %s and starts a fresh engine on retry',
    async (status) => {
      const first = new FakePoseEngine();
      first.initialize.mockImplementation(async () => {
        first.publishCamera(status);
        throw new Error('startup failed');
      });
      const second = new FakePoseEngine();
      const test = await setup([first, second]);
      const view = render(<CameraGameView runtime={test.runtime} />);
      fireEvent.click(screen.getByRole('button', { name: 'Enable camera' }));
      await screen.findByRole('alert');
      expect(screen.getByRole('alert')).toHaveTextContent(
        status === 'permission-denied'
          ? 'Camera access is blocked'
          : 'No camera found',
      );
      expect(first.dispose).toHaveBeenCalledOnce();
      fireEvent.click(screen.getByRole('button', { name: 'Try camera again' }));
      await waitFor(() => expect(second.start).toHaveBeenCalledOnce());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      view.unmount();
      test.runtime.dispose();
    },
  );

  it('stops an active hold on inference failure and releases the camera', async () => {
    const test = await setup();
    await test.runtime.startCamera(test.video);
    test.emit(100);
    test.emit(300);
    test.at(400);
    test.engine.publishCamera('error');
    await Promise.resolve();
    expect(test.runtime.getSnapshot()).toMatchObject({
      phase: 'error',
      cameraStatus: 'error',
      frame: null,
    });
    expect(test.runtime.session.getState().holdProgress).toBe(0);
    expect(test.engine.dispose).toHaveBeenCalledOnce();
    test.runtime.dispose();
  });

  it('closes the camera and clears progress when the tab becomes hidden', async () => {
    const test = await setup();
    const view = render(<CameraGameView runtime={test.runtime} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable camera' }));
    await waitFor(() => expect(test.engine.start).toHaveBeenCalledOnce());
    act(() => {
      test.emit(100);
      test.emit(300);
      test.at(400);
    });
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByLabelText('Hold progress')).toHaveValue(0);
    expect(test.engine.dispose).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: 'Enable camera' }),
    ).toBeInTheDocument();
    view.unmount();
    test.runtime.dispose();
  });

  it('cancels initialization without starting a disposed engine', async () => {
    const test = await setup();
    let finish!: () => void;
    test.engine.initialize.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = test.runtime.startCamera(test.video);
    test.runtime.dispose();
    finish();
    await pending;
    expect(test.engine.start).not.toHaveBeenCalled();
    expect(test.engine.attachVideo).not.toHaveBeenCalled();
    expect(test.engine.dispose).toHaveBeenCalledOnce();
  });

  it('does not attach or start after camera cancellation while play is pending', async () => {
    const test = await setup();
    let finish!: () => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = test.runtime.startCamera(test.video);
    await Promise.resolve();
    test.runtime.closeCamera();
    finish();
    await pending;
    expect(test.engine.start).not.toHaveBeenCalled();
    expect(test.engine.attachVideo).not.toHaveBeenCalled();
    expect(test.video.srcObject).toBeNull();
    test.runtime.dispose();
  });

  it('waits for a decoded frame and cancels that wait when the game leaves', async () => {
    const test = await setup();
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(
      0,
    );
    const pending = test.runtime.startCamera(test.video);
    await Promise.resolve();
    await Promise.resolve();
    expect(test.engine.start).not.toHaveBeenCalled();
    test.runtime.dispose();
    await pending;
    expect(test.engine.start).not.toHaveBeenCalled();
    expect(test.engine.dispose).toHaveBeenCalledOnce();
  });

  it('only starts inference once a decoded video frame is available', async () => {
    const test = await setup();
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(
      0,
    );
    const pending = test.runtime.startCamera(test.video);
    await Promise.resolve();
    await Promise.resolve();
    expect(test.engine.start).not.toHaveBeenCalled();
    test.video.dispatchEvent(new Event('loadeddata'));
    await pending;
    expect(test.engine.start).toHaveBeenCalledOnce();
    test.runtime.dispose();
  });
});
