export function HoldProgress({ progress }: { progress: number }) {
  const bounded = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  return (
    <div className="hold">
      <div className="row">
        <span>Hold progress</span>
        <span>{Math.round(bounded * 100)}%</span>
      </div>
      <progress aria-label="Hold progress" value={bounded} max={1} />
      <p>1500 ms hold detection / TODO in Phase 3</p>
    </div>
  );
}
