import assert from "node:assert/strict";
import { test } from "node:test";

import { createLatestLoader } from "./latestLoader";
import { createRpcReadQueue } from "./rpcReadQueue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("an old account's successful retry cannot replace the new account's balance", async () => {
  const queue = createRpcReadQueue({
    intervalMs: 0,
    retries: 1,
    retryDelayMs: 10,
    timeoutMs: 100,
  });
  const oldAccount = createLatestLoader();
  const newAccount = createLatestLoader();
  oldAccount.activate();
  const failedAttempt = deferred<void>();
  let attempts = 0;
  let balance: number | null = null;
  const commits: number[] = [];
  const callbacks = {
    onSuccess: (value: number) => {
      balance = value;
      commits.push(value);
    },
    onError: () => {
      balance = null;
    },
  };

  const oldLoad = oldAccount.run(
    () =>
      queue(async () => {
        attempts += 1;
        if (attempts === 1) {
          failedAttempt.resolve();
          throw new Error("temporary failure");
        }
        return 1000;
      }),
    callbacks,
  );
  await failedAttempt.promise;
  oldAccount.invalidate();
  newAccount.activate();
  const newLoad = newAccount.run(() => queue(async () => 1), callbacks);

  await Promise.all([oldLoad, newLoad]);
  assert.equal(attempts, 2);
  assert.equal(balance, 1);
  assert.deepEqual(commits, [1]);
});

test("an older failure cannot replace the current error or stop its loading state", async () => {
  const loader = createLatestLoader();
  loader.activate();
  const oldRead = deferred<number>();
  const newRead = deferred<number>();
  let loading = false;
  let error: unknown = null;
  let balance: number | null = null;
  const callbacks = {
    onStart: () => {
      loading = true;
      error = null;
    },
    onSuccess: (value: number) => {
      balance = value;
    },
    onError: (failure: unknown) => {
      error = failure;
      balance = null;
    },
    onFinally: () => {
      loading = false;
    },
  };
  const oldLoad = loader.run(() => oldRead.promise, callbacks);
  const newLoad = loader.run(() => newRead.promise, callbacks);
  oldRead.reject(new Error("old failure"));
  await oldLoad;

  assert.equal(error, null);
  assert.equal(loading, true);
  newRead.resolve(1);
  await newLoad;
  assert.equal(balance, 1);
  assert.equal(loading, false);
});

test("a callback from an invalidated account, pool, or provider cannot start another load", async () => {
  const loader = createLatestLoader();
  loader.activate();
  loader.invalidate();
  let reads = 0;
  const updates: string[] = [];

  await loader.run(
    async () => {
      reads += 1;
      return 1000;
    },
    {
      onStart: () => {
        updates.push("start");
      },
      onSuccess: () => {
        updates.push("success");
      },
      onError: () => {
        updates.push("error");
      },
      onFinally: () => {
        updates.push("finally");
      },
    },
  );

  assert.equal(reads, 0);
  assert.deepEqual(updates, []);
});

test("reactivating a loader does not accept results from its previous lifetime", async () => {
  const loader = createLatestLoader();
  const oldRead = deferred<number>();
  const commits: number[] = [];
  const callbacks = {
    onSuccess: (value: number) => {
      commits.push(value);
    },
    onError: () => {},
  };
  loader.activate();
  const oldLoad = loader.run(() => oldRead.promise, callbacks);
  loader.invalidate();
  loader.activate();
  await loader.run(async () => 1, callbacks);
  oldRead.resolve(1000);
  await oldLoad;

  assert.deepEqual(commits, [1]);
});
