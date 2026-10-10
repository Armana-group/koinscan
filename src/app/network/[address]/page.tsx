"use client";

import { type BlockHeaderJson, Contract, type ProviderInterface, utils } from "koilib";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { abiPob } from "@/koinos/abis";
import { POB_CONTRACT_ID, VHP_CONTRACT_ID } from "@/koinos/constants";
import { ago, compact, fmt, short } from "@/lib/format";
import { CopyButton, KV, Lines } from "@/components/ks/Advanced";
import { Crumb, Dot, H2, Lede, Page, Section, Skeleton, Title } from "@/components/ks/Page";
import { Avatar } from "@/components/ks/Row";
import { useNameOf } from "@/components/ks/Named";

interface ProducerStats {
  vhpBalance: number;
  vhpShare: number;
  expectedMs: number;
  averageMs?: number;
  effectiveness?: number;
  lastHeight?: number;
  lastTime?: Date;
  blocksLastDay: number;
  sample: number;
  /** No block in the last day. */
  idle: boolean;
}

function duration(ms?: number): string {
  if (ms === undefined || !Number.isFinite(ms) || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 90) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

async function getStats(provider: ProviderInterface, address: string): Promise<ProducerStats> {
  const vhp = new Contract({ id: VHP_CONTRACT_ID, provider, abi: utils.tokenAbi });
  const pob = new Contract({ id: POB_CONTRACT_ID, provider, abi: abiPob });
  const [{ result: balance }, { result: metadata }, history] = await Promise.all([
    vhp.functions.balanceOf({ owner: address }),
    pob.functions.get_metadata(),
    provider.call<{ values?: { block?: { header: BlockHeaderJson } }[] }>("account_history.get_account_history", { address, ascending: false, limit: 30, irreversible: false, seq_num: null }).catch(() => ({ values: [] })),
  ]);
  const vhpBalance = Number(balance?.value ?? 0) / 1e8;
  const difficulty = Number("0x" + utils.toHexString(utils.decodeBase64url(metadata!.value.difficulty)));
  const vhpProducing = (10 * difficulty) / 3000 / 1e8;
  const expectedMs = vhpBalance > 0 ? (10 * difficulty) / (vhpBalance * 1e8) : Infinity;
  const blocks = (history.values ?? []).flatMap((v) => (v.block ? [v.block] : []));
  const newest = blocks[0];
  const oldest = blocks[blocks.length - 1];
  let averageMs: number | undefined;
  if (newest && oldest && blocks.length > 1) {
    const newestTime = Number(newest.header.timestamp);
    const oldestTime = Number(oldest.header.timestamp);
    averageMs = Date.now() - newestTime > expectedMs ? (Date.now() - oldestTime) / blocks.length : (newestTime - oldestTime) / (blocks.length - 1);
  }
  const effectiveness = averageMs && Number.isFinite(expectedMs) ? (expectedMs * 100) / averageMs : undefined;
  return {
    vhpBalance,
    vhpShare: vhpProducing > 0 ? (vhpBalance * 100) / vhpProducing : 0,
    expectedMs,
    averageMs,
    effectiveness,
    lastHeight: newest ? Number(newest.header.height) : undefined,
    lastTime: newest ? new Date(Number(newest.header.timestamp)) : undefined,
    blocksLastDay: blocks.filter((b) => Date.now() - Number(b.header.timestamp) < 86_400_000).length,
    sample: blocks.length,
    idle: !newest || Date.now() - Number(newest.header.timestamp) > 86_400_000,
  };
}

export default function ProducerPage() {
  const { address } = useParams<{ address: string }>();
  const { provider, jsonRpcNode } = useWallet();
  const nameOf = useNameOf();
  const key = `${jsonRpcNode}|${address}`;
  const [loaded, setLoaded] = useState<{ key: string; stats: ProducerStats | null; error: boolean } | null>(null);

  useEffect(() => {
    if (!provider || !address) return;
    let active = true;
    getStats(provider, address)
      .then((s) => active && setLoaded({ key, stats: s, error: false }))
      .catch((err) => {
        console.error("[producer]", err);
        if (active) setLoaded({ key, stats: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [provider, address, key]);

  const current = loaded?.key === key ? loaded : null;
  const stats = current?.stats ?? null;
  const error = current?.error ?? false;
  const name = nameOf(address, "");
  const idle = stats?.idle ?? true;

  return (
    <Page>
      <Crumb back="Network" backHref="/network" right={<span>Block producer</span>} />
      <section className="ks-who" aria-label="Producer">
        <Avatar address={address} name={name || null} large />
        <div style={{ minWidth: 0 }}>
          <Title>{name || short(address)}</Title>
          <div className="ks-hashline">
            <span>{name ? short(address) : address}</span>
            <CopyButton value={address} what="Address" />
          </div>
        </div>
      </section>

      {!stats && !error && <Skeleton title={false} lines={3} />}
      {error && <Lede>This producer could not be loaded from the node.</Lede>}
      {stats && (
        <>
          <Section className="ks-big" label="Share">
            <H2>Share of the network</H2>
            <div className="ks-n">
              {stats.vhpShare.toFixed(1)}
              <small>%</small>
            </div>
            <p className="ks-est">
              <b>{compact(stats.vhpBalance)} VHP</b> producing, about one block every {duration(stats.expectedMs)}.
            </p>
            <p className="ks-status" style={{ marginTop: 10 }}>
              <Dot tone={idle ? "paused" : stats.effectiveness !== undefined && stats.effectiveness < 50 ? "late" : "ok"} />
              <span>
                {stats.lastTime ? (
                  <>
                    Last block{" "}
                    <Link href={`/blocks/${stats.lastHeight}`}>
                      <b>{fmt(stats.lastHeight)}</b>
                    </Link>
                    , {ago(stats.lastTime)}
                  </>
                ) : (
                  "No blocks produced recently"
                )}
              </span>
            </p>
          </Section>
          <Section label="Details">
            <Lines>
              <KV k="Blocks">
                {stats.blocksLastDay}
                {stats.sample === 30 && stats.blocksLastDay === 30 ? "+" : ""} in the last day
              </KV>
              <KV k="Block time">
                {duration(stats.averageMs)} <span>· expected {duration(stats.expectedMs)}</span>
              </KV>
              <KV k="Effectiveness">
                {stats.effectiveness !== undefined ? `${stats.effectiveness.toFixed(0)}%` : "—"} <span>· of expected blocks, over the last {stats.sample}</span>
              </KV>
              <KV k="Staked">{fmt(stats.vhpBalance)} VHP</KV>
              <KV k="Activity">
                <Link href={`/address/${address}`}>All blocks and transfers ›</Link>
              </KV>
            </Lines>
          </Section>
        </>
      )}
    </Page>
  );
}
