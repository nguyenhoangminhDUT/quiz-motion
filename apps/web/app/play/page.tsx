import type { Metadata } from 'next';
import { CameraGameClient } from '@/composition/camera-game-client';
import { SiteHeader } from '@/shared/components/site-header';
import styles from '@/composition/camera-game.module.css';

export const metadata: Metadata = { title: 'Play | Action Quiz' };

export default function PlayPage() {
  return (
    <div className={`shell ${styles.playShell}`}>
      <SiteHeader />
      <main className={styles.playMain}>
        <CameraGameClient />
      </main>
    </div>
  );
}
