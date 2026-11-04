import type { QuizQuestion } from '@action-quiz/contracts';

export const MOCK_QUESTIONS = [
  {
    id: 'question-orbit',
    content: 'Which planet is known as the Red Planet?',
    options: [
      { id: 'planet-venus', text: 'Venus' },
      { id: 'planet-mars', text: 'Mars' },
      { id: 'planet-jupiter', text: 'Jupiter' },
      { id: 'planet-neptune', text: 'Neptune' },
    ],
  },
  {
    id: 'question-ocean',
    content: 'Which is the largest ocean on Earth?',
    options: [
      { id: 'ocean-atlantic', text: 'Atlantic Ocean' },
      { id: 'ocean-indian', text: 'Indian Ocean' },
      { id: 'ocean-pacific', text: 'Pacific Ocean' },
      { id: 'ocean-arctic', text: 'Arctic Ocean' },
    ],
  },
] as const satisfies readonly QuizQuestion[];
