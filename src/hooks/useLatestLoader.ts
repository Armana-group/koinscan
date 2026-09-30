"use client";

import { useLayoutEffect, useMemo } from "react";

import { createLatestLoader } from "@/lib/latestLoader";

/** The memoized scope identifies the account, pool, or provider being loaded. */
export function useLatestLoader(scope: unknown) {
  // A changed scope must own a new loader, even though it is not read by the factory.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loader = useMemo(() => createLatestLoader(), [scope]);

  useLayoutEffect(() => {
    loader.activate();
    return () => loader.invalidate();
  }, [loader]);

  return loader.run;
}
