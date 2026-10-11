import assert from "node:assert/strict";
import { test } from "node:test";
import { BusyBlockIndex, CHUNK, readBlockItems, spanText, type BlockItem } from "./busy-blocks";

/** A fake chain where every `every`th block carries one transaction. */
function fakeChain(every: number) {
  const calls: [number, number][] = [];
  const getBlocks = async (from: number, count: number): Promise<BlockItem[]> => {
    calls.push([from, count]);
    const items: BlockItem[] = [];
    for (let height = from; height < from + count; height++) {
      items.push({
        block_height: String(height),
        block_id: `id${height}`,
        block: { header: { height: String(height), signer: "1producer", timestamp: String(height * 3000) }, transactions: height % every === 0 ? [{}] : [] },
      });
    }
    return items;
  };
  const read = () => calls.reduce((sum, [, count]) => sum + count, 0);
  return { calls, getBlocks, read };
}

test("readBlockItems counts transactions and sorts newest first", () => {
  const rows = readBlockItems([
    { block_height: "5", block_id: "a", block: { header: { signer: "p", timestamp: "15" }, transactions: [{}, {}] } },
    { block_height: "7", block: { id: "b", header: { height: "7", signer: "q", timestamp: "21" } } },
    { block: {} },
  ]);
  assert.deepEqual(
    rows.map((row) => [row.height, row.id, row.producer, row.transactions]),
    [
      [7, "b", "q", 0],
      [5, "a", "p", 2],
    ],
  );
});

test("a page reads only as far back as it needs and returns busy blocks newest first", async () => {
  const chain = fakeChain(50);
  const index = new BusyBlockIndex(3);
  assert.deepEqual(await index.extendUp(10_000, chain.getBlocks), []);
  assert.equal(chain.read(), 0, "marking the head reads nothing");

  const page = await index.page(Infinity, 5, 5000, chain.getBlocks);
  assert.deepEqual(
    page.blocks.map((block) => block.height),
    [10_000, 9950, 9900, 9850, 9800],
  );
  assert.equal(page.exhausted, false);
  assert.equal(page.head, 10_000);
  // Five busy blocks live in the top 201 heights, so one round of three chunks is enough.
  assert.equal(chain.read(), CHUNK * 3);
  assert.equal(page.scannedTo, 10_000 - CHUNK * 3 + 1);
});

test("asking for an older page continues from where reading stopped without rereading", async () => {
  const chain = fakeChain(50);
  const index = new BusyBlockIndex(2);
  await index.extendUp(1000, chain.getBlocks);
  const first = await index.page(Infinity, 4, 5000, chain.getBlocks);
  const readAfterFirst = chain.read();

  const second = await index.page(first.scannedTo, 4, 5000, chain.getBlocks);
  assert.deepEqual(
    second.blocks.map((block) => block.height),
    [800, 750, 700, 650],
  );
  assert.ok(chain.read() > readAfterFirst, "older blocks were read");
  const starts = chain.calls.map(([from]) => from);
  assert.equal(new Set(starts).size, starts.length, "no range was requested twice");
});

test("maxScan caps one call and a later call picks up where it left off", async () => {
  const chain = fakeChain(1000);
  const index = new BusyBlockIndex(2);
  await index.extendUp(5000, chain.getBlocks);

  const capped = await index.page(Infinity, 3, 400, chain.getBlocks);
  assert.deepEqual(
    capped.blocks.map((block) => block.height),
    [5000],
  );
  assert.equal(capped.scannedTo, 4601);
  assert.equal(capped.exhausted, false);
  assert.equal(chain.read(), 400);

  const more = await index.page(Infinity, 3, 2000, chain.getBlocks);
  assert.deepEqual(
    more.blocks.map((block) => block.height),
    [5000, 4000, 3000],
  );
  assert.equal(chain.read(), 2200, "the second call did not reread the first 400");
});

test("reading reaches block 1 and reports the index exhausted", async () => {
  const chain = fakeChain(7);
  const index = new BusyBlockIndex(2);
  await index.extendUp(30, chain.getBlocks);
  const page = await index.page(Infinity, 100, 5000, chain.getBlocks);
  assert.deepEqual(
    page.blocks.map((block) => block.height),
    [28, 21, 14, 7],
  );
  assert.equal(page.scannedTo, 1);
  assert.equal(page.exhausted, true);
  assert.equal(chain.read(), 30, "only the heights above block 1 were read");
});

test("extendUp reads just the new heights and prepends what it finds", async () => {
  const chain = fakeChain(10);
  const index = new BusyBlockIndex(2);
  await index.extendUp(100, chain.getBlocks);
  await index.page(Infinity, 2, 5000, chain.getBlocks);
  const before = chain.read();

  const fresh = await index.extendUp(125, chain.getBlocks);
  assert.deepEqual(
    fresh.map((block) => block.height),
    [120, 110],
  );
  assert.equal(chain.read() - before, 25);
  assert.deepEqual(await index.extendUp(125, chain.getBlocks), [], "nothing new, nothing read");

  const page = await index.page(Infinity, 3, 5000, chain.getBlocks);
  assert.deepEqual(
    page.blocks.map((block) => block.height),
    [120, 110, 100],
  );
  assert.equal(page.head, 125);
});

test("concurrent pages share one read", async () => {
  const chain = fakeChain(50);
  const index = new BusyBlockIndex(2);
  await index.extendUp(1000, chain.getBlocks);
  const [a, b] = await Promise.all([index.page(Infinity, 3, 5000, chain.getBlocks), index.page(Infinity, 3, 5000, chain.getBlocks)]);
  assert.deepEqual(a.blocks, b.blocks);
  const starts = chain.calls.map(([from]) => from);
  assert.equal(new Set(starts).size, starts.length, "no range was requested twice");
});

test("a page before any head is known is empty rather than an error", async () => {
  const chain = fakeChain(2);
  const page = await new BusyBlockIndex().page(Infinity, 5, 100, chain.getBlocks);
  assert.deepEqual(page, { blocks: [], scannedTo: 0, head: 0, exhausted: false });
  assert.equal(chain.read(), 0);
});

test("spanText turns block counts into rough durations", () => {
  assert.equal(spanText(10), "1 minute");
  assert.equal(spanText(40), "2 minutes");
  assert.equal(spanText(600), "30 minutes");
  assert.equal(spanText(3000), "2.5 hours");
  assert.equal(spanText(2400), "2 hours");
  assert.equal(spanText(24_000), "20 hours");
});
