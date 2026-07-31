"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Loads asynchronous data for a screen.
 *
 * Every state update happens inside a promise callback, never synchronously in the effect body.
 * That is what React 19's `react-hooks/set-state-in-effect` rule asks for, and it also avoids the
 * cascading render the rule exists to prevent. Implementing it once here keeps the three admin
 * screens from each re-deriving the pattern.
 *
 * The effect is keyed on `loader` itself: callers pass a `useCallback`-memoised function, so its
 * dependencies *are* this hook's dependencies. That removes the usual duplicated dependency
 * array — and the lint suppression that comes with it.
 *
 * Previous data is kept while a refetch is in flight, so changing a filter updates the list in
 * place instead of flashing an empty state.
 */
export interface AsyncData<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  /** Refetch with the current loader. Safe to call from an event handler. */
  reload: () => void;
  /** Apply a local change without a round-trip (e.g. after a status toggle). */
  patch: (updater: (current: T) => T) => void;
}

export function useAsyncData<T>(loader: (signal: AbortSignal) => Promise<T>): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    loader(controller.signal).then(
      (value) => {
        if (controller.signal.aborted) return;
        setData(value);
        setError(null);
        setLoading(false);
      },
      (caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(caught);
        setLoading(false);
      },
    );

    return () => controller.abort();
  }, [loader, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const patch = useCallback((updater: (current: T) => T) => {
    setData((current) => (current === null ? current : updater(current)));
  }, []);

  return { data, loading, error, reload, patch };
}
