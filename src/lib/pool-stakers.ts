// Who has staked in a Fogata pool. The contract lists its accounts cheaply
// (100 per call) but each balance is a contract read, and a node fits only
// about four of those in one request. So the sweep runs small multicall
// batches a few at a time, and callers cache the answer.
import { Contract, Multicall, type ProviderInterface } from "koilib";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";

export interface StakerRow {
  address: string;
  /** Raw amounts in satoshis, as the chain returns them. */
  koin: string;
  vhp: string;
}

export interface RankedStaker extends StakerRow {
  /** koin + vhp, raw. */
  stake: string;
  /** Share of all stake in the pool, 0–100. */
  share: number;
}

export interface PoolStakers {
  /** Accounts holding any stake. */
  total: number;
  /** Sum of every staker's stake, raw. */
  totalStake: string;
  stakers: RankedStaker[];
  updatedAt: number;
}

const ZERO = BigInt(0);

/** Drop empty accounts, sort by stake, and work out each share. */
export function rankStakers(rows: StakerRow[], now = Date.now()): PoolStakers {
  const ranked = rows
    .map((row) => {
      const stake = BigInt(row.koin || "0") + BigInt(row.vhp || "0");
      return { ...row, stakeValue: stake };
    })
    .filter((row) => row.stakeValue > ZERO)
    .sort((a, b) => (a.stakeValue === b.stakeValue ? a.address.localeCompare(b.address) : a.stakeValue > b.stakeValue ? -1 : 1));
  const totalStake = ranked.reduce((sum, row) => sum + row.stakeValue, ZERO);
  const stakers = ranked.map(({ stakeValue, ...row }) => ({
    ...row,
    stake: stakeValue.toString(),
    share: totalStake === ZERO ? 0 : Number((stakeValue * BigInt(10_000)) / totalStake) / 100,
  }));
  return { total: stakers.length, totalStake: totalStake.toString(), stakers, updatedAt: now };
}

/** Every account the pool has ever seen, in the contract's own order. */
export async function listPoolAccounts(provider: ProviderInterface, poolId: string, pageSize = 100): Promise<string[]> {
  const pool = new Contract({ id: poolId, provider, abi: abiFogata2Pool });
  const accounts: string[] = [];
  let start = "";
  for (let page = 0; page < 1000; page += 1) {
    const { result } = await pool.functions.get_accounts({ start, limit: pageSize, direction: 0 });
    const batch = ((result as { accounts?: string[] } | undefined)?.accounts ?? []).filter((a) => a !== start);
    accounts.push(...batch);
    if (batch.length < pageSize - (page === 0 ? 0 : 1)) break;
    start = batch[batch.length - 1];
  }
  return accounts;
}

type Balance = { koin_amount?: string; vhp_amount?: string } | undefined;

function toRow(address: string, balance: Balance): StakerRow {
  return { address, koin: balance?.koin_amount ?? "0", vhp: balance?.vhp_amount ?? "0" };
}

/** Read balances for every account: multicall batches, several in flight, with
 *  a per-account fallback when a batch blows the node's read budget. */
export async function readStakerRows(
  provider: ProviderInterface,
  poolId: string,
  accounts: string[],
  { batchSize = 4, concurrency = 4 }: { batchSize?: number; concurrency?: number } = {},
): Promise<StakerRow[]> {
  const pool = new Contract({ id: poolId, provider, abi: abiFogata2Pool });
  const batches: string[][] = [];
  for (let i = 0; i < accounts.length; i += batchSize) batches.push(accounts.slice(i, i + batchSize));
  const rows: StakerRow[] = [];

  const readOne = async (address: string) => {
    const { result } = await pool.functions.balance_of({ value: address });
    return toRow(address, result as Balance);
  };
  const readBatch = async (batch: string[]) => {
    if (batch.length === 1) return [await readOne(batch[0])];
    const multicall = new Multicall({ provider, contracts: [pool] });
    for (const address of batch) await multicall.add(pool.functions.balance_of, { value: address });
    try {
      const results = await multicall.call();
      return batch.map((address, i) => {
        const result = results[i];
        if (result instanceof Error) throw result;
        return toRow(address, result as Balance);
      });
    } catch {
      return Promise.all(batch.map(readOne));
    }
  };

  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, batches.length) }, async () => {
      while (next < batches.length) {
        const batch = batches[next];
        next += 1;
        rows.push(...(await readBatch(batch)));
      }
    }),
  );
  return rows;
}

export async function sweepPoolStakers(provider: ProviderInterface, poolId: string): Promise<PoolStakers> {
  const accounts = await listPoolAccounts(provider, poolId);
  const rows = await readStakerRows(provider, poolId, accounts);
  return rankStakers(rows);
}
