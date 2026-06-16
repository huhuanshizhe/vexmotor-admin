'use client';

import { useEffect, useRef, useState } from 'react';

type SwrState<T> = {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
};

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60_000; // 1 minute client-side cache
const inFlight = new Map<string, Promise<unknown>>();

export function useSwr<T>(url: string | null): SwrState<T> {
  const [state, setState] = useState<SwrState<T>>({ data: undefined, error: undefined, isLoading: !!url });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!url) {
      setState({ data: undefined, error: undefined, isLoading: false });
      return;
    }

    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setState({ data: cached.data as T, error: undefined, isLoading: false });
      return;
    }

    if (inFlight.has(url)) {
      const promise = inFlight.get(url)!;
      promise.then((data) => {
        if (mountedRef.current) {
          setState({ data: data as T, error: undefined, isLoading: false });
        }
      }).catch((err: Error) => {
        if (mountedRef.current) {
          setState({ data: undefined, error: err, isLoading: false });
        }
      });
      setState((prev) => ({ ...prev, isLoading: true }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));
    const promise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        cache.set(url, { data, timestamp: Date.now() });
        inFlight.delete(url);
        return data;
      });

    inFlight.set(url, promise);

    promise.then((data) => {
      if (mountedRef.current) {
        setState({ data: data as T, error: undefined, isLoading: false });
      }
    }).catch((err: Error) => {
      if (mountedRef.current) {
        setState({ data: undefined, error: err, isLoading: false });
      }
    });
  }, [url]);

  return state;
}
