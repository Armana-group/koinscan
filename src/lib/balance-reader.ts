import { Contract, type Provider } from "koilib";
import tokenAbi from "@/koinos/abi";
import type { TokenBalanceReader } from "@/lib/wallet-balances";

// Reads a token balance through koilib against the given provider. Shared by the
// server-side balances proxy and the client-side fallback used for custom nodes.
export function createKoilibBalanceReader(provider: Provider): TokenBalanceReader {
  return async (contractAddress, owner) => {
    const contract = new Contract({
      id: contractAddress,
      provider,
      abi: tokenAbi,
    });

    const { result } = await contract.functions.balanceOf({ owner });
    return result?.value ?? "0";
  };
}
