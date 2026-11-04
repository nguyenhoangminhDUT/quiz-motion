import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// jsdom has no raster Canvas. Drawing tests provide their own recording context.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(cleanup);

// React 19 needs this flag when Vitest globals are disabled.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
