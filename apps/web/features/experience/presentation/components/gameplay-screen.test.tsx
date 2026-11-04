import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type {
  QuestionActionConfig,
  QuizQuestion,
} from '@action-quiz/contracts';
import { GameplayScreen } from './gameplay-screen';

it('uses option IDs for pose instructions and updates the preview entirely from props', () => {
  const question: QuizQuestion = {
    id: 'question-layout',
    content: 'Choose your next destination.',
    options: [
      { id: 'answer:left', text: 'Mountains' },
      { id: '__proto__', text: 'Ocean' },
      { id: 'answer-42', text: 'Forest' },
      { id: 'answer:right', text: 'Desert' },
    ],
  };
  const actionConfig: QuestionActionConfig = {
    questionId: question.id,
    optionMap: {
      'answer:left': 'ACT_04',
      ['__proto__']: 'ACT_03',
      'answer-42': 'ACT_02',
      'answer:right': 'ACT_01',
    },
  };
  const onNextQuestion = vi.fn();
  const props = {
    question,
    actionConfig,
    questionNumber: 1,
    questionCount: 2,
    holdProgress: 0,
    onNextQuestion,
  };
  const { rerender } = render(
    <GameplayScreen {...props} detectedAction="ACT_03" />,
  );

  expect(
    within(screen.getByRole('list', { name: 'Answer options' })).getAllByRole(
      'listitem',
    ),
  ).toHaveLength(4);
  const ocean = screen.getByRole('article', { name: 'Option B: Ocean' });
  expect(within(ocean).getByText('Lean Right')).toBeInTheDocument();
  expect(
    within(ocean).getByText(
      'Keep your hips steady and lean your torso to your right.',
    ),
  ).toBeInTheDocument();
  expect(ocean).toHaveAttribute('data-detected', 'true');
  expect(
    within(
      screen.getByRole('article', { name: 'Option A: Mountains' }),
    ).getByText('Heart Head'),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Hold progress')).toHaveValue(0);

  fireEvent.click(
    screen.getByRole('button', { name: /Load next mock question/ }),
  );
  expect(onNextQuestion).toHaveBeenCalledOnce();
  expect(screen.getByText(question.content)).toBeInTheDocument();

  rerender(
    <GameplayScreen
      {...props}
      question={{ ...question, content: 'A new question from composition.' }}
      questionNumber={2}
      holdProgress={0.6}
    />,
  );
  expect(screen.queryByText(question.content)).not.toBeInTheDocument();
  expect(screen.getByText('Question 2 / 2')).toBeInTheDocument();
  expect(screen.getByLabelText('Hold progress')).toHaveValue(0.6);
  expect(screen.queryByText('Simulated pose')).not.toBeInTheDocument();
});
