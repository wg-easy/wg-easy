import { describe, expect, test } from 'vitest';

import { mergeClientStatuses } from '#server/utils/clientStatus';

describe('mergeClientStatuses', () => {
  test('merges matching status records by public key', () => {
    const clients = [
      {
        id: 1,
        publicKey: 'first',
        latestHandshakeAt: null,
        endpoint: null,
        transferRx: null,
        transferTx: null,
      },
      {
        id: 2,
        publicKey: 'second',
        latestHandshakeAt: null,
        endpoint: null,
        transferRx: null,
        transferTx: null,
      },
    ];
    const handshake = new Date('2026-07-20T00:00:00Z');

    const result = mergeClientStatuses(clients, [
      {
        publicKey: 'second',
        latestHandshakeAt: handshake,
        endpoint: '192.0.2.1:51820',
        transferRx: 100,
        transferTx: 200,
      },
      {
        publicKey: 'unknown',
        latestHandshakeAt: null,
        endpoint: null,
        transferRx: 0,
        transferTx: 0,
      },
    ]);

    expect(result).toBe(clients);
    expect(result[0]?.endpoint).toBeNull();
    expect(result[1]).toMatchObject({
      latestHandshakeAt: handshake,
      endpoint: '192.0.2.1:51820',
      transferRx: 100,
      transferTx: 200,
    });
  });
});
