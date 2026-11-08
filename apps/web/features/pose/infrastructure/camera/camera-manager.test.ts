import type { CameraStatus } from '@action-quiz/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  CAMERA_CONSTRAINTS,
  CameraManager,
  cameraStatusForError,
  type CameraMediaDevices,
} from './camera-manager';

class FakeTrack extends EventTarget {
  readonly stop = vi.fn();

  end(): void {
    this.dispatchEvent(new Event('ended'));
  }
}

function fakeStream(...tracks: FakeTrack[]): MediaStream {
  return {
    getTracks: () => tracks,
  } as unknown as MediaStream;
}

function mediaDevices(
  getUserMedia: CameraMediaDevices['getUserMedia'],
): CameraMediaDevices {
  return { getUserMedia };
}

function namedError(name: string): Error {
  return Object.assign(new Error(name), { name });
}

describe('CameraManager', () => {
  it('requests the user camera with the agreed constraints', async () => {
    const stream = fakeStream(new FakeTrack());
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const manager = new CameraManager(mediaDevices(getUserMedia));
    const statuses: CameraStatus[] = [];
    manager.subscribe((status) => statuses.push(status));

    await expect(manager.initialize()).resolves.toBe(stream);

    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenCalledWith(CAMERA_CONSTRAINTS);
    expect(statuses).toEqual(['initializing', 'ready']);
    expect(manager.status).toBe('ready');
    expect(manager.getMediaStream()).toBe(stream);
  });

  it('shares one request and one active stream across duplicate initialization', async () => {
    const stream = fakeStream(new FakeTrack());
    let resolveRequest!: (stream: MediaStream) => void;
    const request = new Promise<MediaStream>((resolve) => {
      resolveRequest = resolve;
    });
    const getUserMedia = vi.fn().mockReturnValue(request);
    const manager = new CameraManager(mediaDevices(getUserMedia));

    const first = manager.initialize();
    const second = manager.initialize();
    expect(first).toBe(second);
    resolveRequest(stream);
    await expect(Promise.all([first, second])).resolves.toEqual([
      stream,
      stream,
    ]);
    await expect(manager.initialize()).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledOnce();
  });

  it.each([
    ['NotAllowedError', 'permission-denied'],
    ['SecurityError', 'permission-denied'],
    ['NotFoundError', 'not-found'],
    ['DevicesNotFoundError', 'not-found'],
    ['NotReadableError', 'error'],
  ] as const)('maps %s to %s', async (name, expectedStatus) => {
    const error = namedError(name);
    const manager = new CameraManager(
      mediaDevices(vi.fn().mockRejectedValue(error)),
    );
    await expect(manager.initialize()).rejects.toBe(error);
    expect(manager.status).toBe(expectedStatus);
    expect(manager.getMediaStream()).toBeNull();
    expect(cameraStatusForError(error)).toBe(expectedStatus);
  });

  it('moves to stopped and releases the stream when a track ends', async () => {
    const videoTrack = new FakeTrack();
    const extraTrack = new FakeTrack();
    const stream = fakeStream(videoTrack, extraTrack);
    const manager = new CameraManager(
      mediaDevices(vi.fn().mockResolvedValue(stream)),
    );
    const listener = vi.fn();
    manager.subscribe(listener);
    await manager.initialize();

    videoTrack.end();

    expect(manager.status).toBe('stopped');
    expect(manager.getMediaStream()).toBeNull();
    expect(videoTrack.stop).toHaveBeenCalledOnce();
    expect(extraTrack.stop).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenLastCalledWith('stopped');
  });

  it('can initialize a new stream after an unexpected track end', async () => {
    const firstTrack = new FakeTrack();
    const firstStream = fakeStream(firstTrack);
    const secondStream = fakeStream(new FakeTrack());
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(firstStream)
      .mockResolvedValueOnce(secondStream);
    const manager = new CameraManager(mediaDevices(getUserMedia));
    await manager.initialize();
    firstTrack.end();

    await expect(manager.initialize()).resolves.toBe(secondStream);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(manager.status).toBe('ready');
  });

  it('stops every track on disposal and is idempotent', async () => {
    const firstTrack = new FakeTrack();
    const secondTrack = new FakeTrack();
    const manager = new CameraManager(
      mediaDevices(
        vi.fn().mockResolvedValue(fakeStream(firstTrack, secondTrack)),
      ),
    );
    const listener = vi.fn();
    manager.subscribe(listener);
    await manager.initialize();

    manager.dispose();
    manager.dispose();

    expect(firstTrack.stop).toHaveBeenCalledOnce();
    expect(secondTrack.stop).toHaveBeenCalledOnce();
    expect(manager.status).toBe('stopped');
    expect(manager.getMediaStream()).toBeNull();
    expect(listener).toHaveBeenLastCalledWith('stopped');
    expect(() => manager.initialize()).toThrow('disposed');
    expect(() => manager.subscribe(vi.fn())).toThrow('disposed');
  });

  it('releases a stream that resolves after disposal', async () => {
    const track = new FakeTrack();
    const stream = fakeStream(track);
    let resolveRequest!: (stream: MediaStream) => void;
    const request = new Promise<MediaStream>((resolve) => {
      resolveRequest = resolve;
    });
    const manager = new CameraManager(
      mediaDevices(vi.fn().mockReturnValue(request)),
    );
    const initialization = manager.initialize();

    manager.dispose();
    resolveRequest(stream);

    await expect(initialization).rejects.toThrow(
      'disposed during initialization',
    );
    expect(track.stop).toHaveBeenCalledOnce();
    expect(manager.status).toBe('stopped');
    expect(manager.getMediaStream()).toBeNull();
  });
});
