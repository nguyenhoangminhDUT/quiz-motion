import { z } from 'zod';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string().min(1),
});
export type ApiHealthResult =
  | { readonly status: 'available'; readonly service: string }
  | { readonly status: 'not_configured' }
  | { readonly status: 'unavailable'; readonly message: string };

export async function checkApiHealth(
  baseUrl: string | undefined,
  options: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<ApiHealthResult> {
  if (!baseUrl?.trim()) return { status: 'not_configured' };
  try {
    const url = new URL('/api/v1/health', baseUrl);
    if (!['http:', 'https:'].includes(url.protocol))
      throw new Error('Invalid API URL');
    const timeout = AbortSignal.timeout(3000);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout;
    const response = await (options.fetcher ?? fetch)(url, {
      signal,
      cache: 'no-store',
    });
    if (!response.ok)
      return {
        status: 'unavailable',
        message: 'API returned HTTP ' + response.status,
      };
    const payload: unknown = await response.json();
    const parsed = healthResponseSchema.safeParse(payload);
    if (!parsed.success)
      return { status: 'unavailable', message: 'Invalid API health response.' };
    return { status: 'available', service: parsed.data.service };
  } catch {
    return { status: 'unavailable', message: 'API connection unavailable.' };
  }
}
