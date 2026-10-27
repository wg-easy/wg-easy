/** Prevent overlapping runs and finish an active run before shutdown. */
export function startMaintenance(
  operation: () => Promise<void>,
  interval = 60_000
) {
  let pending: Promise<void> | undefined;
  const tick = () => {
    if (pending) return;
    pending = operation()
      .catch((error) => {
        console.error('Running VPN maintenance failed:', error);
      })
      .finally(() => {
        pending = undefined;
      });
  };
  const timer = setInterval(tick, interval);
  tick();
  return async () => {
    clearInterval(timer);
    await pending;
  };
}
