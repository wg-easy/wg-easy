/** iproute2 reads numeric routing table IDs as unsigned 32-bit values in base 0. */
export function parseRoutingTableId(setting: string) {
  if (!/^\d+$/.test(setting)) {
    return;
  }
  const id = Number(setting.startsWith('0') ? `0o${setting}` : setting);
  if (Number.isSafeInteger(id) && id <= 0xffffffff) {
    return id;
  }
}
