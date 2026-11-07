import type { CameraStatus, PoseUpdatedEvent } from '@action-quiz/contracts';

export type PoseEngineStatus =
  'new' | 'ready' | 'running' | 'stopped' | 'disposed';

export interface PoseEngine {
  readonly provider: string;
  readonly status: PoseEngineStatus;
  readonly cameraStatus: CameraStatus;
  initialize(): Promise<void>;
  /** The stream acquired by the real provider; null for the manual mock. */
  getMediaStream(): MediaStream | null;
  /** Use the UI-owned video element as the inference source. */
  attachVideo(video: HTMLVideoElement): void;
  start(): void;
  /** Pauses inference; the real provider retains its camera stream. */
  stop(): void;
  subscribe(listener: (event: PoseUpdatedEvent) => void): () => void;
  subscribeCameraStatus(listener: (status: CameraStatus) => void): () => void;
  dispose(): void;
}
