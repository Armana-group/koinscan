interface RpcReadQueueOptions {
  intervalMs: number;
  retries: number;
  retryDelayMs: number;
  timeoutMs: number;
}

export function createRpcReadQueue(options: RpcReadQueueOptions) {
  let queue: Promise<void> = Promise.resolve();
  let nextReadAt = 0;

  const delay = (milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

  const withTimeout = async <T>(read: () => Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("RPC read timed out")),
            options.timeoutMs
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const enqueueAttempt = <T>(read: () => Promise<T>): Promise<T> => {
    const run = async () => {
      const wait = Math.max(0, nextReadAt - Date.now());
      if (wait > 0) await delay(wait);
      nextReadAt = Date.now() + options.intervalMs;
      return withTimeout(read);
    };

    const result = queue.then(run, run);
    queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  };

  return async function queueRpcRead<T>(read: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await enqueueAttempt(read);
      } catch (error) {
        if (attempt >= options.retries) throw error;
        await delay(options.retryDelayMs * 2 ** attempt);
      }
    }
  };
}
