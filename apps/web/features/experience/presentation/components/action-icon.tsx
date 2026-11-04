import type { ActionId } from '@action-quiz/contracts';

const poses = {
  ACT_01: {
    head: [32, 14],
    body: 'M32 22V42M32 27L19 19L12 8M32 27L45 19L52 8',
  },
  ACT_02: {
    head: [41, 14],
    body: 'M39 22L32 42M37 27L24 30L20 40M37 27L48 32L50 42',
  },
  ACT_03: {
    head: [23, 14],
    body: 'M25 22L32 42M27 27L16 32L14 42M27 27L40 30L44 40',
  },
  ACT_04: {
    head: [32, 22],
    body: 'M32 30V42M32 32L16 22Q12 7 24 8L32 14L40 8Q52 7 48 22L32 32',
  },
  ACT_05: {
    head: [32, 12],
    body: 'M32 20V42M32 25L19 30L39 36M32 25L45 30L25 36',
  },
  ACT_06: {
    head: [32, 14],
    body: 'M32 22V42M32 27L19 34L16 43M32 27L46 26L39 13',
  },
  ACT_07: {
    head: [28, 17],
    body: 'M31 25L34 42M31 27L45 18L55 9M31 27L16 24L29 17',
  },
  ACT_08: {
    head: [32, 14],
    body: 'M32 22V42M32 27L20 35L38 37M32 27L44 34L35 22',
  },
} as const satisfies Record<
  ActionId,
  { head: readonly [number, number]; body: string }
>;

/** Illustrations only; these paths are not pose landmarks or classifier rules. */
export function ActionIcon({ actionId }: { actionId: ActionId }) {
  const pose = poses[actionId];
  return (
    <svg
      viewBox="0 0 64 64"
      width="56"
      height="56"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx={pose.head[0]} cy={pose.head[1]} r="5" />
        <path d={pose.body} />
        <path d="M32 42L23 56M32 42L41 56" />
      </g>
    </svg>
  );
}
