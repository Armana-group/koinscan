import { Contract, ProviderInterface, utils } from "koilib";

import tokenAbi from "@/koinos/abi";
import { abiPob } from "@/koinos/abis";
import {
  KOIN_CONTRACT_ID,
  POB_CONTRACT_ID,
  VHP_CONTRACT_ID,
} from "@/koinos/constants";

export interface NetworkStaking {
  /** Base yearly yield for producing VHP, before any pool fee. */
  apy: number;
  /** VHP currently producing blocks across the whole network. */
  vhpProducing: number;
}

/**
 * APY = 2% * virtual supply / VHP producing
 * Same formula as src/app/network/page.tsx
 */
export async function getNetworkStaking(provider: ProviderInterface): Promise<NetworkStaking> {
  const vhpContract = new Contract({ id: VHP_CONTRACT_ID, provider, abi: tokenAbi });
  const { result: resultVhp } = await vhpContract.functions.totalSupply();
  const totalVhp = Number(resultVhp!.value) / 1e8;

  const koinContract = new Contract({ id: KOIN_CONTRACT_ID, provider, abi: tokenAbi });
  const { result: resultKoin } = await koinContract.functions.totalSupply();
  const totalKoin = Number(resultKoin!.value) / 1e8;

  const pobContract = new Contract({ id: POB_CONTRACT_ID, provider, abi: abiPob });
  const { result: resultPob } = await pobContract.functions.get_metadata();
  const difficulty = Number(
    "0x" + utils.toHexString(utils.decodeBase64url(resultPob!.value.difficulty))
  );
  const vhpProducing = 10 * difficulty / 3000 / 1e8;
  return { apy: 2 * (totalVhp + totalKoin) / vhpProducing, vhpProducing };
}

export async function getNetworkApy(provider: ProviderInterface): Promise<number> {
  return (await getNetworkStaking(provider)).apy;
}

/**
 * The one line under the Fogata title: how much VHP the listed pools hold
 * and what share of the network's producing VHP that is.
 */
export function summarizeFogata(
  poolVhp: (number | undefined)[],
  vhpProducing: number | undefined
): { totalStaked: number; share: number | null } {
  const totalStaked = poolVhp.reduce<number>((sum, vhp) => sum + (vhp ?? 0), 0);
  const share = vhpProducing && vhpProducing > 0 ? (totalStaked * 100) / vhpProducing : null;
  return { totalStaked, share };
}

export function formatCompactVhp(amount: number): string {
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`;
  return Math.round(amount).toString();
}

export function computePoolApy(
  networkApy: number,
  beneficiaries: { percentage: number }[]
): number {
  const beneficiaryShare = beneficiaries.reduce(
    (sum, beneficiary) => sum + beneficiary.percentage,
    0
  ) / 1000;
  return networkApy * (1 - beneficiaryShare / 100);
}

export type PoolHealth = "producing" | "late" | "paused";

const DAY_MS = 24 * 60 * 60 * 1000;

export function poolHealth(
  input: { lastBlockTime?: Date; expectedTimeToProduce?: number; effectiveness?: number },
  now: Date = new Date()
): PoolHealth {
  if (!input.lastBlockTime) return "paused";
  const age = now.getTime() - input.lastBlockTime.getTime();
  if (age > DAY_MS) return "paused";
  if (input.expectedTimeToProduce && age > 4 * input.expectedTimeToProduce) return "late";
  if (input.effectiveness !== undefined && input.effectiveness < 50) return "late";
  return "producing";
}

export function formatPayoutPeriod(paymentPeriodMs?: string): string {
  if (!paymentPeriodMs) return "—";
  const days = Number(paymentPeriodMs) / DAY_MS;
  if (!Number.isFinite(days) || days <= 0) return "—";
  if (days === 1) return "Every day";
  return `Every ${Number.isInteger(days) ? days : days.toFixed(1)} days`;
}

const SCALE = 1e8;

/**
 * Best open order on the *other* side that would satisfy the amounts the user
 * typed, at an equal or better price. Used only to offer the existing fill
 * dialog as a shortcut; it never places or fills anything itself.
 */
export function findMatchingOrder<
  T extends { vhp_amount: string; koin_amount: string; buy: boolean; owner: string; id: string }
>(
  side: "buy" | "sell",
  vhpAmount: string,
  koinAmount: string,
  orders: T[],
  account: string | null
): T | null {
  const vhp = Number(vhpAmount);
  const koin = Number(koinAmount);
  if (!Number.isFinite(vhp) || !Number.isFinite(koin) || vhp <= 0 || koin <= 0) return null;
  const wantedPrice = koin / vhp; // KOIN per VHP
  const candidates = orders
    .filter((order) => order.buy === (side === "sell") && order.owner !== account)
    .filter((order) => Number(order.vhp_amount) / SCALE >= vhp)
    .map((order) => ({ order, price: Number(order.koin_amount) / Number(order.vhp_amount) }))
    .filter(({ price }) => (side === "sell" ? price >= wantedPrice : price <= wantedPrice))
    .sort((a, b) => (side === "sell" ? b.price - a.price : a.price - b.price));
  return candidates[0]?.order ?? null;
}

/**
 * Filters free text into a decimal amount: digits, one dot, at most eight
 * decimals. Amount fields are plain text inputs (no spinner, no exponent
 * notation), so this is the only thing standing between the keyboard and the
 * amount state.
 */
export function sanitizeDecimalInput(raw: string): string {
  const cleaned = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  const whole = cleaned.slice(0, dot) || "0";
  const fraction = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 8);
  return `${whole}.${fraction}`;
}
