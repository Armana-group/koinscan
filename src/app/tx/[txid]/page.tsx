"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { getTokenInfoSync, getTransactionDetails } from "@/lib/api";
import { ago, fmt, fmtRaw, humanize, short } from "@/lib/format";
import { buildTxStory, type TxStory } from "@/lib/tx-story";
import { Advanced, CopyButton, KV, Mono, RawJson } from "@/components/ks/Advanced";
import { Crumb, Lede, Page, Section, Skeleton, Status, Title, H2, Empty } from "@/components/ks/Page";
import { Avatar } from "@/components/ks/Row";
import { Named, Sentence, useNameOf, hrefFor } from "@/components/ks/Named";

type Lookup = Parameters<typeof buildTxStory>[1];
const lookup: Lookup = (id) => {
  const info = getTokenInfoSync(id);
  return info ? { symbol: info.symbol, decimals: info.decimals, address: info.address, logoURI: info.logoURI } : null;
};

interface BlockRef {
  id: string;
  height: number | null;
}

export default function TransactionPage() {
  const { txid } = useParams<{ txid: string }>();
  const { rpcNode, provider } = useWallet();
  const nameOf = useNameOf();
  const key = `${rpcNode}|${txid}`;
  const [loaded, setLoaded] = useState<{ key: string; status: "ready" | "missing" | "error"; payload: unknown; block: BlockRef | null } | null>(null);

  useEffect(() => {
    if (!rpcNode || !txid) return;
    let active = true;
    (async () => {
      try {
        const data = await getTransactionDetails(rpcNode, txid);
        if (!active) return;
        if (!data?.transaction) {
          setLoaded({ key, status: "missing", payload: null, block: null });
          return;
        }
        setLoaded({ key, status: "ready", payload: data, block: null });
        const blockId = data.containing_blocks?.[0];
        if (blockId) {
          const info = provider
            ? await provider
                .call<{ block_items?: { block_height?: string }[] }>("block_store.get_blocks_by_id", { block_ids: [blockId], return_block: false, return_receipt: false })
                .catch(() => null)
            : null;
          if (!active) return;
          const height = Number(info?.block_items?.[0]?.block_height);
          const block = { id: blockId, height: Number.isFinite(height) && height > 0 ? height : null };
          setLoaded((previous) => (previous?.key === key ? { ...previous, block } : previous));
        }
      } catch (error) {
        console.error("[tx]", error);
        if (active) setLoaded({ key, status: "error", payload: null, block: null });
      }
    })();
    return () => {
      active = false;
    };
  }, [rpcNode, provider, txid, key]);

  const current = loaded?.key === key ? loaded : null;
  const state = current?.status ?? "loading";
  const payload = current?.payload ?? null;
  const block = current?.block ?? null;
  const story: TxStory | null = useMemo(() => (payload ? buildTxStory(payload, lookup) : null), [payload]);

  const blockLink = block ? (
    <Link href={`/blocks/${block.height ?? block.id}`}>
      <b>{block.height ? `block ${fmt(block.height)}` : `block ${short(block.id, 8, 4)}`}</b>
    </Link>
  ) : null;

  return (
    <Page>
      <Crumb back={block?.height ? `Block ${fmt(block.height)}` : "Blocks"} backHref={block ? `/blocks/${block.height ?? block.id}` : "/blocks"} right={<span>Transaction</span>} />

      {state === "loading" && <Skeleton lines={3} />}
      {state === "missing" && (
        <>
          <Title>Not found</Title>
          <Lede>No transaction with this id has been included in a block.</Lede>
          <p className="ks-status">
            <Mono>{txid}</Mono>
          </p>
        </>
      )}
      {state === "error" && (
        <>
          <Title>Could not load</Title>
          <Lede>The node did not answer. Try again in a moment, or pick another node in the menu.</Lede>
        </>
      )}

      {state === "ready" && story && (
        <>
          <Title>{story.headline}</Title>
          <Lede>
            <Sentence parts={story.lede} />
          </Lede>
          {story.pending ? (
            <Status tone="pending">Waiting to be included in a block.</Status>
          ) : story.failed ? (
            <Status tone="failed">
              Reverted {story.timestamp ? ago(story.timestamp) : ""}
              {blockLink && <> in {blockLink}</>}. Nothing moved; only mana was spent.
            </Status>
          ) : (
            <Status>
              Confirmed {story.timestamp ? ago(story.timestamp) : ""}
              {blockLink && <> in {blockLink}</>}.
            </Status>
          )}

          <Section label="Parties" className="ks-parties ks-list">
            <H2>Who</H2>
            {story.parties.map((party) => {
              const name = nameOf(party.address, "");
              return (
                <div key={`${party.role}-${party.address}`} className="ks-row no-chev">
                  <span className="ks-role">{party.role}</span>
                  <Avatar address={party.address} name={name || null} />
                  <span className="ks-what">
                    <span className="ks-t">
                      <Link href={hrefFor(party.address)}>{name || short(party.address)}</Link>
                    </span>
                    {name && <span className="ks-d">{short(party.address)}</span>}
                  </span>
                  <CopyButton value={party.address} what="Address" />
                </div>
              );
            })}
            {story.parties.length === 0 && <Empty>No accounts were involved.</Empty>}
          </Section>

          <Advanced>
            <KV k="Transaction ID">
              <Mono>{txid}</Mono> <CopyButton value={txid} what="Transaction id" />
            </KV>
            <KV k="Mana used">
              {story.manaUsed ? fmtRaw(story.manaUsed, 8, 4) : "—"} <span className="text-sub">paid by </span>
              <Named address={story.payer} bold={false} />
            </KV>
            {story.failed && story.logs.length > 0 && (
              <KV k="Log">
                <span className="ks-mono ks-reason">{story.logs.join("\n")}</span>
              </KV>
            )}
            <KV k={story.operations.length > 1 ? "Operations" : "Operation"}>
              {story.operations.length === 0 && <span className="text-sub">None</span>}
              {story.operations.map((op, index) => (
                <div key={index} className="ks-op">
                  {op.kind === "call" ? (
                    <div>
                      {op.method ? humanize(op.method).toLowerCase() : "call"} on <Named address={op.contract ?? ""} /> <span className="ks-hashid">{short(op.contract)}</span>
                    </div>
                  ) : op.kind === "upload" ? (
                    <div>
                      upload contract <Named address={op.contract ?? ""} />
                    </div>
                  ) : (
                    <div>system operation</div>
                  )}
                  {op.args && Object.keys(op.args).length > 0 && (
                    <div className="ks-args">
                      {Object.entries(op.args).map(([key, value]) => (
                        <div key={key}>
                          <span>{key}</span>
                          <span className="ks-mono">{typeof value === "string" ? value : JSON.stringify(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </KV>
            <KV k="Events">
              {story.events.length === 0 && <span className="text-sub">None</span>}
              {story.events.map((event, index) => (
                <div key={index} className="ks-event">
                  <div>
                    {event.name.replace(/^koinos\.contracts\./, "")} <span className="text-sub">from </span>
                    <Named address={event.source} bold={false} />
                  </div>
                  <div className="ks-mono">{typeof event.data === "string" ? event.data : JSON.stringify(event.data)}</div>
                </div>
              ))}
            </KV>
            <RawJson data={payload} />
          </Advanced>
        </>
      )}
    </Page>
  );
}
