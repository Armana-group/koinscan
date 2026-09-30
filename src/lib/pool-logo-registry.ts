import { Contract, Provider } from "koilib";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import { FOGATA2_LIST_POOLS_CONTRACT_ID } from "@/koinos/constants";

const LOGO_RPC = "https://api.koinos.io";

function createReadProvider(signal: AbortSignal): Provider {
  const provider = new Provider([LOGO_RPC]);
  // Koilib's default transport has no timeout. Keep its ABI handling, but abort
  // these server reads and never accept a caller-supplied RPC destination.
  provider.call = async <T>(method: string, params: unknown): Promise<T> => {
    const response = await fetch(LOGO_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal,
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Logo registry RPC unavailable");
    if (!response.body) throw new Error("Empty logo registry response");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 2 * 1024 * 1024) throw new Error("Logo registry response exceeds limits");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (json.error || json.result === undefined) throw new Error("Logo registry RPC failed");
    return json.result as T;
  };
  return provider;
}

export async function readPoolRegistry(): Promise<Set<string>> {
  const contract = new Contract({
    id: FOGATA2_LIST_POOLS_CONTRACT_ID,
    abi: abiFogata2ListPools,
    provider: createReadProvider(AbortSignal.timeout(8_000)),
  });
  const pools = new Set<string>();
  let start = "";
  // Fail closed rather than truncate a registry that exceeds our work budget.
  for (let page = 0; page < 10; page++) {
    const { result } = await contract.functions.get_pools({ start, limit: 100, descending: false });
    const listed = result?.value as { account: string }[] | undefined;
    if (!listed) throw new Error("Invalid pool registry response");
    for (const pool of listed) pools.add(pool.account);
    if (listed.length < 100) return pools;
    const next = listed[listed.length - 1].account;
    if (next === start) throw new Error("Pool registry did not advance");
    start = next;
  }
  throw new Error("Pool registry exceeds logo work budget");
}

export async function readPoolLogoUrl(poolId: string): Promise<string> {
  const contract = new Contract({ id: poolId, abi: abiFogata2Pool, provider: createReadProvider(AbortSignal.timeout(5_000)) });
  const { result } = await contract.functions.get_pool_params({});
  if (typeof result?.image !== "string") throw new Error("Invalid pool parameters");
  return result.image;
}
