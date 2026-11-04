import { ACTION_DEFINITIONS, type ActionId } from '@action-quiz/contracts';
import { ActionIcon } from './action-icon';
import styles from './gameplay.module.css';

export function ActionInstruction({ actionId }: { actionId: ActionId }) {
  const action = ACTION_DEFINITIONS[actionId];
  return (
    <div className={styles.instruction}>
      <ActionIcon actionId={actionId} />
      <div>
        <strong>{action.name}</strong>
        <p>{action.instruction}</p>
      </div>
    </div>
  );
}
