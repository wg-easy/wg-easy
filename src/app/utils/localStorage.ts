export type LocalStorage = {
  uiShowCharts: '1' | '0';
  lang: string;
  uiChartType: 'area' | 'bar' | 'line';
};

export function getItem<K extends keyof LocalStorage>(
  item: K
): LocalStorage[K] | null {
  if (import.meta.client) {
    return localStorage.getItem(item) as LocalStorage[K] | null;
  } else {
    return null;
  }
}

export function setItem<K extends keyof LocalStorage>(
  item: K,
  value: LocalStorage[K]
) {
  if (import.meta.client) {
    localStorage.setItem(item, value);

    return true;
  } else {
    return false;
  }
}
