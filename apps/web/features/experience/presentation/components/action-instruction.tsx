import { ACTION_DEFINITIONS, type ActionId } from '@action-quiz/contracts';
import { MoveUpRight } from 'lucide-react';

export function ActionInstruction({ actionId }: { actionId: ActionId }) {
  const action = ACTION_DEFINITIONS[actionId];
  return (
    <div className="action-instruction">
      <MoveUpRight size={18} aria-hidden="true" />
      <div>
        <strong>{action.name}</strong>
        <p>{action.instruction}</p>
      </div>
    </div>
  );
}
