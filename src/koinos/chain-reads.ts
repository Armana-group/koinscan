// Reads of the chain's live state, shared by the server routes under
// /api/chain (for the trusted nodes) and by the browser (for a custom node).
//
// VHP producing = difficulty / 300 (the PoB contract targets one block per
// 300 ten-millisecond attempts), APY = 2% * virtual supply / VHP producing,
// and a producer's expected block time is 10 * difficulty / VHP balance ms.
// The same formulas as src/lib/fogata.ts and the Koinos block producer.
import { Contract, Multicall, type ProviderInterface, utils } from "koilib";
import tokenAbi from "@/koinos/abi";
import { abiPob } from "@/koinos/abis";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import { FOGATA2_LIST_POOLS_CONTRACT_ID, KOIN_CONTRACT_ID, NICKNAMES_CONTRACT_ID, POB_CONTRACT_ID, VHP_CONTRACT_ID } from "@/koinos/constants";
import type { SampledBlock } from "@/lib/block-window";

export interface ChainHead {
  height: number;
  id: string;
  /** Head block time, milliseconds since the epoch. */
  time: number;
  lastIrreversible: number;
  /** Who produced the head block; the shared route fills it in. */
  signer?: string;
}

export interface ChainStats {
  totalVhp: number;
  totalKoin: number;
  vhpProducing: number;
  apy: number;
  difficulty: number;
}

/** What the Network page shows: the most recent blocks and the supply figures. */
export interface NetworkSnapshot {
  blocks: SampledBlock[];
  stats: ChainStats;
}

export const NETWORK_SAMPLE = 100;

export async function readHead(provider: ProviderInterface): Promise<ChainHead> {
  const info = await provider.getHeadInfo();
  return {
    height: Number(info.head_topology.height),
    id: info.head_topology.id,
    time: Number(info.head_block_time),
    lastIrreversible: Number(info.last_irreversible_block),
  };
}

/** Who produced block `head`, or undefined if the node does not say. */
export async function readSigner(provider: ProviderInterface, head: ChainHead): Promise<string | undefined> {
  const items = await provider.getBlocks(head.height, 1, head.id, { returnBlock: true, returnReceipt: false });
  return items[0]?.block?.header?.signer ?? undefined;
}

export async function readBlocks(provider: ProviderInterface, from: number, count: number): Promise<SampledBlock[]> {
  const blocks = await provider.getBlocks(from, count, "", { returnBlock: true, returnReceipt: false });
  return blocks.map((b) => ({ height: Number(b.block.header!.height), timestamp: Number(b.block.header!.timestamp), signer: b.block.header!.signer!, txs: b.block.transactions?.length ?? 0 }));
}

/** The `NETWORK_SAMPLE` blocks up to `head`. */
export function readRecentBlocks(provider: ProviderInterface, head: number): Promise<SampledBlock[]> {
  return readBlocks(provider, head - NETWORK_SAMPLE + 1, NETWORK_SAMPLE);
}

export async function readStats(provider: ProviderInterface): Promise<ChainStats> {
  const vhp = new Contract({ id: VHP_CONTRACT_ID, provider, abi: tokenAbi });
  const koin = new Contract({ id: KOIN_CONTRACT_ID, provider, abi: tokenAbi });
  const pob = new Contract({ id: POB_CONTRACT_ID, provider, abi: abiPob });
  const [{ result: vhpSupply }, { result: koinSupply }, { result: metadata }] = await Promise.all([vhp.functions.totalSupply(), koin.functions.totalSupply(), pob.functions.get_metadata()]);
  const totalVhp = Number(vhpSupply!.value) / 1e8;
  const totalKoin = Number(koinSupply!.value) / 1e8;
  const difficulty = Number("0x" + utils.toHexString(utils.decodeBase64url(metadata!.value.difficulty)));
  const vhpProducing = (10 * difficulty) / 3000 / 1e8;
  const apy = (2 * (totalVhp + totalKoin)) / vhpProducing;
  return { totalVhp, totalKoin, vhpProducing, apy, difficulty };
}

/** Names of the pools in the Fogata registry, by pool address. */
export async function readPoolNames(provider: ProviderInterface): Promise<Record<string, string>> {
  const list = new Contract({ id: FOGATA2_LIST_POOLS_CONTRACT_ID, provider, abi: abiFogata2ListPools });
  const { result } = await list.functions.get_pools({ start: "", limit: 100, direction: 0 });
  const listed: { account: string }[] = result?.value ?? [];
  if (!listed.length) return {};
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
}

/** The height of the block with this id, or null if the node does not know it. */
export async function readBlockHeight(provider: ProviderInterface, id: string): Promise<number | null> {
  const info = await provider.call<{ block_items?: { block_height?: string }[] }>("block_store.get_blocks_by_id", { block_ids: [id], return_block: false, return_receipt: false });
  const height = Number(info?.block_items?.[0]?.block_height);
  return Number.isFinite(height) && height > 0 ? height : null;
}

/** The address's main @nickname, or null if it has none. */
export async function readNickname(provider: ProviderInterface, address: string): Promise<string | null> {
  const nicknames = new Contract({ id: NICKNAMES_CONTRACT_ID, provider, abi: utils.nicknamesAbi });
  const { result } = await nicknames.functions.get_main_token({ value: address });
  if (!result?.token_id) return null;
  return new TextDecoder().decode(utils.toUint8Array(String(result.token_id).slice(2))) || null;
}

/** Raw balances of `owner` in each token contract, by contract; a token that does not answer counts as zero. */
export async function readTokenBalances(provider: ProviderInterface, owner: string, tokens: string[]): Promise<Record<string, string>> {
  const balances: Record<string, string> = {};
  await Promise.all(
    tokens.map(async (token) => {
      const contract = new Contract({ id: token, provider, abi: tokenAbi });
      const { result } = await contract.functions.balanceOf({ owner }).catch(() => ({ result: undefined }));
      const value = (result as { value?: string } | undefined)?.value;
      balances[token] = value ?? "0";
    }),
  );
  return balances;
}
