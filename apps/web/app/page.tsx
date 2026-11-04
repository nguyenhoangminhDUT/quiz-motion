import Link from 'next/link';
import {
  ArrowRight,
  ScanLine,
  Layers3,
  Workflow,
  Check,
  MoveUpRight,
} from 'lucide-react';
import { SiteHeader } from '@/shared/components/site-header';

const modules = [
  {
    number: '01',
    title: 'Pose engine',
    owner: 'Huy',
    icon: ScanLine,
    description: 'Turn movement into a shared language.',
    detail: 'Engine port, lifecycle & manual pose events',
    status: 'MOCK ADAPTER',
  },
  {
    number: '02',
    title: 'Visual experience',
    owner: 'Dũng',
    icon: Layers3,
    description: 'Make every action feel clear.',
    detail: 'Viewport, action instructions & progress UI',
    status: 'UI FOUNDATION',
  },
  {
    number: '03',
    title: 'Game orchestration',
    owner: 'Bình',
    icon: Workflow,
    description: 'Connect questions, actions and answers.',
    detail: 'Quiz gateway, fixtures & typed state',
    status: 'MOCK ADAPTER',
  },
];
export default function HomePage() {
  return (
    <div className="shell">
      <SiteHeader />
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">
              <span className="short-line" /> BODY-POWERED LEARNING
            </p>
            <h1>
              Think it.
              <br />
              <span>Move it.</span>
              <br />
              Answer it.
            </h1>
            <p className="hero-description">
              Action Quiz turns body movements into quiz answers. A clean
              foundation for an experience that gets everyone moving.
            </p>
            <div className="hero-actions">
              {process.env.NODE_ENV === 'development' && (
                <Link className="primary-button" href="/playground">
                  Open development playground{' '}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              )}
              <span className="muted text-sm">
                Phase 0 / Project initialization
              </span>
            </div>
          </div>
          <div
            className="hero-visual"
            aria-label="Illustration of a Y-Pose, not live tracking"
          >
            <span className="visual-label">ACTION POOL / 01 OF 08</span>
            <div className="pose-orbit orbit-one" />
            <div className="pose-orbit orbit-two" />
            <svg
              viewBox="0 0 320 360"
              className="pose-illustration"
              role="img"
              aria-label="Y-Pose illustration"
            >
              <g
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="160" cy="86" r="23" />
                <path d="M160 114 L160 213 M160 135 L109 104 L70 44 M160 135 L211 104 L250 44 M160 213 L121 295 L108 328 M160 213 L199 295 L212 328 M133 158 L187 158" />
              </g>
              <g fill="currentColor">
                {[
                  [160, 135],
                  [109, 104],
                  [70, 44],
                  [211, 104],
                  [250, 44],
                  [160, 213],
                  [121, 295],
                  [199, 295],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="6" />
                ))}
              </g>
            </svg>
            <div className="visual-caption">
              <div>
                <span className="eyebrow">ACT_01</span>
                <h2>Y-Pose</h2>
              </div>
              <MoveUpRight size={28} aria-hidden="true" />
            </div>
            <span className="illustration-label">
              CONCEPT ILLUSTRATION / NO CAMERA
            </span>
          </div>
        </section>
        <section className="foundation-strip" aria-label="Foundation status">
          <span>
            <Check size={16} /> Typed contracts
          </span>
          <span>
            <Check size={16} /> Independent modules
          </span>
          <span>
            <Check size={16} /> Mock-first development
          </span>
          <span className="muted">Built for 3 developers</span>
        </section>
        <section className="modules-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ONE FOUNDATION. THREE MODULES.</p>
              <h2>Ready to build together.</h2>
            </div>
            <span className="muted">Clear boundaries. Shared contracts.</span>
          </div>
          <div className="module-grid">
            {modules.map((module) => (
              <article className="module-card" key={module.number}>
                <div className="row">
                  <module.icon size={25} strokeWidth={1.5} aria-hidden="true" />
                  <span className="module-number">/{module.number}</span>
                </div>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <p className="module-detail">{module.detail}</p>
                <div className="module-footer">
                  <span className="badge">{module.status}</span>
                  <span>{module.owner}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="scope-section">
          <div>
            <p className="eyebrow">CURRENT SCOPE</p>
            <h2>
              A starting point for
              <br />
              something active.
            </h2>
          </div>
          <div>
            <p>
              The application runs entirely on mock adapters. The playground
              connects pose events to the interface and validates module
              contracts.
            </p>
            <p className="muted">
              Coming next: MediaPipe classifiers, camera and Canvas rendering,
              1500 ms hold detection, and Quiz API integration.
            </p>
            <div className="stack">
              {[
                'Next.js',
                'React',
                'TypeScript',
                'Tailwind CSS',
                'Zustand',
                'Zod',
                'Vitest',
              ].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer>
        <span>actionquiz / engineering foundation</span>
        <span>8 actions. 4 options. A new way to answer.</span>
      </footer>
    </div>
  );
}
