import { Contract, type ProviderInterface } from "koilib";
import tokenAbi from "@/koinos/abi";
import { KOIN_CONTRACT_ID } from "@/koinos/constants";
import { createRpcReadQueue } from "./rpcReadQueue";

const queueBalanceRead = createRpcReadQueue({
  intervalMs: 250,
  retries: 1,
  retryDelayMs: 750,
  timeoutMs: 10000,
});

/** Display up to four decimals without losing precision for large balances. */
export function formatKoinBalance(raw: string): string {
  if (!/^\d+$/.test(raw)) throw new Error("Invalid KOIN balance");
  const amount = BigInt(raw);
  if (amount === BigInt(0)) return "0";
  if (amount < BigInt(10000)) return "<0.0001";
  const rounded = (amount + BigInt(5000)) / BigInt(10000);
  const whole = new Intl.NumberFormat("en-US").format(rounded / BigInt(10000));
  const fraction = (rounded % BigInt(10000)).toString().padStart(4, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export async function readKoinBalance(provider: ProviderInterface, address: string): Promise<string> {
  const contract = new Contract({ id: KOIN_CONTRACT_ID, provider, abi: tokenAbi });
  const { result } = await queueBalanceRead(() => contract.functions.balanceOf({ owner: address }));
  if (typeof result?.value !== "string") throw new Error("Missing KOIN balance");
  return formatKoinBalance(result.value);
}
