"use client";

import { useEffect, useState } from "react";
import type { ProviderInterface } from "koilib";
import { useWallet } from "@/contexts/WalletContext";
import { readKoinBalance } from "@/lib/koin-balance";

export function WalletAccountBalance({ address }: { address: string }) {
  const { provider } = useWallet();
  const [balance, setBalance] = useState<{
    provider: ProviderInterface;
    address: string;
    value: string | null;
  }>();

  useEffect(() => {
    if (!provider) return;
    let active = true;
    readKoinBalance(provider, address).then(
      (value) => { if (active) setBalance({ provider, address, value }); },
      () => { if (active) setBalance({ provider, address, value: null }); },
    );
    return () => { active = false; };
  }, [provider, address]);

  const current = balance?.provider === provider && balance?.address === address ? balance : undefined;
  const label = !current ? "… KOIN" : current.value === null ? "Unavailable" : `${current.value} KOIN`;
  return (
    <span
      className="shrink-0 text-right text-xs tabular-nums text-muted-foreground"
      aria-label={`KOIN balance: ${label}`}
      title={current?.value === null ? "KOIN balance could not be loaded" : undefined}
    >
      {label}
    </span>
  );
}
