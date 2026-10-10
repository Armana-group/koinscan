"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useHead } from "@/hooks/useHead";
import { ago, fmt, plural } from "@/lib/format";
import { Filters } from "@/components/ks/Controls";
import { Empty, Lede, Page, RowSkeleton, Title } from "@/components/ks/Page";
import { Avatar, More, Row } from "@/components/ks/Row";
import { useNameOf } from "@/components/ks/Named";

const PAGE = 12;
type Filter = "latest" | "withTx";

interface BlockSummary {
  height: number;
  id: string;
  producer: string;
  timestamp: number;
  transactions: number;
}

interface BlockItem {
  block_height?: string;
  block_id?: string;
  block?: { id?: string; header?: { height?: string; signer?: string; timestamp?: string }; transactions?: unknown[] };
}

function readBlocks(items: BlockItem[]): BlockSummary[] {
  return items
    .map((item) => ({
      height: Number(item.block_height ?? item.block?.header?.height),
      id: item.block_id ?? item.block?.id ?? "",
      producer: item.block?.header?.signer ?? "",
      timestamp: Number(item.block?.header?.timestamp),
      transactions: item.block?.transactions?.length ?? 0,
    }))
    .filter((b) => Number.isFinite(b.height));
}

export default function BlocksPage() {
  const { provider } = useWallet();
  const head = useHead(3000);
  const nameOf = useNameOf();
  const [blocks, setBlocks] = useState<BlockSummary[]>([]);
  const [filter, setFilter] = useState<Filter>("latest");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [fresh, setFresh] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const oldest = useRef<number | null>(null);
  const newest = useRef<number | null>(null);

  const fetchRange = useCallback(
    async (from: number, count: number): Promise<BlockSummary[]> => {
      if (!provider || count <= 0) return [];
      const items = await provider.getBlocks(from, count, "", { returnBlock: true, returnReceipt: false });
      return readBlocks(items as unknown as BlockItem[]).sort((a, b) => b.height - a.height);
    },
    [provider],
  );

  // First load: the latest page.
  useEffect(() => {
    if (!provider || !head || newest.current !== null) return;
    let active = true;
    const start = Math.max(1, head.height - PAGE + 1);
    fetchRange(start, head.height - start + 1)
      .then((items) => {
        if (!active) return;
        setBlocks(items);
        newest.current = items[0]?.height ?? head.height;
        oldest.current = items[items.length - 1]?.height ?? start;
        setLoading(false);
      })
      .catch((err) => {
        console.error("[blocks]", err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [provider, head, fetchRange]);

  // New blocks slide in at the top as the head moves.
  useEffect(() => {
    if (!provider || !head || newest.current === null || head.height <= newest.current) return;
    let active = true;
    const from = newest.current + 1;
    fetchRange(from, Math.min(head.height - newest.current, PAGE))
      .then((items) => {
        if (!active || !items.length) return;
        newest.current = items[0].height;
        setBlocks((current) => [...items, ...current].slice(0, Math.max(current.length, PAGE) + items.length));
        setFresh(items[0].height);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [provider, head, fetchRange]);

  // Relative times keep moving.
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(timer);
  }, []);

  const loadMore = async () => {
    if (loadingMore || oldest.current === null) return;
    setLoadingMore(true);
    try {
      const to = oldest.current - 1;
      const from = Math.max(1, to - PAGE + 1);
      const items = await fetchRange(from, to - from + 1);
      oldest.current = items[items.length - 1]?.height ?? from;
      setBlocks((current) => [...current, ...items]);
    } finally {
      setLoadingMore(false);
    }
  };

  const visible = useMemo(() => (filter === "withTx" ? blocks.filter((b) => b.transactions > 0) : blocks), [blocks, filter]);
  const headAge = head ? ago(head.time) : "";

  return (
    <Page list>
      <Title>Blocks</Title>
      <Lede>
        {head ? (
          <>
            <span className="ks-live" />
            Block <b>{fmt(head.height)}</b> {headAge}, one every 3 seconds. {fmt(head.lastIrreversible)} and older are final.
          </>
        ) : (
          "A new block every 3 seconds."
        )}
      </Lede>
      <Filters
        top
        options={[
          { value: "latest", label: "Latest" },
          { value: "withTx", label: "With transactions" },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <div className="ks-list">
        {loading && <RowSkeleton rows={6} />}
        {!loading && error && <Empty>Blocks could not be loaded from this node. Pick another node in the menu.</Empty>}
        {!loading && !error && visible.length === 0 && <Empty>None of the blocks loaded so far carry a transaction. Load earlier blocks to find some.</Empty>}
        {visible.map((block) => (
          <Row
            key={block.height}
            lead={<Avatar address={block.producer} name={nameOf(block.producer, "") || null} />}
            title={`Block ${fmt(block.height)}`}
            detail={nameOf(block.producer)}
            amount={ago(block.timestamp)}
            amountSub={block.transactions ? plural(block.transactions, "transaction") : "empty"}
            amountTone="plain"
            href={`/blocks/${block.height}`}
            fresh={fresh === block.height}
          />
        ))}
      </div>
      {!loading && !error && (
        <More onClick={loadMore} disabled={loadingMore || oldest.current === 1}>
          {loadingMore ? "Loading…" : "Earlier blocks"}
        </More>
      )}
    </Page>
  );
}
