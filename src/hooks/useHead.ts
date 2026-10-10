"use client";

// The head of the chain, polled through the koilib provider so a custom node
// is respected. Pages use it for "just now", finality and neighbour links.
//
// After the first poll, polling stops while the tab is hidden and resumes the
// moment it is shown again: a few background tabs each asking every couple of seconds is enough
// to get a visitor rate-limited by the public nodes. After an error the
// interval backs off, up to ten times the usual, until a poll succeeds.
import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";

export interface HeadInfo {
  height: number;
  id: string;
  time: number;
  lastIrreversible: number;
  receivedAt: number;
}

export function useHead(pollMs = 3000): HeadInfo | null {
  const { provider } = useWallet();
  const [head, setHead] = useState<HeadInfo | null>(null);

  useEffect(() => {
    if (!provider) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polling = false;
    let delay = pollMs;
    const hidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

    const schedule = () => {
      if (!active || pollMs <= 0 || hidden()) return;
      timer = setTimeout(poll, delay);
    };

    const poll = async () => {
      if (!active || polling) return;
      polling = true;
      try {
        const info = await provider.getHeadInfo();
        if (!active) return;
        delay = pollMs;
        const height = Number(info.head_topology.height);
        setHead((previous) =>
          previous && previous.height === height
            ? previous
            : {
                height,
                id: info.head_topology.id,
                time: Number(info.head_block_time),
                lastIrreversible: Number(info.last_irreversible_block),
                receivedAt: Date.now(),
              },
        );
      } catch (error) {
        console.info("[head] unavailable:", error);
        delay = Math.min(delay * 2, pollMs * 10);
      } finally {
        polling = false;
        schedule();
      }
    };

    const onVisibility = () => {
      if (hidden()) {
        if (timer) clearTimeout(timer);
        timer = undefined;
      } else if (!timer && !polling) {
        void poll();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    // Always poll once, even in a background tab, so the page has data when it is shown.
    void poll();
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer) clearTimeout(timer);
    };
  }, [provider, pollMs]);

  return head;
}
