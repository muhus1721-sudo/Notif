import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T };

/**
 * Runs `load` whenever the screen comes into focus (so progress made on a deeper screen
 * shows up on return). `load` must be memoised with useCallback. Old data stays on screen
 * while a refresh is in flight.
 */
export function useLoader<T>(load: () => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      load().then(
        (data) => !cancelled && setState({ status: 'ready', data }),
        (e: unknown) =>
          !cancelled &&
          setState((prev) =>
            prev.status === 'ready' ? prev : { status: 'error', error: e instanceof Error ? e.message : String(e) },
          ),
      );
      return () => {
        cancelled = true;
      };
      // `attempt` re-runs the load when retry() is called.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, attempt]),
  );

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
