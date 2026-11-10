import type { QuizQuestion } from '@action-quiz/contracts';

export const MOCK_QUESTIONS = [
  {
    id: 'question-orbit',
    correctOptionId: 'planet-mars',
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
    correctOptionId: 'ocean-pacific',
    content: 'Which is the largest ocean on Earth?',
    options: [
      { id: 'ocean-atlantic', text: 'Atlantic Ocean' },
      { id: 'ocean-indian', text: 'Indian Ocean' },
      { id: 'ocean-pacific', text: 'Pacific Ocean' },
      { id: 'ocean-arctic', text: 'Arctic Ocean' },
    ],
  },
  {
    id: 'question-photosynthesis',
    content: 'Which gas do plants absorb during photosynthesis?',
    correctOptionId: 'gas-carbon-dioxide',
    options: [
      { id: 'gas-oxygen', text: 'Oxygen' },
      { id: 'gas-nitrogen', text: 'Nitrogen' },
      { id: 'gas-hydrogen', text: 'Hydrogen' },
      { id: 'gas-carbon-dioxide', text: 'Carbon dioxide' },
    ],
  },
  {
    id: 'question-triangle',
    content: 'How many sides does a triangle have?',
    correctOptionId: 'sides-three',
    options: [
      { id: 'sides-three', text: '3' },
      { id: 'sides-four', text: '4' },
      { id: 'sides-five', text: '5' },
      { id: 'sides-six', text: '6' },
    ],
  },
  {
    id: 'question-vietnam',
    content: 'What is the capital of Vietnam?',
    correctOptionId: 'city-hanoi',
    options: [
      { id: 'city-danang', text: 'Da Nang' },
      { id: 'city-hanoi', text: 'Hanoi' },
      { id: 'city-hue', text: 'Hue' },
      { id: 'city-hochiminh', text: 'Ho Chi Minh City' },
    ],
  },
  {
    id: 'question-heart',
    content: 'Which organ pumps blood around the body?',
    correctOptionId: 'organ-heart',
    options: [
      { id: 'organ-lungs', text: 'Lungs' },
      { id: 'organ-brain', text: 'Brain' },
      { id: 'organ-heart', text: 'Heart' },
      { id: 'organ-stomach', text: 'Stomach' },
    ],
  },
  {
    id: 'question-arithmetic',
    content: 'What is 7 × 8?',
    correctOptionId: 'product-fifty-six',
    options: [
      { id: 'product-forty-eight', text: '48' },
      { id: 'product-fifty-four', text: '54' },
      { id: 'product-sixty-four', text: '64' },
      { id: 'product-fifty-six', text: '56' },
    ],
  },
  {
    id: 'question-mammal',
    content: 'Which of these animals is a mammal?',
    correctOptionId: 'animal-dolphin',
    options: [
      { id: 'animal-dolphin', text: 'Dolphin' },
      { id: 'animal-shark', text: 'Shark' },
      { id: 'animal-octopus', text: 'Octopus' },
      { id: 'animal-tuna', text: 'Tuna' },
    ],
  },
  {
    id: 'question-leap-year',
    content: 'How many days are in a leap year?',
    correctOptionId: 'days-366',
    options: [
      { id: 'days-364', text: '364' },
      { id: 'days-366', text: '366' },
      { id: 'days-365', text: '365' },
      { id: 'days-367', text: '367' },
    ],
  },
  {
    id: 'question-closest-star',
    content: 'Which star is closest to Earth?',
    correctOptionId: 'star-sun',
    options: [
      { id: 'star-sirius', text: 'Sirius' },
      { id: 'star-polaris', text: 'Polaris' },
      { id: 'star-sun', text: 'The Sun' },
      { id: 'star-betelgeuse', text: 'Betelgeuse' },
    ],
  },
] as const satisfies readonly (QuizQuestion & {
  readonly correctOptionId: string;
})[];
