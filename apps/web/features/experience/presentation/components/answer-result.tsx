import { CircleCheck, CircleX } from 'lucide-react';
import type { AnswerEvaluation, QuizQuestion } from '@action-quiz/contracts';
import styles from './gameplay.module.css';

export function AnswerResult({
  evaluation,
  question,
  nextQuestionInSeconds,
}: {
  readonly evaluation: AnswerEvaluation;
  readonly question: QuizQuestion;
  readonly nextQuestionInSeconds: number | null;
}) {
  const index = question.options.findIndex(
    (option) => option.id === evaluation.correctOptionId,
  );
  const correct = question.options[index];
  const Icon = evaluation.isCorrect ? CircleCheck : CircleX;
  return (
    <div
      className={styles.answerResult}
      data-correct={evaluation.isCorrect}
      role="status"
      aria-atomic="true"
    >
      <Icon size={23} aria-hidden="true" />
      <div>
        <strong>{evaluation.isCorrect ? 'Correct!' : 'Incorrect'}</strong>
        <p>
          Correct answer:{' '}
          <b>
            {String.fromCharCode(65 + index)}. {correct?.text}
          </b>
        </p>
        {nextQuestionInSeconds !== null && (
          <p className={styles.countdown}>
            Next question in {nextQuestionInSeconds}s
          </p>
        )}
      </div>
    </div>
  );
}
