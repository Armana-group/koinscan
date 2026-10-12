"use client";

// Names for addresses, merged from the static list and the Fogata pool
// registry (fetched once per provider). Pages ask `nameOf(address)`.
import { Contract, Multicall } from "koilib";
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import { FOGATA2_LIST_POOLS_CONTRACT_ID } from "@/koinos/constants";
import { staticName } from "@/lib/names";
import { retry } from "@/lib/retry";

// The last registry read, so names show at once on the next visit even when
// the public node is busy. Pool names rarely change.
const STORAGE_KEY = "ks-pool-names";

function readStored(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}

// Read once per page load; the server has no storage, so it renders without these.
const NONE: Record<string, string> = {};
let storedOnce: Record<string, string> | null = null;
const noop = () => () => {};
const storedOnClient = () => (storedOnce ??= readStored());
const storedOnServer = () => NONE;

interface Names {
  nameOf: (address: string | null | undefined) => string | undefined;
  /** Addresses that run a Fogata pool, once the registry has loaded. */
  pools: ReadonlySet<string>;
}

const NamesContext = createContext<Names>({ nameOf: staticName, pools: new Set() });

export function NamesProvider({ children }: { children: ReactNode }) {
  const { provider } = useWallet();
  const [fetched, setFetched] = useState<Record<string, string> | null>(null);
  const stored = useSyncExternalStore(noop, storedOnClient, storedOnServer);
  const poolNames = fetched ?? stored;

  useEffect(() => {
    if (!provider) return;
    let active = true;
    // The public node turns away bursts (its refusals look like network errors
    // in the browser), and this read starts alongside the page's own, so try a
    // few times before settling for the stored or static names.
    const read = async () => {
      const list = new Contract({ id: FOGATA2_LIST_POOLS_CONTRACT_ID, provider, abi: abiFogata2ListPools });
      const { result } = await list.functions.get_pools({ start: "", limit: 100, direction: 0 });
      const listed: { account: string }[] = result?.value ?? [];
      if (!listed.length) return null;
      const contracts = listed.map((pool) => new Contract({ id: pool.account, provider, abi: abiFogata2Pool }));
      const multicall = new Multicall({ provider, contracts });
      for (const contract of contracts) await multicall.add(contract.functions.get_pool_params, {});
      const params = await multicall.call();
      const names: Record<string, string> = {};
      listed.forEach((pool, index) => {
        const value = params[index] as { name?: string } | Error;
        if (!(value instanceof Error) && value?.name) names[pool.account] = value.name;
      });
      return names;
    };
    retry(read, 4, 2500)
      .then((names) => {
        if (!active || !names) return;
        setFetched(names);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
        } catch {
          // Private windows can refuse storage; the names still show this visit.
        }
      })
      .catch((error) => console.info("[names] pool registry unavailable:", error));
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
