import { authorize, authorizeClient, type Actor } from './policies';

import { wg } from '#server/utils/wgHelper';
import { getDatabase } from '#db';
import type { ClientQueryType } from '#shared/contracts/client';
import { mergeClientStatuses } from '#server/utils/clientStatus';
import { roles } from '#shared/utils/permissions';
import { isPeerConnected } from '#shared/utils/time';

async function dump() {
  return wg.dump((await getDatabase().interfaces.get()).name);
}

export async function list(actor: Actor, query: ClientQueryType) {
  authorize(actor, 'clients', 'custom');
  const peers = await dump();
  const timestamp = Date.now();
  const onlineKeys =
    query.status === 'online' || query.status === 'offline'
      ? peers
          .filter((peer) => isPeerConnected(peer, timestamp))
          .map((peer) => peer.publicKey)
      : [];
  const result = await getDatabase().clients.getPage(
    query,
    actor.role === roles.ADMIN ? undefined : actor.id,
    onlineKeys,
    timestamp
  );
  return {
    ...result,
    clients: mergeClientStatuses(result.clients, peers),
  };
}

export async function get(actor: Actor, id: number) {
  const client = authorizeClient(
    actor,
    'view',
    await getDatabase().clients.getPublic(id)
  );
  const peer = (await dump()).find(
    (peer) => peer.publicKey === client.publicKey
  );
  return { ...client, endpoint: peer?.endpoint };
}
