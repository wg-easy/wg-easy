import type { H3Event } from 'h3';
import type { ID } from '#db/schema';

export type WGSession = Partial<{
  userId: ID;
}>;

const name = 'wg-easy';

export async function useWGSession(event: H3Event) {
  const sessionConfig = await Database.sessionConfig.get();
  return useSession<WGSession>(event, {
    password: sessionConfig.password,
    name,
    cookie: {},
  });
}

export async function getWGSession(event: H3Event) {
  const sessionConfig = await Database.sessionConfig.get();
  return getSession<WGSession>(event, {
    password: sessionConfig.password,
    name,
    cookie: {},
  });
}
