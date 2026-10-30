type StatusFields = {
  publicKey: string;
  latestHandshakeAt: Date | null;
  endpoint: string | null;
  transferRx: number | null;
  transferTx: number | null;
};

export function mergeClientStatuses<T extends { publicKey: string }>(
  clients: T[],
  statuses: readonly StatusFields[]
) {
  const byPublicKey = new Map(
    statuses.map((status) => [status.publicKey, status])
  );
  return clients.map((client) => {
    const status = byPublicKey.get(client.publicKey);
    return {
      ...client,
      latestHandshakeAt: status?.latestHandshakeAt ?? null,
      endpoint: status?.endpoint ?? null,
      transferRx: status?.transferRx ?? null,
      transferTx: status?.transferTx ?? null,
    };
  });
}
