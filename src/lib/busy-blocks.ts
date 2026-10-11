// Which recent blocks carry transactions. Koinos makes a block every three
// seconds whether or not anyone sent anything, so most blocks are empty and a
// page of "blocks with transactions" means reading a few thousand of them.
// The index below reads a range once, remembers the busy blocks in it, and on
// later calls only reads what is new above or still unread below.

export interface BlockSummary {
  height: number;
  id: string;
  producer: string;
  timestamp: number;
  transactions: number;
}

/** One entry of block_store.get_blocks_by_height, as koilib returns it. */
export interface BlockItem {
  block_height?: string;
  block_id?: string;
  block?: { id?: string; header?: { height?: string; signer?: string; timestamp?: string }; transactions?: unknown[] };
}

/** Reads `count` blocks starting at height `from`, with their bodies. */
export type GetBlocks = (from: number, count: number) => Promise<BlockItem[]>;

export interface BusyPage {
  /** Busy blocks below the requested height, newest first. */
  blocks: BlockSummary[];
  /** Lowest height the index has read. Everything from here up to `head` is known. */
  scannedTo: number;
  /** Highest height the index has read. */
  head: number;
  /** True once the index has read all the way back to block 1. */
  exhausted: boolean;
}

/** Blocks per node request. */
export const CHUNK = 100;

export function readBlockItems(items: BlockItem[]): BlockSummary[] {
  return items
    .map((item) => ({
      height: Number(item.block_height ?? item.block?.header?.height),
      id: item.block_id ?? item.block?.id ?? "",
      producer: item.block?.header?.signer ?? "",
      timestamp: Number(item.block?.header?.timestamp),
      transactions: item.block?.transactions?.length ?? 0,
    }))
    .filter((block) => Number.isFinite(block.height))
    .sort((a, b) => b.height - a.height);
}

/** Roughly how long a run of blocks spans, for "searched the last 2.5 hours". */
export function spanText(blocks: number): string {
  const minutes = Math.max(1, Math.round((blocks * 3) / 60));
  if (minutes < 90) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = minutes / 60;
  return `${hours < 10 ? hours.toFixed(1).replace(/\.0$/, "") : Math.round(hours)} hours`;
}

export class BusyBlockIndex {
  /** Busy blocks in the read range, newest first. */
  private busy: BlockSummary[] = [];
  /** The contiguous range of heights already read, inclusive. Empty until the first extendUp. */
  private high = 0;
  private low = 0;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly concurrency = 3) {}

  get range(): { low: number; high: number } {
    return { low: this.low, high: this.high };
  }

  /** Index mutations run one at a time so two callers never read the same blocks twice. */
  private run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /** Busy blocks in [from, to], newest first, read a few chunks at a time. */
  private async read(from: number, to: number, getBlocks: GetBlocks): Promise<BlockSummary[]> {
    const ranges: [number, number][] = [];
    for (let start = from; start <= to; start += CHUNK) ranges.push([start, Math.min(to, start + CHUNK - 1)]);
    const found: BlockSummary[] = [];
    for (let index = 0; index < ranges.length; index += this.concurrency) {
      const batch = await Promise.all(ranges.slice(index, index + this.concurrency).map(([start, end]) => getBlocks(start, end - start + 1)));
      for (const items of batch) {
        for (const block of readBlockItems(items)) if (block.transactions > 0) found.push(block);
      }
    }
    return found.sort((a, b) => b.height - a.height);
  }

  /** Brings the index up to `head`. The first call reads nothing; it only marks where reading starts. */
  extendUp(head: number, getBlocks: GetBlocks): Promise<BlockSummary[]> {
    return this.run(async () => {
      if (this.high === 0) {
        this.high = head;
        this.low = head + 1;
        return [];
      }
      if (head <= this.high) return [];
      const found = await this.read(this.high + 1, head, getBlocks);
      this.busy = [...found, ...this.busy];
      this.high = head;
      return found;
    });
  }

  /**
   * Up to `limit` busy blocks below `before`, reading older blocks as needed
   * but at most `maxScan` of them in this call. A capped answer says so through
   * `scannedTo`; asking again continues from there.
   */
  page(before: number, limit: number, maxScan: number, getBlocks: GetBlocks): Promise<BusyPage> {
    return this.run(async () => {
      if (this.high === 0) return { blocks: [], scannedTo: 0, head: 0, exhausted: false };
      const have = () => this.busy.filter((block) => block.height < before).length;
      let scanned = 0;
      while (have() < limit && this.low > 1 && scanned < maxScan) {
        const step = Math.min(CHUNK * this.concurrency, maxScan - scanned, this.low - 1);
        const from = this.low - step;
        const found = await this.read(from, this.low - 1, getBlocks);
        this.busy = [...this.busy, ...found];
        this.low = from;
        scanned += step;
      }
      return {
        blocks: this.busy.filter((block) => block.height < before).slice(0, limit),
        scannedTo: this.low,
        head: this.high,
        exhausted: this.low <= 1,
      };
    });
  }
}
