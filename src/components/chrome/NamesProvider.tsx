"use client";

// Names for addresses, merged from the static list and the Fogata pool
// registry (fetched once per provider). Pages ask `nameOf(address)`.
import { Contract, Multicall } from "koilib";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import { FOGATA2_LIST_POOLS_CONTRACT_ID } from "@/koinos/constants";
import { staticName } from "@/lib/names";

interface Names {
  nameOf: (address: string | null | undefined) => string | undefined;
  /** Addresses that run a Fogata pool, once the registry has loaded. */
  pools: ReadonlySet<string>;
}

const NamesContext = createContext<Names>({ nameOf: staticName, pools: new Set() });

export function NamesProvider({ children }: { children: ReactNode }) {
  const { provider } = useWallet();
  const [poolNames, setPoolNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!provider) return;
    let active = true;
    (async () => {
      try {
        const list = new Contract({ id: FOGATA2_LIST_POOLS_CONTRACT_ID, provider, abi: abiFogata2ListPools });
        const { result } = await list.functions.get_pools({ start: "", limit: 100, direction: 0 });
        const listed: { account: string }[] = result?.value ?? [];
        if (!listed.length) return;
        const contracts = listed.map((pool) => new Contract({ id: pool.account, provider, abi: abiFogata2Pool }));
        const multicall = new Multicall({ provider, contracts });
        for (const contract of contracts) await multicall.add(contract.functions.get_pool_params, {});
        const params = await multicall.call();
        if (!active) return;
        const names: Record<string, string> = {};
        listed.forEach((pool, index) => {
          const value = params[index] as { name?: string } | Error;
          if (!(value instanceof Error) && value?.name) names[pool.account] = value.name;
        });
        setPoolNames(names);
      } catch (error) {
        console.info("[names] pool registry unavailable:", error);
      }
    })();
    return () => {
      active = false;
    };
  }, [provider]);

  const value = useMemo<Names>(
    () => ({
      nameOf: (address) => (address ? poolNames[address] ?? staticName(address) : undefined),
      pools: new Set(Object.keys(poolNames)),
    }),
    [poolNames],
  );

  return <NamesContext.Provider value={value}>{children}</NamesContext.Provider>;
}

export function useNames(): Names {
  return useContext(NamesContext);
}
