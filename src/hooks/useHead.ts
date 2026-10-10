"use client";

// The head of the chain, polled through the koilib provider so a custom node
// is respected. Pages use it for "just now", finality and neighbour links.
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
    const poll = async () => {
      try {
        const info = await provider.getHeadInfo();
        if (!active) return;
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
      } finally {
        if (active && pollMs > 0) timer = setTimeout(poll, pollMs);
      }
    };
    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [provider, pollMs]);

  return head;
}
