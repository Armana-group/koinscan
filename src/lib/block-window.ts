// The Network page's moving window over the most recent blocks: who produced
// them and how far apart they came. New blocks slide in at the end and the
// oldest drop off, so the page stays live without re-reading the whole window.

export interface SampledBlock {
  height: number;
  /** Milliseconds since the epoch. */
  timestamp: number;
  signer: string;
  /** Transactions the block carried. */
  txs?: number;
}

export interface WindowSummary {
  producers: { address: string; share: number; blocks: number }[];
  averageBlockTime: number;
  /** Seconds since the block before, for each block after the first. */
  blockTimes: { height: number; seconds: number }[];
}

/** Adds blocks to the window, ignoring ones already in it, and keeps the newest `size`. */
export function slide<T extends { height: number }>(window: readonly T[], incoming: readonly T[], size: number): T[] {
  const byHeight = new Map<number, T>();
  for (const block of window) byHeight.set(block.height, block);
  for (const block of incoming) byHeight.set(block.height, block);
  return [...byHeight.values()].sort((a, b) => a.height - b.height).slice(-size);
}

export function summarise(blocks: readonly SampledBlock[]): WindowSummary {
  const counts = new Map<string, number>();
  for (const block of blocks) counts.set(block.signer, (counts.get(block.signer) ?? 0) + 1);
  const producers = [...counts.entries()]
    .map(([address, n]) => ({ address, blocks: n, share: (100 * n) / blocks.length }))
    // Equal shares keep a stable order, so rows do not swap places on every block.
    .sort((a, b) => b.share - a.share || a.address.localeCompare(b.address));
  const span = blocks.length > 1 ? blocks[blocks.length - 1].timestamp - blocks[0].timestamp : 0;
  const averageBlockTime = blocks.length > 1 ? span / (blocks.length - 1) / 1000 : 0;
  const blockTimes = blocks.slice(1).map((block, i) => ({ height: block.height, seconds: (block.timestamp - blocks[i].timestamp) / 1000 }));
  return { producers, averageBlockTime, blockTimes };
}

