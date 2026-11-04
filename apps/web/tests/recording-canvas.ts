import { vi } from 'vitest';

/** Records geometry and lifecycle calls; it does not emulate browser rasterization. */
export function recordingCanvasContext() {
  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
  } satisfies Pick<
    CanvasRenderingContext2D,
    | 'clearRect'
    | 'save'
    | 'restore'
    | 'beginPath'
    | 'rect'
    | 'clip'
    | 'moveTo'
    | 'lineTo'
    | 'stroke'
    | 'arc'
    | 'fill'
    | 'setTransform'
    | 'strokeStyle'
    | 'fillStyle'
    | 'lineWidth'
    | 'lineCap'
    | 'lineJoin'
  >;
}
