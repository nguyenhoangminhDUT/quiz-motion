import type { ActionId } from '@action-quiz/contracts';

export interface ActionScore {
  readonly actionId: ActionId;
  readonly score: number;
}

export interface ActionSelection {
  readonly detectedAction: ActionId | null;
  readonly confidence: number;
}
