"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useHead } from "@/hooks/useHead";
import { decodeTokenAmountEventData, getBlockByHeight, getTokenInfoSync } from "@/lib/api";
import { ago, fmt, fmtRaw, plural, short, when } from "@/lib/format";
import { buildTxStory } from "@/lib/tx-story";
import { KOIN_CONTRACT_ID, VHP_CONTRACT_ID } from "@/koinos/constants";
import { Advanced, CopyButton, KV, Mono, RawJson } from "@/components/ks/Advanced";
import { Crumb, Empty, H2, Lede, Page, Section, Skeleton, Status, Title } from "@/components/ks/Page";
import { Avatar, Row } from "@/components/ks/Row";
import { Named, useNameOf } from "@/components/ks/Named";

const FINAL_DEPTH = 60;

interface RewardEvent {
  name: string;
  source: string;
  address: string;
  value: string;
}

function readRewardEvents(events: { name?: string; source?: string; data?: unknown }[] | undefined): RewardEvent[] {
  return (events ?? []).flatMap((event) => {
    const name = event.name ?? "";
    const mint = /mint_event$/i.test(name);
    const burn = /burn_event$/i.test(name);
    if (!mint && !burn) return [];
    let address: string | undefined;
    let value: string | undefined;
    if (typeof event.data === "string") {
      const decoded = decodeTokenAmountEventData(event.data);
      address = decoded?.address;
      value = decoded?.value;
    } else if (event.data && typeof event.data === "object") {
      const data = event.data as { to?: string; from?: string; value?: string };
      address = mint ? data.to : data.from;
      value = data.value;
    }
    if (!address || !value) return [];
    return [{ name: name.replace(/^koinos\.contracts\./, ""), source: event.source ?? "", address, value }];
  });
}

const lookup = (id: string) => {
  const info = getTokenInfoSync(id);
  return info ? { symbol: info.symbol, decimals: info.decimals } : null;
};

export default function BlockPage() {
  const { blockId } = useParams<{ blockId: string }>();
  const { rpcNode } = useWallet();
  const head = useHead(3000);
  const nameOf = useNameOf();
  const key = `${rpcNode}|${blockId}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [loaded, setLoaded] = useState<{ key: string; status: "ready" | "missing" | "error"; block: any } | null>(null);

  useEffect(() => {
    if (!rpcNode || !blockId) return;
    let active = true;
    getBlockByHeight(rpcNode, blockId)
      .then((data) => {
        if (!active) return;
        setLoaded(data?.block?.header ? { key, status: "ready", block: data } : { key, status: "missing", block: null });
      })
      .catch((error) => {
        console.error("[block]", error);
        if (active) setLoaded({ key, status: "error", block: null });
      });
    return () => {
      active = false;
    };
  }, [rpcNode, blockId, key]);

  const current = loaded?.key === key ? loaded : null;
  const state = current?.status ?? "loading";
  const block = current?.block ?? null;
  const height = Number(block?.block_height ?? block?.block?.header?.height ?? blockId);
  const producer: string = block?.block?.header?.signer ?? "";
  const timestamp = Number(block?.block?.header?.timestamp);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions: any[] = useMemo(() => block?.block?.transactions ?? [], [block]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receipts: any[] = useMemo(() => block?.receipt?.transaction_receipts ?? [], [block]);
  const rewards = useMemo(() => readRewardEvents(block?.receipt?.events), [block]);
  const koinReward = rewards.find((e) => /mint/i.test(e.name) && e.address === producer && (e.source === KOIN_CONTRACT_ID || lookup(e.source)?.symbol === "KOIN"));
  const vhpBurned = rewards.find((e) => /burn/i.test(e.name) && e.address === producer && (e.source === VHP_CONTRACT_ID || lookup(e.source)?.symbol === "VHP"));

  const headHeight = head?.height ?? null;
  const lastIrreversible = head?.lastIrreversible ?? null;
  const depth = headHeight !== null && Number.isFinite(height) ? headHeight - height : null;
  const final = lastIrreversible !== null && Number.isFinite(height) ? height <= lastIrreversible : depth !== null ? depth >= FINAL_DEPTH : null;
  const isHead = headHeight !== null && height >= headHeight;

  const stories = useMemo(
    () =>
      transactions.map((tx, index) => {
        const receipt = receipts.find((r) => r.id === tx.id) ?? receipts[index];
        return { tx, receipt, story: buildTxStory({ transaction: tx, receipt }, lookup) };
      }),
    [transactions, receipts],
  );

  return (
    <Page>
      <Crumb
        back="Blocks"
        backHref="/blocks"
        right={
          Number.isFinite(height) ? (
            <nav className="ks-step" aria-label="Neighbouring blocks">
              <Link href={`/blocks/${height - 1}`} className={height <= 1 ? "off" : undefined}>
                ‹ {fmt(height - 1)}
              </Link>
              <Link href={`/blocks/${height + 1}`} className={isHead ? "off" : undefined}>
                {fmt(height + 1)} ›
              </Link>
            </nav>
          ) : undefined
        }
      />

      {state === "loading" && <Skeleton lines={3} />}
      {state === "missing" && (
        <>
          <Title>Not yet</Title>
          <Lede>
            There is no block {fmt(blockId)} yet.{headHeight !== null && <> The chain is at block {fmt(headHeight)}.</>}
          </Lede>
        </>
      )}
      {state === "error" && (
        <>
          <Title>Could not load</Title>
          <Lede>The node did not answer. Try again in a moment, or pick another node in the menu.</Lede>
        </>
      )}

      {state === "ready" && (
        <>
          <Title>Block {fmt(height)}</Title>
          <Lede>
            Produced by <Named address={producer} /> {ago(timestamp)}
            {transactions.length ? (
              <>
                , carrying <b>{plural(transactions.length, "transaction")}</b>
              </>
            ) : (
              ", with no transactions"
            )}
            .
          </Lede>
          {final === null ? (
            <Status tone="quiet">Confirmed.</Status>
          ) : final ? (
            <Status>
              Final.{depth !== null && depth > 0 && <> {plural(depth, "block")} deep,</>} it can no longer change.
            </Status>
          ) : (
            <Status tone="pending">
              Confirmed, {depth ?? 0} of {FINAL_DEPTH} blocks to final{" "}
              <span className="ks-progress">
                <i style={{ width: `${Math.round(((depth ?? 0) / FINAL_DEPTH) * 100)}%` }} />
              </span>
            </Status>
          )}

          <Section label="Block reward" className="ks-list">
            <H2>Reward</H2>
            <Row
              lead={<Avatar address={producer} name={nameOf(producer, "") || null} />}
              title={nameOf(producer)}
              detail="Earned for producing this block"
              amount={koinReward ? `+${fmtRaw(koinReward.value, 8, 2)} KOIN` : "—"}
              amountSub={vhpBurned ? `burned ${fmtRaw(vhpBurned.value, 8, 2)} VHP` : undefined}
              amountTone="in"
              href={`/address/${producer}`}
              last
            />
          </Section>

          <Section label="Transactions" className="ks-list">
            <H2 count={transactions.length}>Transactions</H2>
            {stories.length === 0 && (
              <Empty>Nothing was sent in this block. Most Koinos blocks are empty; the chain keeps a steady 3-second beat whether or not anyone is transacting.</Empty>
            )}
            {stories.map(({ tx, receipt, story }) => {
              const transfer = story?.transfers[0];
              const payer = tx.header?.payer ?? "";
              const title = transfer
                ? `${nameOf(transfer.from)} sent ${transfer.amount} ${transfer.token.symbol} to ${nameOf(transfer.to)}`
                : story?.operations[0]?.contract
                  ? `${story.headline} on ${nameOf(story.operations[0].contract)}`
                  : story?.headline ?? "Transaction";
              return (
                <Row
                  key={tx.id}
                  lead={<Avatar address={payer} name={nameOf(payer, "") || null} />}
                  title={story?.failed ? `${title} (reverted)` : title}
                  detail={short(tx.id, 10, 5)}
                  amount={transfer ? `${transfer.amount} ${transfer.token.symbol}` : ""}
                  amountSub={receipt?.rc_used ? `${fmtRaw(receipt.rc_used, 8, 2)} mana` : undefined}
                  amountTone="out"
                  href={`/tx/${tx.id}`}
                />
              );
            })}
          </Section>

          <Advanced>
            <KV k="Block ID">
              <Mono>{block.block_id ?? block.receipt?.id}</Mono> <CopyButton value={block.block_id ?? block.receipt?.id ?? ""} what="Block id" />
            </KV>
            <KV k="Previous block">
              <Link href={`/blocks/${height - 1}`}>
                <Mono>{block.block?.header?.previous}</Mono>
              </Link>
            </KV>
            <KV k="Produced">{when(timestamp)}</KV>
            <KV k="Producer address">
              <Link href={`/address/${producer}`}>
                <Mono>{producer}</Mono>
              </Link>{" "}
              <CopyButton value={producer} what="Address" />
            </KV>
            <KV k="Resources">
              {fmt(block.receipt?.network_bandwidth_used)} bytes network, {(Number(block.receipt?.compute_bandwidth_used ?? 0) / 1e6).toFixed(2)}M compute, {fmt(block.receipt?.disk_storage_used)} bytes disk
            </KV>
            <KV k="State changes">{plural(block.receipt?.state_delta_entries?.length ?? 0, "entry", "entries")}</KV>
            <KV k="Block events">
              {rewards.length === 0 && <span className="text-sub">None</span>}
              {rewards.map((event, index) => (
                <div key={index} className="ks-event">
                  <div>
                    {event.name} <span className="text-sub">from </span>
                    <Named address={event.source} bold={false} />
                  </div>
                  <div className="ks-mono">
                    {short(event.address)}, {fmtRaw(event.value, 8, 8)}
                  </div>
                </div>
              ))}
            </KV>
            <KV k="Merkle root">
              <Mono>{block.block?.header?.transaction_merkle_root}</Mono>
            </KV>
            <KV k="Signature">
              <Mono>{short(block.block?.signature, 40, 0)}</Mono>
            </KV>
            <RawJson data={block} />
          </Advanced>
        </>
      )}
    </Page>
  );
}
