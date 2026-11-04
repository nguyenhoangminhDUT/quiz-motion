import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

// React 19 needs this flag when Vitest globals are disabled.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
