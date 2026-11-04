import { describe, expect, it, vi } from 'vitest';
import { checkApiHealth } from './api-health-client';

describe('API health infrastructure', () => {
  it('validates an available API response', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ status: 'ok', service: 'Action Quiz API' }),
        ),
      );
    await expect(
      checkApiHealth('http://localhost:8000', { fetcher }),
    ).resolves.toEqual({ status: 'available', service: 'Action Quiz API' });
    expect(fetcher.mock.calls[0]?.[0].toString()).toBe(
      'http://localhost:8000/api/v1/health',
    );
  });
  it('does not request anything when configuration is absent', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(checkApiHealth(undefined, { fetcher })).resolves.toEqual({
      status: 'not_configured',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('handles unavailable, malformed and non-2xx responses without affecting mocks', async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockRejectedValueOnce(new Error('connection refused'));
    expect(
      (await checkApiHealth('http://localhost:8000', { fetcher })).status,
    ).toBe('unavailable');
    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'wrong' })),
    );
    expect(
      (await checkApiHealth('http://localhost:8000', { fetcher })).status,
    ).toBe('unavailable');
    fetcher.mockResolvedValueOnce(new Response('{}', { status: 503 }));
    expect(
      (await checkApiHealth('http://localhost:8000', { fetcher })).status,
    ).toBe('unavailable');
  });
});
