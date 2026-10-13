import { Contract, Multicall, type Provider } from "koilib";
import tokenAbi from "@/koinos/abi";
import type { TokenBalanceReader } from "@/lib/wallet-balances";

/** Balance reads per bundle. The node refuses about 25 at once as too much compute. */
export const BALANCE_BUNDLE = 12;

/** Raw balances of `owner` in each contract, in order; an Error for a read that failed. */
export type BundleReader = (contracts: string[], owner: string) => Promise<(string | Error)[]>;

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

/** Many balance reads in one node request, through the chain's multicall contract. */
export function createMulticallBundleReader(provider: Provider): BundleReader {
  return async (contracts, owner) => {
    const tokens = contracts.map((id) => new Contract({ id, provider, abi: tokenAbi }));
    const multicall = new Multicall({ provider, contracts: tokens });
    for (const token of tokens) await multicall.add(token.functions.balanceOf, { owner });
    const results = await multicall.call<{ value?: string }>();
    return results.map((result) => (result instanceof Error ? result : (result?.value ?? "0")));
  };
}

/**
 * A reader that gathers the reads asked for at the same moment and sends them
 * `bundleSize` at a time, so thirty-odd tokens cost three node requests rather
 * than thirty. One call the node refuses fails its whole bundle, so that
 * bundle is then read one token at a time with `single`.
 */
export function createBundledBalanceReader(readBundle: BundleReader, single: TokenBalanceReader, bundleSize = BALANCE_BUNDLE): TokenBalanceReader {
  type Job = { contract: string; owner: string; token: Parameters<TokenBalanceReader>[2]; resolve: (value: string) => void; reject: (error: unknown) => void };
  let queue: Job[] = [];

  const send = async (jobs: Job[]) => {
    try {
      const results = await readBundle(
        jobs.map((job) => job.contract),
        jobs[0].owner,
      );
      jobs.forEach((job, index) => {
        const result = results[index];
        if (result instanceof Error || result === undefined) job.reject(result ?? new Error("No result"));
        else job.resolve(result);
      });
    } catch {
      for (const job of jobs) single(job.contract, job.owner, job.token).then(job.resolve, job.reject);
    }
  };

  const flush = () => {
    const jobs = queue;
    queue = [];
    const owners = new Map<string, Job[]>();
    for (const job of jobs) owners.set(job.owner, [...(owners.get(job.owner) ?? []), job]);
    for (const group of owners.values()) for (let index = 0; index < group.length; index += bundleSize) void send(group.slice(index, index + bundleSize));
  };

  return (contract, owner, token) =>
    new Promise<string>((resolve, reject) => {
      if (!queue.length) queueMicrotask(flush);
      queue.push({ contract, owner, token, resolve, reject });
    });
}
