"use client";

// Resolves a search and navigates. Token contracts open the contract page,
// everything else that looks like an account opens the address page.
import { Contract, type ProviderInterface } from "koilib";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { resolveNickname } from "@/koinos/utils";
import tokenAbi from "@/koinos/abi";
import { classifySearch } from "@/lib/search";
import * as toast from "@/lib/toast";
import { knownContract } from "@/lib/names";

async function isTokenContract(provider: ProviderInterface | undefined, address: string): Promise<boolean> {
  if (knownContract(address)?.slug) return true;
  if (!provider) return false;
  try {
    const contract = new Contract({ id: address, provider, abi: tokenAbi });
    const result = await Promise.race([
      contract.functions.decimals({}),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
    return result?.result?.value !== undefined;
  } catch {
    return false;
  }
}

export function useSearchNavigation() {
  const router = useRouter();
  const { provider } = useWallet();
  const [busy, setBusy] = useState(false);

  const go = useCallback(
    async (raw: string): Promise<boolean> => {
      const query = classifySearch(raw);
      if (query.kind === "empty") return false;
      setBusy(true);
      try {
        switch (query.kind) {
          case "tx":
            router.push(`/tx/${query.value}`);
            return true;
          case "block":
            router.push(`/blocks/${query.value}`);
            return true;
          case "symbol":
            router.push(`/contracts/${query.value}`);
            return true;
          case "nickname": {
            const address = await resolveNickname(query.value);
            if (!address) {
              toast.error(`No one is called @${query.value} yet.`);
              return false;
            }
            router.push((await isTokenContract(provider, address)) ? `/contracts/${address}` : `/address/${address}`);
            return true;
          }
          case "address":
            router.push((await isTokenContract(provider, query.value)) ? `/contracts/${query.value}` : `/address/${query.value}`);
            return true;
          default:
            toast.error("Try an address, @nickname, transaction id or block number.");
            return false;
        }
      } catch (error) {
        console.error("[search]", error);
        toast.error("Search failed. Please try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [router, provider],
  );

  return { go, busy };
}
