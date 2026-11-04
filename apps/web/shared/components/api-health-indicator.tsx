'use client';

import { useEffect, useState } from 'react';
import {
  checkApiHealth,
  type ApiHealthResult,
} from '@/shared/infrastructure/api-health-client';

export function ApiHealthIndicator() {
  const [result, setResult] = useState<
    ApiHealthResult | { status: 'checking' }
  >({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void checkApiHealth(process.env.NEXT_PUBLIC_API_URL, {
      signal: controller.signal,
    }).then((result) => {
      if (active) setResult(result);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);
  return (
    <section className="panel mt-6" aria-label="Backend connection">
      <div className="section-heading">
        <h2>Backend connection</h2>
        <button
          className="text-button"
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Check again
        </button>
      </div>
      <p className="muted mt-3 text-sm" role="status">
        {result.status === 'checking' && 'Checking API liveness...'}
        {result.status === 'available' && result.service + ' / health OK'}
        {result.status === 'not_configured' &&
          'API URL is not configured. Mock development remains available.'}
        {result.status === 'unavailable' &&
          result.message + ' Mock development remains available.'}
      </p>
      <p className="muted mt-2 text-xs">
        Liveness only; database readiness is a separate endpoint.
      </p>
    </section>
  );
}
