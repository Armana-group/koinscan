// Server side of /api/chain: one shared, briefly cached read of the chain's
// live state per trusted node, so every visitor costs the node nothing extra.
// Public nodes turn away bursts; relaying through here keeps Koinscan to a
// handful of node requests every few seconds however many people are reading.
import { Provider } from "koilib";
import { slide, type SampledBlock } from "@/lib/block-window";
import { CHUNK, readBlockItems, type BlockItem, type BlockSummary } from "@/lib/busy-blocks";
import { freshCache } from "@/lib/fresh-cache";
import { retry } from "@/lib/retry";
import { DEFAULT_JSON_RPC_NODE, KNOWN_RPC_ORIGINS, normalizeRpcOrigin } from "@/koinos/known-nodes";
import { readTokenMeta, type TokenMeta } from "@/lib/token-meta";
import { NETWORK_SAMPLE, readBlockHeight, readHead, readNickname, readPoolNames, readSigner, readStats, readTokenBalances, type ChainHead, type ChainStats, type NetworkSnapshot } from "@/koinos/chain-reads";

/** The trusted node a request names, or the default; null for anything else. */
export function trustedOrigin(request: Request): string | null {
  const origin = normalizeRpcOrigin(new URL(request.url).searchParams.get("rpcNode") || DEFAULT_JSON_RPC_NODE);
  return origin && KNOWN_RPC_ORIGINS.has(origin) ? origin : null;
}

// A new block comes about every three seconds.
const heads = freshCache<ChainHead>(1_500);
// Supply and difficulty barely move.
const stats = freshCache<ChainStats>(60_000, 30 * 60_000);
// The most recent blocks, oldest first, shared by the Network and Blocks pages.
const recent = freshCache<BlockSummary[]>(2_000);
// Pool names change when someone renames a pool, which is rare.
const poolNames = freshCache<Record<string, string>>(10 * 60_000, 24 * 60 * 60_000);
// Final blocks never change: a hundred at a time, kept for a day.
const settled = freshCache<BlockSummary[]>(24 * 60 * 60_000, 24 * 60 * 60_000, Date.now, 500);
// Blocks that could still be replaced, for the few seconds until the next one.
const unsettled = freshCache<BlockSummary[]>(2_000);
// A block's height never changes once its id is known.
const heights = freshCache<number | null>(24 * 60 * 60_000, 24 * 60 * 60_000, Date.now, 5000);
// Nicknames change when their owner sets a new main one.
const nicknames = freshCache<string | null>(10 * 60_000, 24 * 60 * 60_000, Date.now, 5000);
// What a token calls itself is set when it is deployed. A contract that did not
// answer reads as "not a token", so that is asked again after an hour.
const tokenMetas = freshCache<Record<string, TokenMeta | null>>(60 * 60_000, 24 * 60 * 60_000, Date.now, 2000);
// Balances move with every transfer; this only absorbs a burst of the same question.
const tokenBalances = freshCache<Record<string, string>>(5_000, 60_000, Date.now, 2000);
const windows = new Map<string, BlockSummary[]>();
const providers = new Map<string, Provider>();

export function providerFor(origin: string): Provider {
  let provider = providers.get(origin);
  if (!provider) {
    provider = new Provider([origin]);
    providers.set(origin, provider);
  }
  return provider;
}

// Waiting a moment and asking again usually gets past a busy node.
const patiently = <T>(read: () => Promise<T>) => retry(read, 3, 1500);

/** The head, with who produced it so the Home page's live line needs no read of its own. */
export function headFor(origin: string): Promise<ChainHead> {
  return heads(origin, async () => {
    const provider = providerFor(origin);
    const head = await patiently(() => readHead(provider));
    const signer = await readSigner(provider, head).catch(() => undefined);
    return signer ? { ...head, signer } : head;
  });
}

/** The last `NETWORK_SAMPLE` blocks, oldest first, read only from the last one already held. */
function recentFor(origin: string): Promise<BlockSummary[]> {
  return recent(origin, async () => {
    const provider = providerFor(origin);
    const read = (from: number, count: number) =>
      patiently(() => provider.getBlocks(from, count, "", { returnBlock: true, returnReceipt: false }) as Promise<BlockItem[]>).then((items) => readBlockItems(items).reverse());
    const head = await headFor(origin);
    const held = windows.get(origin) ?? [];
    const last = held[held.length - 1]?.height;
    let blocks = held;
    if (last === undefined || head.height - last >= NETWORK_SAMPLE) {
      blocks = await read(head.height - NETWORK_SAMPLE + 1, NETWORK_SAMPLE);
    } else if (head.height > last) {
      blocks = slide(held, await read(last + 1, head.height - last), NETWORK_SAMPLE);
    }
    windows.set(origin, blocks);
    return blocks;
  });
}

/** What the Network page shows: the recent blocks and the supply figures. */
export async function networkFor(origin: string): Promise<NetworkSnapshot> {
  const [blocks, figures] = await Promise.all([recentFor(origin), stats(origin, () => patiently(() => readStats(providerFor(origin))))]);
  const sampled: SampledBlock[] = blocks.map((block) => ({ height: block.height, timestamp: block.timestamp, signer: block.producer, txs: block.transactions }));
  return { blocks: sampled, stats: figures };
}

/** The newest `count` blocks, newest first, for the Blocks page's live list. */
export async function latestBlocksFor(origin: string, count: number): Promise<BlockSummary[]> {
  return (await recentFor(origin)).slice(-count).reverse();
}

export function poolNamesFor(origin: string): Promise<Record<string, string>> {
  return poolNames(origin, () => patiently(() => readPoolNames(providerFor(origin))));
}

/** Blocks `from` to `from + count - 1` (stopping at the head), newest first, and whether all of them are final. */
export async function rangeFor(origin: string, from: number, count: number): Promise<{ blocks: BlockSummary[]; final: boolean }> {
  const head = await headFor(origin);
  const to = Math.min(from + count - 1, head.height);
  if (to < from) return { blocks: [], final: false };
  const held = windows.get(origin);
  let blocks: BlockSummary[] = [];
  if (held?.length && held[0].height <= from && held[held.length - 1].height >= to) {
    blocks = held.filter((block) => block.height >= from && block.height <= to);
  } else {
    // Whole hundreds, so everyone paging back shares the same reads.
    const provider = providerFor(origin);
    for (let start = Math.floor((from - 1) / CHUNK) * CHUNK + 1; start <= to; start += CHUNK) {
      const end = Math.min(start + CHUNK - 1, head.height);
      const read = () => patiently(() => provider.getBlocks(start, end - start + 1, "", { returnBlock: true, returnReceipt: false }) as Promise<BlockItem[]>).then(readBlockItems);
      const chunk = end <= head.lastIrreversible ? await settled(`${origin}|${start}`, read) : await unsettled(`${origin}|${start}|${end}`, read);
      blocks.push(...chunk.filter((block) => block.height >= from && block.height <= to));
    }
  }
  return { blocks: blocks.sort((a, b) => b.height - a.height), final: to <= head.lastIrreversible };
}

export function blockHeightFor(origin: string, id: string): Promise<number | null> {
  return heights(`${origin}|${id}`, () => patiently(() => readBlockHeight(providerFor(origin), id)));
}

export function nicknameFor(origin: string, address: string): Promise<string | null> {
  return nicknames(`${origin}|${address}`, () => patiently(() => readNickname(providerFor(origin), address)));
}

/** Name, symbol and decimals of tokens that are not on the KoinDX list. */
export function tokenMetaFor(origin: string, tokens: string[]): Promise<Record<string, TokenMeta | null>> {
  return tokenMetas(`${origin}|${tokens.join(",")}`, () => readTokenMeta(providerFor(origin), tokens));
}

export function tokenBalancesFor(origin: string, owner: string, tokens: string[]): Promise<Record<string, string>> {
  return tokenBalances(`${origin}|${owner}|${tokens.join(",")}`, () => readTokenBalances(providerFor(origin), owner, tokens));
}
