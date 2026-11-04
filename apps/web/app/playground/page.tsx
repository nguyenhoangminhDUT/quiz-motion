import { notFound } from 'next/navigation';
import { PlaygroundClient } from '@/composition/playground-client';
import { ApiHealthIndicator } from '@/shared/components/api-health-indicator';
import { SiteHeader } from '@/shared/components/site-header';

export default function PlaygroundPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <div className="shell">
      <SiteHeader playground />
      <main className="playground-main">
        <p className="eyebrow">DEVELOPER WORKSPACE / PHASE 0</p>
        <div className="playground-title">
          <h1>Development Playground</h1>
          <p>
            Inspect the connection between pose events, shared contracts and
            presentation.
          </p>
        </div>
        <ApiHealthIndicator />
        <PlaygroundClient />
      </main>
      <footer>
        <span>MockPoseEngine &rarr; Shared Contract &rarr; Presentation</span>
        <span>Local development only</span>
      </footer>
    </div>
  );
}
