type StatusFields = {
  publicKey: string;
  latestHandshakeAt: Date | null;
  endpoint: string | null;
  transferRx: number | null;
  transferTx: number | null;
};

export function mergeClientStatuses<T extends StatusFields>(
  clients: T[],
  statuses: readonly StatusFields[]
): T[] {
  const clientsByPublicKey = new Map(
    clients.map((client) => [client.publicKey, client])
  );

  for (const status of statuses) {
    const client = clientsByPublicKey.get(status.publicKey);
    if (!client) {
      continue;
    }

    client.latestHandshakeAt = status.latestHandshakeAt;
    client.endpoint = status.endpoint;
    client.transferRx = status.transferRx;
    client.transferTx = status.transferTx;
  }

  return clients;
}
