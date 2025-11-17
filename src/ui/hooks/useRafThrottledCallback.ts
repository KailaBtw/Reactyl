import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a callback that batches rapid invocations into a single
 * requestAnimationFrame tick so UI updates never block animation frames.
 */
export function useRafThrottledCallback<T extends any[]>(
  callback: (...args: T) => void
): (...args: T) => void {
  const callbackRef = useRef(callback);
  const frameRef = useRef<number | null>(null);
  const latestArgsRef = useRef<T>();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return useCallback((...args: T) => {
    latestArgsRef.current = args;
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (latestArgsRef.current) {
        callbackRef.current(...latestArgsRef.current);
      }
    });
  }, []);
}

