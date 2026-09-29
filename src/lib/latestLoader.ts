interface LoaderCallbacks<T> {
  onStart?: () => void;
  onSuccess: (value: T) => void;
  onError: (error: unknown) => void;
  onFinally?: () => void;
}

export function createLatestLoader() {
  let active = false;
  let generation = 0;

  return {
    activate() {
      active = true;
      generation += 1;
    },
    invalidate() {
      active = false;
      generation += 1;
    },
    async run<T>(read: () => Promise<T>, callbacks: LoaderCallbacks<T>) {
      if (!active) return;
      const request = ++generation;
      const isCurrent = () => active && request === generation;
      callbacks.onStart?.();
      try {
        const value = await read();
        if (isCurrent()) callbacks.onSuccess(value);
      } catch (error) {
        if (isCurrent()) callbacks.onError(error);
      } finally {
        if (isCurrent()) callbacks.onFinally?.();
      }
    },
  };
}
