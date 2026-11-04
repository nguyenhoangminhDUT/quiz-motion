export const ACTION_IDS = [
  'ACT_01',
  'ACT_02',
  'ACT_03',
  'ACT_04',
  'ACT_05',
  'ACT_06',
  'ACT_07',
  'ACT_08',
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

export interface ActionDefinition {
  readonly id: ActionId;
  readonly name: string;
  readonly description: string;
  readonly instruction: string;
  readonly iconKey: string;
}

export const ACTION_DEFINITIONS = {
  ACT_01: {
    id: 'ACT_01',
    name: 'Y-Pose',
    description: 'Arms form a Y.',
    instruction: 'Raise both arms diagonally above your shoulders.',
    iconKey: 'y-pose',
  },
  ACT_02: {
    id: 'ACT_02',
    name: 'Lean Left',
    description: 'Torso leans to your left.',
    instruction: 'Keep your hips steady and lean your torso to your left.',
    iconKey: 'lean-left',
  },
  ACT_03: {
    id: 'ACT_03',
    name: 'Lean Right',
    description: 'Torso leans to your right.',
    instruction: 'Keep your hips steady and lean your torso to your right.',
    iconKey: 'lean-right',
  },
  ACT_04: {
    id: 'ACT_04',
    name: 'Heart Head',
    description: 'Arms form a heart above the head.',
    instruction:
      'Curve both arms above your head and bring your hands together.',
    iconKey: 'heart-head',
  },
  ACT_05: {
    id: 'ACT_05',
    name: 'Cross Arms',
    description: 'Forearms cross in front of the chest.',
    instruction: 'Cross your forearms in front of your chest.',
    iconKey: 'cross-arms',
  },
  ACT_06: {
    id: 'ACT_06',
    name: 'Salute',
    description: 'One hand is raised to the forehead.',
    instruction: 'Bring one hand to your forehead in a salute.',
    iconKey: 'salute',
  },
  ACT_07: {
    id: 'ACT_07',
    name: 'Dab',
    description: 'One arm extends while the other bends across the face.',
    instruction:
      'Extend one arm diagonally and bend the other across your face.',
    iconKey: 'dab',
  },
  ACT_08: {
    id: 'ACT_08',
    name: 'Thinking',
    description: 'One hand rests near the chin.',
    instruction: 'Place one hand under your chin in a thinking pose.',
    iconKey: 'thinking',
  },
} as const satisfies {
  readonly [Id in ActionId]: ActionDefinition & { readonly id: Id };
};
