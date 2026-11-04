import type { ReactNode } from 'react';
import { CameraOff } from 'lucide-react';

/** Presentation slot for future client-side video and canvas resources. */
export function CameraViewport({ overlay }: { overlay?: ReactNode }) {
  return (
    <section className="viewport" aria-label="Camera viewport placeholder">
      <span className="viewport-corner">INPUT / SIMULATED</span>
      <div className="viewport-center">
        <CameraOff size={36} strokeWidth={1.2} aria-hidden="true" />
        <h3>Camera is not connected</h3>
        <p>Use the controls below to send mock pose events.</p>
        <span className="badge">NO CAMERA ACCESS</span>
      </div>
      {overlay}
      <span className="viewport-bottom">
        MediaPipe + webcam pipeline / Phase 1
      </span>
    </section>
  );
}
