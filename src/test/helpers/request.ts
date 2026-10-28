import type { RequestEvent } from 'nuxt/server';

/** A portable event with no H3-specific properties. */
export function requestEvent(
  url: string,
  init?: RequestInit,
  clientAddress?: string
): RequestEvent {
  return {
    req: Object.assign(new Request(url, init), {
      context: { clientAddress },
    }),
    url: new URL(url),
    res: { headers: new Headers() },
    context: {},
  };
}
