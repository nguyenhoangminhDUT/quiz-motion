import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PoseDebugClient } from '@/composition/pose-debug-client';
import { SiteHeader } from '@/shared/components/site-header';

export default function PoseDebugPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <div className="shell">
      <SiteHeader />
      <main className="playground-main">
        <p className="eyebrow">POSE ENGINE / REAL CAMERA VALIDATION</p>
        <div className="playground-title">
          <h1>Pose recognition debug</h1>
          <p>
            Validate all eight geometry classifiers with the local MediaPipe
            model before connecting pose input to the game interface.
          </p>
          <Link className="text-button" href="/playground">
            Open mock playground
          </Link>
        </div>
        <PoseDebugClient />
      </main>
      <footer>
        <span>Camera → MediaPipe → EMA → 8 classifiers</span>
        <span>Local development only</span>
      </footer>
    </div>
  );
}
