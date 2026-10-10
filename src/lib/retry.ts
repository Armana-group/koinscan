/** Run an async read again after a short pause when it fails. Public RPC
 *  nodes drop the odd request; one more try hides most of that. */
export async function retry<T>(run: () => Promise<T>, attempts = 2, delayMs = 1200): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
