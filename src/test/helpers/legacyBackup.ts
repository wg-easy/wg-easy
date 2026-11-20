export function legacyBackup(
  preSharedKey: string | null = Buffer.alloc(32, 5).toString('base64')
) {
  // The public keys were derived from these test inputs with wg pubkey.
  return {
    server: {
      privateKey: Buffer.alloc(32, 1).toString('base64'),
      publicKey: 'pOCSkrZRwni5dyxWn1+puxPZBrRqtoyd+dwrRAn4ogk=',
      address: '10.9.0.15',
    },
    clients: {
      peer: {
        name: 'Imported',
        address: '10.9.0.1',
        privateKey: Buffer.alloc(32, 3).toString('base64'),
        publicKey: 'Xf7dO2vUf2+ijuFdlp1bsOpTd01Ii9r53xxuASSz7yI=',
        preSharedKey,
        enabled: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    },
  };
}
