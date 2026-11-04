import type { PoseLandmark } from '@action-quiz/contracts';

/** Boundary only: no real skeleton rendering in Phase 0. */
export function SkeletonOverlay({
  landmarks,
}: {
  landmarks: readonly PoseLandmark[];
}) {
  return (
    <span className="overlay-note">
      Skeleton overlay: TODO / {landmarks.length} landmarks received
    </span>
  );
}
