import type { H3Event } from 'h3';

export type WGSession = {
  authenticated: boolean
}

export function useWGSession(event: H3Event) {
  return useSession<Partial<WGSession>>(event, SESSION_CONFIG);
}