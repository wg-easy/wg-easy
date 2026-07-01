const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isPeerConnected(client: { latestHandshakeAt: Date | null }) {
  if (!client.latestHandshakeAt) {
    return false;
  }

  const lastHandshakeMs = Date.now() - client.latestHandshakeAt.getTime();

  // connected if last handshake was less than 10 minutes ago
  return lastHandshakeMs < 1000 * 60 * 10;
}

export function setIntervalImmediately(func: () => void, interval: number) {
  func();
  return setInterval(func, interval);
}

export function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseUtcDate(value: string) {
  if (!UTC_DATE_PATTERN.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatUtcDate(date) !== value) {
    return null;
  }

  return date;
}
