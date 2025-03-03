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
