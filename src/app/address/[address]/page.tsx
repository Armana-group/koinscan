"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, utils } from "koilib";
import tokenAbi from "@/koinos/abi";
import { useWallet } from "@/contexts/WalletContext";
import { useNames } from "@/components/chrome/NamesProvider";
import { useKoinPrice } from "@/hooks/useKoinPrice";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { NICKNAMES_CONTRACT_ID } from "@/koinos/constants";
import { formatDetailedTransactions, getDetailedAccountHistory, getTransactionDetails, type DetailedTransaction } from "@/lib/api";
import { ago, fmt, fmtRaw, plural, short } from "@/lib/format";
import { buildHistoryItems, summarizeActivity, type HistoryItem, type TxRow } from "@/lib/history-rows";
import { isKnownProducer } from "@/lib/names";
import { formatUsdValue } from "@/lib/price";
import { CopyButton } from "@/components/ks/Advanced";
import { Filters, Toggle } from "@/components/ks/Controls";
import { Crumb, Empty, H2, Page, RowSkeleton, Section, Title } from "@/components/ks/Page";
import { Avatar, GlyphMark, ListMark, More, Row, TokenMark } from "@/components/ks/Row";
import { applyTokenMeta, resolveTokenMeta, unknownTokenAddresses, type TokenMeta } from "@/lib/token-meta";
import { useNameOf } from "@/components/ks/Named";

const PAGE_SIZE = 25;
type Filter = "all" | "received" | "sent" | "contracts" | "blocks";

async function lookupNickname(provider: NonNullable<ReturnType<typeof useWallet>["provider"]>, address: string): Promise<string | null> {
  try {
    const nicknames = new Contract({ id: NICKNAMES_CONTRACT_ID, provider, abi: utils.nicknamesAbi });
    const { result } = await nicknames.functions.get_main_token({ value: address });
    if (!result?.token_id) return null;
    const name = new TextDecoder().decode(utils.toUint8Array(String(result.token_id).slice(2)));
    return name || null;
  } catch {
    return null;
  }
}

function BlockRun({ run, advanced }: { run: Extract<HistoryItem, { kind: "run" }>; advanced: boolean }) {
  const [open, setOpen] = useState(false);
  const newest = run.blocks[0];
  const shown = open ? run.blocks : [];
  return (
    <div className={`ks-run${open ? " open" : ""}`}>
      <Row
        lead={<GlyphMark glyph="block" />}
        title={`${plural(run.blocks.length, "block")} produced ${run.day}`}
        detail={newest?.height ? `Newest ${fmt(newest.height)}${newest.timestamp ? `, ${ago(newest.timestamp)}` : ""}` : undefined}
        amount={`+${fmt(run.koinTotal, 2)} KOIN`}
        amountSub={run.vhpTotal ? `${fmt(run.vhpTotal, 1)} VHP burned` : undefined}
        amountTone="in"
        onClick={() => setOpen((value) => !value)}
      />
      <div className="ks-items">
        {shown.map((block) => (
          <Row
            key={block.id}
            title={`Block ${fmt(block.height)}`}
            detail={block.timestamp ? ago(block.timestamp) : undefined}
            hash={advanced ? block.id : undefined}
            amount={`+${fmtRaw(block.koin, 8, 4)} KOIN`}
            amountSub={`${fmtRaw(block.vhp, 8, 4)} VHP burned`}
            amountTone="in"
            href={`/blocks/${block.height}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function AddressPage() {
  const { address } = useParams<{ address: string }>();
  const { rpcNode, provider } = useWallet();
  const { nameOf, pools } = useNames();
  const nameFor = useNameOf();
  const price = useKoinPrice();
  const balances = useWalletBalances(address);

  const [nickname, setNickname] = useState<string | null>(null);
  const [raw, setRaw] = useState<DetailedTransaction[]>([]);
  const [rows, setRows] = useState<unknown[]>([]);
  // Tokens the history formatter could not name: ask their contracts.
  const unknownTokens = useMemo(() => unknownTokenAddresses(rows as Parameters<typeof unknownTokenAddresses>[0]).sort(), [rows]);
  const unknownKey = unknownTokens.join(",");
  const [meta, setMeta] = useState<{ key: string; map: Map<string, TokenMeta | null> }>();
  useEffect(() => {
    if (!provider || !unknownKey) return;
    let active = true;
    resolveTokenMeta(provider, unknownKey.split(",")).then((map) => active && setMeta({ key: unknownKey, map }));
    return () => {
      active = false;
    };
  }, [provider, unknownKey]);
  const namedRows = useMemo(() => (meta?.key === unknownKey ? applyTokenMeta(rows as Parameters<typeof applyTokenMeta>[0], meta.map) : rows), [rows, meta, unknownKey]);
  // Balances of those off-list tokens, so Holds shows them too.
  const offList = useMemo(() => (meta?.key === unknownKey ? [...meta.map.values()].filter((m): m is TokenMeta => Boolean(m)) : []), [meta, unknownKey]);
  const offListKey = `${address}|${offList.map((m) => m.address).join(",")}`;
  const [extra, setExtra] = useState<{ key: string; list: { meta: TokenMeta; value: number }[] }>();
  useEffect(() => {
    if (!provider || !offList.length) return;
    let active = true;
    Promise.all(
      offList.map(async (m) => {
        const contract = new Contract({ id: m.address, provider, abi: tokenAbi });
        const { result } = await contract.functions.balanceOf({ owner: address }).catch(() => ({ result: undefined }));
        return { meta: m, value: Number((result as { value?: string } | undefined)?.value ?? 0) / 10 ** m.decimals };
      }),
    ).then((list) => active && setExtra({ key: offListKey, list: list.filter((item) => item.value > 0) }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, address, offListKey]);
  const extraBalances = extra?.key === offListKey ? extra.list : [];
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    if (!provider || !address) return;
    let active = true;
    setNickname(null);
    lookupNickname(provider, address).then((name) => active && setNickname(name));
    return () => {
      active = false;
    };
  }, [provider, address]);

  // History: the first page, then "Earlier" pages appended below.
  const fetchPage = useCallback(
    async (after: DetailedTransaction | undefined) => {
      let sequence: string | undefined;
      if (after?.seq_num) {
        const seq = parseInt(after.seq_num, 10);
        if (Number.isFinite(seq)) sequence = String(seq - 1);
      }
      const entries = await getDetailedAccountHistory(rpcNode, address, PAGE_SIZE, false, true, sequence);
      return { entries, formatted: formatDetailedTransactions(entries, address) };
    },
    [rpcNode, address],
  );

  useEffect(() => {
    if (!rpcNode || !address) return;
    let active = true;
    setLoading(true);
    setError(null);
    setRaw([]);
    setRows([]);
    fetchPage(undefined)
      .then(({ entries, formatted }) => {
        if (!active) return;
        setRaw(entries);
        setRows(formatted);
        setHasMore(entries.length === PAGE_SIZE);
      })
      .catch((err) => {
        console.error("[history]", err);
        if (active) setError("Activity could not be loaded.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [rpcNode, address, fetchPage]);

  const loadMore = async () => {
    if (loadingMore || !raw.length) return;
    setLoadingMore(true);
    try {
      const { entries, formatted } = await fetchPage(raw[raw.length - 1]);
      setRaw((current) => [...current, ...entries]);
      setRows((current) => [...current, ...formatted]);
      setHasMore(entries.length === PAGE_SIZE);
    } catch (err) {
      console.error("[history]", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Transactions in the history carry no timestamp; fill them in a few at a time.
  useEffect(() => {
    const missing = (rows as { id: string; timestamp?: unknown; isBlockProduction?: boolean }[]).filter((row) => !row.timestamp && !row.isBlockProduction).map((row) => row.id);
    if (!missing.length || !rpcNode) return;
    let active = true;
    (async () => {
      for (let index = 0; index < missing.length; index += 4) {
        const batch = missing.slice(index, index + 4);
        const found = await Promise.all(
          batch.map(async (id) => {
            const details = await getTransactionDetails(rpcNode, id).catch(() => null);
            return [id, details?.transaction?.timestamp] as const;
          }),
        );
        if (!active) return;
        setRows((current) =>
          current.map((row) => {
            const r = row as { id: string; timestamp?: unknown };
            const hit = found.find(([id, ts]) => id === r.id && ts);
            return hit ? { ...r, timestamp: hit[1] } : row;
          }),
        );
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, rpcNode]);

  const items = useMemo(() => buildHistoryItems(namedRows, address), [namedRows, address]);
  const summary = useMemo(() => summarizeActivity(items), [items]);
  const producer = summary.blocks > 0 || pools.has(address) || isKnownProducer(address);
  const visible = items.filter((item) => {
    if (filter === "all") return true;
    if (item.kind === "run") return filter === "blocks";
    return item.filter === filter;
  });

  const name = nickname ? `@${nickname}` : nameOf(address);
  const koin = balances.balances.find((b) => b.token.symbol.toUpperCase() === "KOIN");
  const usd = koin && price ? koin.numericValue * price : null;
  const holdings = [
    ...balances.balances.map((b) => `${fmt(b.numericValue, b.numericValue < 1 ? 4 : 0)} ${b.token.symbol}`),
    ...extraBalances.map((e) => `${fmt(e.value, e.value < 1 ? 4 : 0)} ${e.meta.symbol}`),
  ];
  const holdingsText = holdings.length <= 1 ? holdings.join("") : `${holdings.slice(0, -1).join(", ")} and ${holdings[holdings.length - 1]}`;

  const filterOptions: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "received", label: "Received" },
    { value: "sent", label: "Sent" },
    producer ? { value: "blocks", label: "Blocks" } : { value: "contracts", label: "Contracts" },
  ];

  return (
    <Page className={advanced ? "ks-advanced-on" : ""}>
      <Crumb back="Home" backHref="/" right={<span>Address</span>} />

      <section className="ks-who" aria-label="Account">
        <Avatar address={address} name={name ?? null} large />
        <div style={{ minWidth: 0 }}>
          <Title>
            <span>{name ?? short(address)}</span>
            {producer && <span className="ks-badge">Block producer</span>}
          </Title>
          <div className="ks-hashline">
            <span>{name ? short(address) : address}</span>
            <CopyButton value={address} what="Address" />
          </div>
        </div>
      </section>

      <Section label="Balances" className="ks-worth ks-list">
        <H2>Holds</H2>
        {balances.loading ? (
          <div className="ks-skel" style={{ height: 52, width: 180, marginTop: 8 }} />
        ) : balances.error ? (
          <p className="ks-foot">{balances.error}</p>
        ) : (
          <>
            <div className="ks-n">{usd !== null ? formatUsdValue(usd) : koin ? `${fmt(koin.numericValue, 2)} KOIN` : "Nothing yet"}</div>
            {holdings.length > 0 && (
              <div className="ks-s">
                {holdingsText}
                {usd !== null && " at today's price"}
              </div>
            )}
            <div style={{ marginTop: 20 }}>
              {balances.balances.map((b) => (
                <Row
                  key={b.token.address}
                  lead={<TokenMark symbol={b.token.symbol} address={b.token.address} logo={b.token.logoURI} />}
                  title={b.token.name}
                  detail={
                    <>
                      {b.token.symbol}
                      <ListMark listed />
                    </>
                  }
                  amount={fmt(b.numericValue, b.numericValue < 1 ? 6 : 2)}
                  amountSub={b.token.symbol.toUpperCase() === "KOIN" && price ? formatUsdValue(b.numericValue * price) : undefined}
                  amountTone="out"
                  href={`/contracts/${b.token.address}`}
                  flat
                />
              ))}
              {extraBalances.map((e) => (
                <Row
                  key={e.meta.address}
                  lead={<TokenMark symbol={e.meta.symbol} address={e.meta.address} />}
                  title={e.meta.name}
                  detail={
                    <>
                      {e.meta.symbol}
                      <ListMark listed={false} />
                    </>
                  }
                  amount={fmt(e.value, e.value < 1 ? 6 : 2)}
                  amountTone="out"
                  href={`/contracts/${e.meta.address}`}
                  flat
                />
              ))}
              {balances.failures.length > 0 && (
                <p className="ks-foot">Could not verify {balances.failures.map((f) => f.token.symbol).join(", ")}.</p>
              )}
            </div>
          </>
        )}
      </Section>

      <Section label="Activity">
        <H2>Activity</H2>
        {!loading && !error && items.length > 0 && (
          <p className="ks-summary">
            {summary.blocks > 0 ? (
              <>
                Produced <b>{plural(summary.blocks, "block")}</b> and earned <b>{fmt(summary.koinEarned, 1)} KOIN</b> in the latest entries.
              </>
            ) : (
              <>
                Sent <b>{summary.sent}</b> and received <b>{summary.received}</b> transfers in the latest {plural(rows.length, "entry", "entries")}.
              </>
            )}
          </p>
        )}
        <div className="ks-controls">
          <Filters options={filterOptions} value={filter} onChange={setFilter} />
          <Toggle label="Advanced" on={advanced} onChange={setAdvanced} />
        </div>
        <div className="ks-list" style={{ marginTop: 8 }}>
          {loading && <RowSkeleton rows={5} />}
          {!loading && error && <Empty>{error}</Empty>}
          {!loading && !error && items.length === 0 && <Empty>No activity yet. When this address sends, receives or produces something, it will show up here.</Empty>}
          {!loading && !error && items.length > 0 && visible.length === 0 && <Empty>Nothing matches this filter in the entries loaded so far.</Empty>}
          {visible.map((item) =>
            item.kind === "run" ? <BlockRun key={item.key} run={item} advanced={advanced} /> : <TxRowView key={item.id} row={item} nameFor={nameFor} advanced={advanced} />,
          )}
        </div>
        {!loading && hasMore && (
          <More onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Earlier"}
          </More>
        )}
        {!loading && !hasMore && items.length > 0 && (
          <p className="ks-foot" style={{ textAlign: "center" }}>
            That is everything for this address.
          </p>
        )}
      </Section>
    </Page>
  );
}

function TxRowView({ row, nameFor, advanced }: { row: TxRow; nameFor: ReturnType<typeof useNameOf>; advanced: boolean }) {
  const title = row.counterparty ? `${row.title} ${nameFor(row.counterparty)}` : row.title;
  const detail = [row.detail, row.timestamp ? ago(row.timestamp) : "…"].filter(Boolean).join(", ");
  return (
    <Row
      lead={row.lead.type === "token" ? <TokenMark symbol={row.lead.token.symbol} address={row.lead.token.address} logo={row.lead.token.logoURI} /> : <GlyphMark glyph={row.lead.glyph} />}
      title={title}
      detail={detail}
      hash={advanced ? `${short(row.id, 10, 5)}${row.mana ? ` · ${fmtRaw(row.mana, 8, 2)} mana` : ""}` : undefined}
      amount={row.amount}
      amountSub={row.amountSub}
      amountTone={row.tone}
      href={`/tx/${row.id}`}
    />
  );
}
