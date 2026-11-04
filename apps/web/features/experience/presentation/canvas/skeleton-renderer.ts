import type { PoseLandmark, TrackingStatus } from '@action-quiz/contracts';

// MediaPipe's 33-landmark index convention. Missing slots must not be compacted.
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
const CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7],
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  [9, 10],
  [11, 12],
  [11, 13],
  [13, 15],
  [15, 17],
  [15, 19],
  [15, 21],
  [17, 19],
  [12, 14],
  [14, 16],
  [16, 18],
  [16, 20],
  [16, 22],
  [18, 20],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [24, 26],
  [25, 27],
  [26, 28],
  [27, 29],
  [28, 30],
  [29, 31],
  [30, 32],
  [27, 31],
  [28, 32],
] as const;

export interface SkeletonViewport {
  readonly width: number;
  readonly height: number;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly mirrored: boolean;
  readonly fit: 'contain' | 'cover';
}

export interface SkeletonDrawing extends SkeletonViewport {
  readonly landmarks: readonly PoseLandmark[];
  readonly trackingStatus: TrackingStatus;
  readonly minVisibility: number;
}

type DrawingContext = Pick<
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
  | 'strokeStyle'
  | 'fillStyle'
  | 'lineWidth'
  | 'lineCap'
  | 'lineJoin'
>;

function sourceRectangle(viewport: SkeletonViewport) {
  const { width, height, sourceWidth, sourceHeight, fit } = viewport;
  if (
    ![width, height, sourceWidth, sourceHeight].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  )
    return null;

  const scale = (fit === 'cover' ? Math.max : Math.min)(
    width / sourceWidth,
    height / sourceHeight,
  );
  const imageWidth = sourceWidth * scale;
  const imageHeight = sourceHeight * scale;
  return {
    x: (width - imageWidth) / 2,
    y: (height - imageHeight) / 2,
    width: imageWidth,
    height: imageHeight,
  };
}

export function projectLandmark(
  point: PoseLandmark,
  viewport: SkeletonViewport,
) {
  if (![point.x, point.y, point.z].every(Number.isFinite)) return null;
  const image = sourceRectangle(viewport);
  if (!image) return null;
  return {
    x: image.x + (viewport.mirrored ? 1 - point.x : point.x) * image.width,
    y: image.y + point.y * image.height,
  };
}

export function drawSkeleton(
  context: DrawingContext,
  drawing: SkeletonDrawing,
) {
  const { width, height, landmarks, trackingStatus } = drawing;
  context.clearRect(0, 0, width, height);
  if (trackingStatus !== 'tracking') return;
  const image = sourceRectangle(drawing);
  if (!image) return;

  const threshold = Number.isFinite(drawing.minVisibility)
    ? Math.min(1, Math.max(0, drawing.minVisibility))
    : 0.5;
  const points = landmarks.slice(0, 33).map((point) => {
    const visibility = point.visibility ?? 1;
    const presence = point.presence ?? 1;
    if (
      ![visibility, presence].every(Number.isFinite) ||
      visibility < threshold ||
      presence < threshold
    )
      return null;
    return projectLandmark(point, drawing);
  });

  // Clipping preserves geometry for out-of-frame points; do not clamp them to edges.
  context.save();
  context.beginPath();
  context.rect(image.x, image.y, image.width, image.height);
  context.clip();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 3;
  context.strokeStyle = '#35583b';
  context.beginPath();
  for (const [start, end] of CONNECTIONS) {
    const a = points[start];
    const b = points[end];
    if (!a || !b) continue;
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
  }
  context.stroke();

  context.fillStyle = '#d2f47b';
  context.lineWidth = 1.5;
  for (const point of points) {
    if (!point) continue;
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  context.restore();
}
