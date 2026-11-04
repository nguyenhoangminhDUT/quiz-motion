'use client';

import { useEffect, useState } from 'react';
import { createPlayground, type PlaygroundRuntime } from './create-playground';
import { PlaygroundView } from './playground-view';

export function PlaygroundClient() {
  const [runtime, setRuntime] = useState<PlaygroundRuntime | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let instance: PlaygroundRuntime | null = null;
    async function initialize() {
      try {
        instance = createPlayground(() => performance.now());
        await instance.initialize();
        if (active) setRuntime(instance);
      } catch (cause: unknown) {
        if (active)
          setError(
            cause instanceof Error ? cause.message : 'Initialization failed.',
          );
      }
    }
    void initialize();
    return () => {
      active = false;
      instance?.dispose();
    };
  }, []);
  if (error)
    return (
      <div className="notice" role="alert">
        {error}
      </div>
    );
  if (!runtime) return <p role="status">Preparing mock adapters...</p>;
  return <PlaygroundView runtime={runtime} />;
}
