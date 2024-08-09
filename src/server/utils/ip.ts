export function isValidIPv4(str: string) {
  const blocks = str.split('.');
  if (blocks.length !== 4) return false;

  for (const value of blocks) {
    const num = parseInt(value, 10);
    if (Number.isNaN(value)) return false;
    if (num < 0 || num > 255) return false;
  }

  return true;
}
