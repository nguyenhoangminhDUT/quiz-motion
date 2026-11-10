import { useId, type ReactNode } from 'react';
import type {
  ActionId,
  AnswerEvaluation,
  QuestionActionConfig,
  QuizQuestion,
} from '@action-quiz/contracts';
import { ArrowRight, ScanLine, Volume2, VolumeX } from 'lucide-react';
import type { ExperienceFeedback } from '../experience-feedback';
import { ActionInstruction } from './action-instruction';
import { CameraViewport } from './camera-viewport';
import { HoldProgress } from './hold-progress';
import { FeedbackPanel } from './feedback-panel';
import { AnswerResult } from './answer-result';
import styles from './gameplay.module.css';

export interface GameplayScreenProps {
  readonly mode?: 'preview' | 'camera';
  readonly cameraLabel?: string;
  readonly question: QuizQuestion;
  readonly actionConfig: QuestionActionConfig;
  readonly questionNumber: number;
  readonly questionCount: number;
  readonly holdProgress: number;
  readonly detectedAction?: ActionId | null;
  readonly cameraOverlay?: ReactNode;
  readonly cameraPreview?: ReactNode;
  readonly feedback?: ExperienceFeedback;
  readonly evaluation?: AnswerEvaluation | null;
  readonly nextQuestionInSeconds?: number | null;
  readonly soundEnabled?: boolean;
  readonly soundPending?: boolean;
  readonly soundMessage?: string | null;
  readonly onToggleSound?: () => void;
  readonly onNextQuestion: () => void;
}

/** Presentation only. Composition supplies questions, pose input and game progress. */
export function GameplayScreen({
  mode = 'preview',
  cameraLabel = 'Camera not connected',
  question,
  actionConfig,
  questionNumber,
  questionCount,
  holdProgress,
  detectedAction = null,
  cameraOverlay,
  cameraPreview,
  feedback,
  evaluation = null,
  nextQuestionInSeconds = null,
  soundEnabled = false,
  soundPending = false,
  soundMessage,
  onToggleSound,
  onNextQuestion,
}: GameplayScreenProps) {
  const questionHeadingId = useId();
  return (
    <section
      className={`${styles.screen} ${mode === 'camera' ? styles.cameraMode : ''}`}
      aria-label={mode === 'camera' ? 'Camera gameplay' : 'Gameplay preview'}
    >
      <div className={styles.intro}>
        <div>
          <p className="eyebrow">YOUR BODY. YOUR ANSWER.</p>
          <h2>Make your next move.</h2>
          <p>Read the question. Find your answer. Match its pose.</p>
        </div>
        <div className={styles.previewActions}>
          <span className="badge">
            {mode === 'camera' ? 'CAMERA PRACTICE' : 'PRACTICE PREVIEW'}
          </span>
          {onToggleSound && (
            <button
              type="button"
              className={styles.soundButton}
              aria-label="Sound feedback"
              aria-pressed={soundEnabled}
              disabled={soundPending}
              onClick={onToggleSound}
            >
              {soundEnabled ? (
                <Volume2 size={16} aria-hidden="true" />
              ) : (
                <VolumeX size={16} aria-hidden="true" />
              )}
              {soundPending
                ? 'Starting sound…'
                : soundEnabled
                  ? 'Sound on'
                  : 'Sound off'}
            </button>
          )}
          {soundMessage && (
            <p className={styles.audioMessage} role="status">
              {soundMessage}
            </p>
          )}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.cameraColumn}>
          <div className={styles.sectionHeading}>
            <h3>
              <ScanLine size={17} aria-hidden="true" /> Your movement
            </h3>
            <span className={styles.cameraLabel}>{cameraLabel}</span>
          </div>
          <div className={styles.cameraPreview}>
            {cameraPreview ?? <CameraViewport overlay={cameraOverlay} />}
          </div>
          <div className={styles.positionHint}>
            <span className={styles.hintNumber}>01</span>
            <div>
              <strong>Give yourself room to move</strong>
              <p>
                Stand back so your head, hands and hips fit inside the frame.
              </p>
            </div>
          </div>
          <div className={styles.progressPanel}>
            <HoldProgress
              progress={holdProgress}
              status={feedback?.status ?? 'ready'}
            />
          </div>
        </div>

        <section
          className={styles.questionPanel}
          aria-labelledby={questionHeadingId}
        >
          <div className={styles.questionHeading}>
            <span className="eyebrow">THE QUESTION</span>
            <span className={styles.questionCount}>
              Question {questionNumber} / {questionCount}
            </span>
          </div>
          <h3 id={questionHeadingId}>{question.content}</h3>
          <p className={styles.questionHint}>Each answer has its own move.</p>
          {evaluation ? (
            <AnswerResult
              evaluation={evaluation}
              question={question}
              nextQuestionInSeconds={nextQuestionInSeconds}
            />
          ) : (
            feedback && <FeedbackPanel feedback={feedback} />
          )}
          <ol className={styles.options} aria-label="Answer options">
            {question.options.map((option, index) => {
              const actionId = actionConfig.optionMap[option.id];
              const detected = feedback
                ? feedback.candidateOptionId === option.id
                : Boolean(actionId && actionId === detectedAction);
              const confirmed = feedback?.confirmedOptionId === option.id;
              const result = evaluation
                ? option.id === evaluation.correctOptionId
                  ? 'correct'
                  : confirmed
                    ? 'incorrect'
                    : undefined
                : undefined;
              return (
                <li key={option.id}>
                  <article
                    className={styles.option}
                    data-detected={detected}
                    data-confirmed={confirmed}
                    data-result={result}
                    aria-label={`Option ${String.fromCharCode(65 + index)}: ${option.text}`}
                  >
                    <div className={styles.optionHeading}>
                      <span className={styles.optionLetter}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <h4>{option.text}</h4>
                      {(detected || confirmed || result) && (
                        <span className={styles.detectedLabel}>
                          {result === 'correct'
                            ? 'Correct answer'
                            : result === 'incorrect'
                              ? 'Your answer · Incorrect'
                              : confirmed
                                ? 'Confirmed'
                                : feedback
                                  ? 'Candidate'
                                  : 'Simulated pose'}
                        </span>
                      )}
                    </div>
                    {actionId && <ActionInstruction actionId={actionId} />}
                  </article>
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            className={styles.nextButton}
            onClick={onNextQuestion}
          >
            {mode === 'camera' ? 'Next question' : 'Load next mock question'}{' '}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </section>
      </div>
      <p className={styles.previewNote}>
        {mode === 'camera'
          ? 'Hold your answer pose for 1.5 seconds. See the correct answer, then move to the next question automatically after 3 seconds. Camera frames stay in your browser.'
          : 'Preview with sample questions. Use the simulation controls below to try a pose.'}
      </p>
    </section>
  );
}
