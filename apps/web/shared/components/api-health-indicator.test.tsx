import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ApiHealthIndicator } from './api-health-indicator';

it('keeps the playground usable without API configuration', async () => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', '');
  try {
    render(<ApiHealthIndicator />);
    expect(
      await screen.findByText(/Mock development remains available/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled();
  } finally {
    vi.unstubAllEnvs();
  }
});
