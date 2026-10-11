"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useHead } from "@/hooks/useHead";
import { isKnownRpcNode } from "@/koinos/known-nodes";
import { BusyBlockIndex, readBlockItems, spanText, type BlockItem, type BlockSummary, type BusyPage } from "@/lib/busy-blocks";
import { ago, fmt, plural } from "@/lib/format";
import { retry } from "@/lib/retry";
import { Filters } from "@/components/ks/Controls";
import { Empty, Foot, Lede, Page, RowSkeleton, Title } from "@/components/ks/Page";
import { Avatar, More, Row } from "@/components/ks/Row";
import { useNameOf } from "@/components/ks/Named";

const PAGE = 12;
/** Busy blocks per page: about one block in fifty carries a transaction, so this spans a few hours. */
const BUSY_PAGE = 50;
/** Blocks a browser-side sweep of a custom node reads per page at most. */
const BUSY_MAX_SCAN = 2500;
type Filter = "latest" | "withTx";

interface BusyState {
  blocks: BlockSummary[];
  /** Lowest height searched so far; null until the first page has loaded. */
  scannedTo: number | null;
  head: number;
  exhausted: boolean;
  loading: boolean;
  error: boolean;
}

const BUSY_EMPTY: BusyState = { blocks: [], scannedTo: null, head: 0, exhausted: false, loading: false, error: false };

function mergeBusy(current: BlockSummary[], incoming: BlockSummary[]): BlockSummary[] {
  const seen = new Set(current.map((block) => block.height));
  return [...incoming.filter((block) => block.transactions > 0 && !seen.has(block.height)), ...current].sort((a, b) => b.height - a.height);
}

export default function BlocksPage() {
  const { provider, jsonRpcNode } = useWallet();
  const head = useHead(3000);
  const nameOf = useNameOf();
  const [blocks, setBlocks] = useState<BlockSummary[]>([]);
  const [busy, setBusy] = useState<BusyState>(BUSY_EMPTY);
  const [filter, setFilter] = useState<Filter>("latest");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [error, setError] = useState(false);
  const [fresh, setFresh] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const oldest = useRef<number | null>(null);
  const newest = useRef<number | null>(null);
  // A custom node is swept from the browser; this keeps what has been read.
  const busyIndex = useRef<BusyBlockIndex | null>(null);
  // The head moves every few seconds; reads take it from here so a request in
  // flight is not restarted by every poll.
  const headRef = useRef(head);
  headRef.current = head;
  const nodeRef = useRef(jsonRpcNode);
  nodeRef.current = jsonRpcNode;

  const getBlocks = useCallback(
    (from: number, count: number) => {
      if (!provider) return Promise.resolve([] as BlockItem[]);
      return retry(() => provider.getBlocks(from, count, "", { returnBlock: true, returnReceipt: false }) as Promise<BlockItem[]>, 3, 1500);
    },
    [provider],
  );

  const fetchRange = useCallback(
    async (from: number, count: number): Promise<BlockSummary[]> => {
      if (!provider || count <= 0) return [];
      return readBlockItems(await getBlocks(from, count));
    },
    [provider, getBlocks],
  );

  // One page of busy blocks below `before`: from the server's index for a
  // trusted node, or by sweeping a custom node from here.
  const fetchBusy = useCallback(
    async (before: number | null): Promise<BusyPage> => {
      if (isKnownRpcNode(jsonRpcNode)) {
        const params = new URLSearchParams({ limit: String(BUSY_PAGE), rpcNode: jsonRpcNode });
        if (before !== null) params.set("before", String(before));
        const response = await fetch(`/api/busy-blocks?${params}`);
        if (!response.ok) throw new Error(`busy blocks ${response.status}`);
        return (await response.json()) as BusyPage;
      }
      const current = headRef.current;
      if (!current) throw new Error("no head yet");
      const index = busyIndex.current ?? new BusyBlockIndex();
      busyIndex.current = index;
      await index.extendUp(current.height, getBlocks);
      return index.page(before ?? Infinity, BUSY_PAGE, BUSY_MAX_SCAN, getBlocks);
    },
    [jsonRpcNode, getBlocks],
  );

  // Switching nodes starts both lists over.
  useEffect(() => {
    busyIndex.current = null;
    setBusy(BUSY_EMPTY);
  }, [jsonRpcNode]);

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

  // The busy list loads the first time the filter asks for it. A result from a
  // node the visitor has since switched away from is dropped.
  const headReady = head !== null;
  useEffect(() => {
    if (filter !== "withTx" || !headReady || busy.scannedTo !== null || busy.loading || busy.error) return;
    const node = jsonRpcNode;
    setBusy((current) => ({ ...current, loading: true }));
    fetchBusy(null)
      .then((page) => {
        if (nodeRef.current !== node) return;
        setBusy({ blocks: page.blocks, scannedTo: page.scannedTo, head: page.head, exhausted: page.exhausted, loading: false, error: false });
      })
      .catch((err) => {
        console.error("[blocks] busy", err);
        if (nodeRef.current === node) setBusy((current) => ({ ...current, loading: false, error: true }));
      });
  }, [filter, headReady, busy.scannedTo, busy.loading, busy.error, fetchBusy, jsonRpcNode]);

  // New blocks slide in at the top as the head moves; busy ones join that list too.
  useEffect(() => {
    if (!provider || !head || newest.current === null || head.height <= newest.current) return;
    let active = true;
    const from = newest.current + 1;
    fetchRange(from, Math.min(head.height - newest.current, PAGE))
      .then((items) => {
        if (!active || !items.length) return;
        newest.current = items[0].height;
        setBlocks((current) => [...items, ...current].slice(0, Math.max(current.length, PAGE) + items.length));
        setBusy((current) => (current.scannedTo === null ? current : { ...current, blocks: mergeBusy(current.blocks, items), head: Math.max(current.head, items[0].height) }));
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
    if (loadingMore) return;
    setLoadingMore(true);
    setMoreError(false);
    try {
      if (filter === "withTx") {
        if (busy.scannedTo === null || busy.exhausted) return;
        const page = await fetchBusy(busy.scannedTo);
        setBusy((current) => ({ ...current, blocks: [...current.blocks, ...page.blocks.filter((block) => !current.blocks.some((b) => b.height === block.height))], scannedTo: page.scannedTo, exhausted: page.exhausted, error: false }));
      } else {
        if (oldest.current === null) return;
        const to = oldest.current - 1;
        const from = Math.max(1, to - PAGE + 1);
        const items = await fetchRange(from, to - from + 1);
        oldest.current = items[items.length - 1]?.height ?? from;
        setBlocks((current) => [...current, ...items]);
      }
    } catch (err) {
      console.error("[blocks] more", err);
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const withTx = filter === "withTx";
  const visible = useMemo(() => (withTx ? busy.blocks : blocks), [withTx, busy.blocks, blocks]);
  const headAge = head ? ago(head.time) : "";
  const busyLoading = withTx && busy.scannedTo === null && !busy.error;
  const searched = busy.scannedTo !== null && head ? Math.max(0, head.height - busy.scannedTo + 1) : 0;
  const moreDisabled = loadingMore || (withTx ? busy.scannedTo === null || busy.exhausted : oldest.current === 1);

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
        {(loading || busyLoading) && <RowSkeleton rows={6} />}
        {!loading && error && !withTx && <Empty>Blocks could not be loaded from this node. Pick another node in the menu.</Empty>}
        {withTx && busy.error && busy.scannedTo === null && <Empty>Blocks with transactions could not be loaded from this node. Pick another node in the menu.</Empty>}
        {withTx && busy.scannedTo !== null && visible.length === 0 && (
          <Empty>
            No transactions in the last {fmt(searched)} blocks, about {spanText(searched)}.{busy.exhausted ? "" : " Load earlier blocks to keep looking."}
          </Empty>
        )}
        {!busyLoading &&
          visible.map((block) => (
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
      {withTx && busy.scannedTo !== null && visible.length > 0 && (
        <Foot>
          Searched the last {fmt(searched)} blocks, about {spanText(searched)}.{busy.exhausted ? " That is the whole chain." : ""}
        </Foot>
      )}
      {moreError && (
        <Foot>
          <span style={{ color: "var(--bad)" }}>The node did not answer. Try again in a moment.</span>
        </Foot>
      )}
      {!loading && !error && !busyLoading && (
        <More onClick={loadMore} disabled={moreDisabled}>
          {loadingMore ? "Loading…" : moreError ? "Try again" : "Earlier blocks"}
        </More>
      )}
    </Page>
  );
}
