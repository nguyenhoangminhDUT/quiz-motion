import { CircleCheck, CircleAlert, Hand, ScanLine, Send } from 'lucide-react';
import type { ExperienceFeedback } from '../experience-feedback';
import styles from './gameplay.module.css';

const messages = {
  ready: {
    title: 'Ready when you are',
    detail: 'Choose an answer and match its pose.',
    icon: ScanLine,
  },
  detecting: {
    title: 'Pose detected',
    detail: 'Keep your chosen pose steady.',
    icon: ScanLine,
  },
  holding: {
    title: 'Keep holding',
    detail: 'Stay in position while your answer is being selected.',
    icon: Hand,
  },
  confirmed: {
    title: 'Answer confirmed',
    detail: 'Your selection is locked in.',
    icon: CircleCheck,
  },
  submitting: {
    title: 'Sending your answer',
    detail: 'Please wait for confirmation.',
    icon: Send,
  },
  submitted: {
    title: 'Answer sent',
    detail: 'Your answer has been received.',
    icon: CircleCheck,
  },
  error: {
    title: 'Something went wrong',
    detail: 'Please try again.',
    icon: CircleAlert,
  },
} as const;

export function FeedbackPanel({
  feedback,
}: {
  readonly feedback: ExperienceFeedback;
}) {
  const message = messages[feedback.status];
  return (
    <div
      className={styles.feedbackPanel}
      data-feedback={feedback.status}
      role={feedback.status === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
    >
      <message.icon size={23} aria-hidden="true" />
      <div>
        <strong>{message.title}</strong>
        <p>
          {feedback.error ??
            (feedback.status === 'detecting' && !feedback.candidateOptionId
              ? 'This pose is not assigned to an answer. Try one shown below.'
              : message.detail)}
        </p>
      </div>
    </div>
  );
}
