import Link from 'next/link';
import { Activity, ArrowUpRight } from 'lucide-react';

export function SiteHeader({ playground = false }: { playground?: boolean }) {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-symbol">
          <Activity size={23} aria-hidden="true" />
        </span>
        action<span className="brand-light">quiz</span>
        <span className="version">/ 0.1</span>
      </Link>
      <nav aria-label="Main navigation">
        <span className="environment">
          <span className="status-dot" /> PHASE 0
        </span>
        {process.env.NODE_ENV === 'development' && (
          <Link href={playground ? '/' : '/playground'}>
            {playground ? 'Overview' : 'Playground'}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        )}
      </nav>
    </header>
  );
}
