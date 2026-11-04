export function useHydrationTime() {
  const initialTime = useState('hydration-time', () => Date.now());
  const mounted = useMounted();

  // Keep the first client render on the server's clock, then use live time.
  return () => (mounted.value ? Date.now() : initialTime.value);
}
