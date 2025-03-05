export function bytes(
  bytes: number,
  decimals = 2,
  kib = false,
  maxunit?: string
) {
  if (bytes === 0) return '0 B';
  if (Number.isNaN(bytes) && !Number.isFinite(bytes)) return 'NaN';
  const k = kib ? 1024 : 1000;
  const dm =
    decimals != null && !Number.isNaN(decimals) && decimals >= 0 ? decimals : 2;
  const sizes = kib
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB', 'BiB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  if (maxunit !== undefined) {
    const index = sizes.indexOf(maxunit);
    if (index !== -1) i = index;
  }
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Sorts an array of objects by a specified property in ascending or descending order.
 *
 * @param array The array of objects to be sorted.
 * @param property The property to sort the array by.
 * @param sort Whether to sort the array in ascending (default, true) or descending order (false).
 */
export function sortByProperty<T>(
  array: T[],
  property: keyof T,
  sort: boolean = true
): T[] {
  if (sort) {
    return array.sort((a, b) =>
      typeof a[property] === 'string'
        ? (a[property] as string).localeCompare(b[property] as string)
        : (a[property] as number) - (b[property] as number)
    );
  }

  return array.sort((a, b) =>
    typeof a[property] === 'string'
      ? (b[property] as string).localeCompare(a[property] as string)
      : (b[property] as number) - (a[property] as number)
  );
}
