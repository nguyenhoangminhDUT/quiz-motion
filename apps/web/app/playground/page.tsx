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
        <p className="eyebrow">EXPERIENCE WORKSPACE / LAYOUT PREVIEW</p>
        <div className="playground-title">
          <h1>Development Playground</h1>
          <p>
            Explore the gameplay layout with sample questions and simulated
            movement. No camera setup needed.
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
