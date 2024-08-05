export function getRandomHex(size: number) {
  const array = new Uint8Array(size);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}
