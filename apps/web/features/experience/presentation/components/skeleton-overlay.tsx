'use client';

import { useEffect, useRef } from 'react';
import type { PoseLandmark, TrackingStatus } from '@action-quiz/contracts';
import {
  drawSkeleton,
  type SkeletonDrawing,
} from '../canvas/skeleton-renderer';
import styles from './gameplay.module.css';

export interface SkeletonOverlayProps {
  readonly landmarks: readonly PoseLandmark[];
  readonly trackingStatus?: TrackingStatus;
  readonly mirrored?: boolean;
  readonly sourceWidth?: number;
  readonly sourceHeight?: number;
  readonly fit?: 'contain' | 'cover';
  readonly minVisibility?: number;
  readonly label?: string;
}

/** Indexed normalized input; drawing and sizing do not use React state. */
export function SkeletonOverlay({
  landmarks,
  trackingStatus = 'tracking',
  mirrored = false,
  sourceWidth = 640,
  sourceHeight = 480,
  fit = 'contain',
  minVisibility = 0.5,
  label = 'Pose skeleton overlay',
}: SkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const invalidateRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<Omit<SkeletonDrawing, 'width' | 'height'>>({
    landmarks,
    trackingStatus,
    mirrored,
    sourceWidth,
    sourceHeight,
    fit,
    minVisibility,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    let active = true;
    let pendingFrame: number | null = null;
    let resolutionQuery: MediaQueryList | null = null;

    function paint() {
      pendingFrame = null;
      if (!active || !canvas || !context) return;
      const { width, height } = canvas.getBoundingClientRect();
      if (width <= 0 || height <= 0) {
        canvas.width = 0;
        canvas.height = 0;
        return;
      }
      const ratio =
        Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0
          ? window.devicePixelRatio
          : 1;
      const pixelWidth = Math.max(1, Math.round(width * ratio));
      const pixelHeight = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      context.setTransform(
        pixelWidth / width,
        0,
        0,
        pixelHeight / height,
        0,
        0,
      );
      drawSkeleton(context, { ...inputRef.current, width, height });
    }

    function invalidate() {
      if (active && pendingFrame === null)
        pendingFrame = window.requestAnimationFrame(paint);
    }

    function watchResolution() {
      resolutionQuery?.removeEventListener('change', onResolutionChange);
      if (typeof window.matchMedia !== 'function') return;
      resolutionQuery = window.matchMedia(
        `(resolution: ${window.devicePixelRatio}dppx)`,
      );
      resolutionQuery.addEventListener('change', onResolutionChange);
    }

    function onResolutionChange() {
      if (!active) return;
      watchResolution();
      invalidate();
    }

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(invalidate);
    observer?.observe(canvas);
    window.addEventListener('resize', invalidate);
    watchResolution();
    invalidateRef.current = invalidate;
    invalidate();

    return () => {
      active = false;
      invalidateRef.current = null;
      if (pendingFrame !== null) window.cancelAnimationFrame(pendingFrame);
      observer?.disconnect();
      window.removeEventListener('resize', invalidate);
      resolutionQuery?.removeEventListener('change', onResolutionChange);
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, []);

  useEffect(() => {
    inputRef.current = {
      landmarks,
      trackingStatus,
      mirrored,
      sourceWidth,
      sourceHeight,
      fit,
      minVisibility,
    };
    invalidateRef.current?.();
  }, [
    landmarks,
    trackingStatus,
    mirrored,
    sourceWidth,
    sourceHeight,
    fit,
    minVisibility,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.skeletonCanvas}
      role="img"
      aria-label={label}
    >
      Skeleton drawing requires a browser with Canvas support.
    </canvas>
  );
}
