import type { H3Event } from 'h3';

export type WGSession = Partial<{
  userId: string;
}>;

export async function useWGSession(event: H3Event) {
  const system = await Database.system.get();
  return useSession<WGSession>(event, system.sessionConfig);
}
