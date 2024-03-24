export function useBytes() {
  const bytes = (bytes, decimals, kib, maxunit) => {
    kib = kib || false;
    if (bytes === 0) return '0 B';
    if (Number.isNaN(parseFloat(bytes)) && !Number.isFinite(bytes)) return 'NaN';
    const k = kib ? 1024 : 1000;
    const dm = decimals != null && !Number.isNaN(decimals) && decimals >= 0 ? decimals : 2;
    const sizes = kib
      ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB', 'BiB']
      : ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
    let i = Math.floor(Math.log(bytes) / Math.log(k));
    if (maxunit !== undefined) {
      const index = sizes.indexOf(maxunit);
      if (index !== -1) i = index;
    }
    // eslint-disable-next-line no-restricted-properties
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return { bytes };
}
