// A 32-byte key has 43 base64 symbols, two zero padding bits and one '='.
export const wireGuardKeyPattern = /^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/;
export const zeroWireGuardKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
