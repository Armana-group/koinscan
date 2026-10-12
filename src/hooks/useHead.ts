"use client";

// The head of the chain. Pages use it for "just now", finality and neighbour
// links. For a trusted node it comes from /api/chain/head, shared by every
// visitor; a custom node is asked directly through the koilib provider.
//
// After the first poll, polling stops while the tab is hidden and resumes the
// moment it is shown again: a few background tabs each asking every couple of seconds is enough
// to get a visitor rate-limited by the public nodes. After an error the
// interval backs off, up to ten times the usual, until a poll succeeds.
import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { fetchChain } from "@/koinos/chain-client";
import { readHead, type ChainHead } from "@/koinos/chain-reads";
import { isKnownRpcNode } from "@/koinos/known-nodes";

export interface HeadInfo extends ChainHead {
  receivedAt: number;
}

export function useHead(pollMs = 3000): HeadInfo | null {
  const { provider, jsonRpcNode } = useWallet();
  const [head, setHead] = useState<HeadInfo | null>(null);

  useEffect(() => {
    if (!provider) return;
    const read = isKnownRpcNode(jsonRpcNode) ? () => fetchChain<ChainHead>("head", jsonRpcNode) : () => readHead(provider);
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
        const info = await read();
        if (!active) return;
        delay = pollMs;
        // A shared answer can be a moment older than one already shown; keep the newer.
        setHead((previous) => (previous && previous.height >= info.height ? previous : { ...info, receivedAt: Date.now() }));
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
  }, [provider, jsonRpcNode, pollMs]);

  return head;
}
