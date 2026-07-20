export function escapePrometheusLabelValue(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll('"', '\\"');
}

export function formatPrometheusLabels(
  labels: Record<string, string | number | boolean>
): string {
  return Object.entries(labels)
    .map(
      ([name, value]) =>
        `${name}="${escapePrometheusLabelValue(String(value))}"`
    )
    .join(',');
}
