import type { PoseUpdatedEvent } from '@action-quiz/contracts';

export type PoseEngineStatus =
  'new' | 'ready' | 'running' | 'stopped' | 'disposed';
export interface PoseEngine {
  readonly provider: string;
  readonly status: PoseEngineStatus;
  initialize(): Promise<void>;
  start(): void;
  stop(): void;
  subscribe(listener: (event: PoseUpdatedEvent) => void): () => void;
  dispose(): void;
}
