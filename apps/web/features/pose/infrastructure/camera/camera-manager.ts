import type { CameraStatus } from '@action-quiz/contracts';

export const CAMERA_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  },
} as const satisfies MediaStreamConstraints;

export interface CameraMediaDevices {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
}

export class CameraManager {
  private currentStatus: CameraStatus = 'idle';
  private stream: MediaStream | null = null;
  private initialization: Promise<MediaStream> | null = null;
  private readonly listeners = new Set<(status: CameraStatus) => void>();
  private readonly trackEndedListeners = new Map<
    MediaStreamTrack,
    EventListener
  >();
  private disposed = false;

  constructor(private readonly mediaDevices: CameraMediaDevices) {}

  get status(): CameraStatus {
    return this.currentStatus;
  }

  getMediaStream(): MediaStream | null {
    return this.stream;
  }

  initialize(): Promise<MediaStream> {
    this.assertAlive();
    if (this.stream) return Promise.resolve(this.stream);
    if (this.initialization) return this.initialization;

    this.publishStatus('initializing');
    const initialization = Promise.resolve()
      .then(() => this.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS))
      .then((stream) => {
        if (this.disposed) {
          stopTracks(stream);
          throw new Error('Camera manager was disposed during initialization.');
        }
        this.stream = stream;
        this.listenForTrackEnded(stream);
        this.publishStatus('ready');
        return stream;
      })
      .catch((error: unknown) => {
        if (!this.disposed) this.publishStatus(cameraStatusForError(error));
        throw error;
      })
      .finally(() => {
        if (this.initialization === initialization) this.initialization = null;
      });
    this.initialization = initialization;
    return initialization;
  }

  subscribe(listener: (status: CameraStatus) => void): () => void {
    this.assertAlive();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const stream = this.stream;
    this.stream = null;
    this.removeTrackEndedListeners();
    if (stream) stopTracks(stream);
    this.publishStatus('stopped');
    this.listeners.clear();
  }

  private listenForTrackEnded(stream: MediaStream): void {
    for (const track of stream.getTracks()) {
      const listener: EventListener = () => {
        this.handleUnexpectedTrackEnd(stream);
      };
      track.addEventListener('ended', listener);
      this.trackEndedListeners.set(track, listener);
    }
  }

  private handleUnexpectedTrackEnd(stream: MediaStream): void {
    if (this.disposed || this.stream !== stream) return;
    this.stream = null;
    this.removeTrackEndedListeners();
    stopTracks(stream);
    this.publishStatus('stopped');
  }

  private removeTrackEndedListeners(): void {
    for (const [track, listener] of this.trackEndedListeners) {
      track.removeEventListener('ended', listener);
    }
    this.trackEndedListeners.clear();
  }

  private publishStatus(status: CameraStatus): void {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    for (const listener of [...this.listeners]) listener(status);
  }

  private assertAlive(): void {
    if (this.disposed) throw new Error('Camera manager has been disposed.');
  }
}

export function cameraStatusForError(error: unknown): CameraStatus {
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String(error.name)
      : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'permission-denied';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'not-found';
  }
  return 'error';
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}
