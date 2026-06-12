/**
 * Run async work triggered from useEffect without calling setState synchronously
 * in the effect body (satisfies react-hooks/set-state-in-effect).
 *
 * Usage:
 * ```ts
 * useEffect(() => {
 *   let cancelled = false;
 *   runAsyncEffect(fetchData, {
 *     isCancelled: () => cancelled,
 *     onSuccess: (data) => setData(data),
 *     onError: handleError,
 *   });
 *   return () => { cancelled = true; };
 * }, [deps]);
 * ```
 */
export function runAsyncEffect<T>(
  task: () => Promise<T>,
  options: {
    isCancelled?: () => boolean;
    onSuccess: (value: T) => void;
    onError?: (error: unknown) => void;
  },
): void {
  const isCancelled = options.isCancelled ?? (() => false);

  void task()
    .then((value) => {
      if (isCancelled()) return;
      options.onSuccess(value);
    })
    .catch((error: unknown) => {
      if (isCancelled()) return;
      options.onError?.(error);
    });
}
