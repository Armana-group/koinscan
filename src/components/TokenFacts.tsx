"use client";

// What a contract tells us about itself when it is a token: symbol, supply,
// and the connected wallet's balance. Quiet when it is not a token.
import { Contract, type ProviderInterface } from "koilib";
import { useEffect, useState } from "react";
import tokenAbi from "@/koinos/abi";
import { fmtRaw } from "@/lib/format";
import { KV, Lines } from "@/components/ks/Advanced";
import { ListMark } from "@/components/ks/Row";
import { getTokenByAddress } from "@/lib/tokens";

interface Facts {
  symbol: string;
  name: string;
  decimals: number;
  supply: string | null;
  balance: string | null;
  listed: boolean;
}

export function TokenFacts({ address, provider, account }: { address: string; provider: ProviderInterface | undefined; account: string | null }) {
  const [facts, setFacts] = useState<Facts | null | undefined>(undefined);

  useEffect(() => {
    if (!provider || !address) return;
    let active = true;
    (async () => {
      try {
        const contract = new Contract({ id: address, provider, abi: tokenAbi });
        const { result: decimals } = await contract.functions.decimals({});
        if (decimals?.value === undefined) throw new Error("not a token");
        const [symbol, name, supply, balance, listed] = await Promise.all([
          contract.functions.symbol({}).then((r) => String(r.result?.value ?? "")).catch(() => ""),
          contract.functions.name({}).then((r) => String(r.result?.value ?? "")).catch(() => ""),
          contract.functions.totalSupply({}).then((r) => (r.result?.value !== undefined ? String(r.result.value) : null)).catch(() => null),
          account ? contract.functions.balanceOf({ owner: account }).then((r) => (r.result?.value !== undefined ? String(r.result.value) : null)).catch(() => null) : Promise.resolve(null),
          getTokenByAddress(address).then((token) => Boolean(token)).catch(() => false),
        ]);
        if (active) setFacts({ symbol, name, decimals: Number(decimals.value), supply, balance, listed });
      } catch {
        if (active) setFacts(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [provider, address, account]);

  if (!facts) return null;
  return (
    <Lines className="mt-4">
      <KV k="Token">
        {facts.name || facts.symbol} <span>· {facts.symbol}</span>
        <ListMark listed={facts.listed} />
      </KV>
      {facts.supply !== null && (
        <KV k="Supply">
          {fmtRaw(facts.supply, facts.decimals, 2)} {facts.symbol}
        </KV>
      )}
      <KV k="Decimals">{facts.decimals}</KV>
      {account && (
        <KV k="You hold">
          {facts.balance !== null ? `${fmtRaw(facts.balance, facts.decimals, 4)} ${facts.symbol}` : "—"}
        </KV>
      )}
    </Lines>
  );
}
