"use client";

import { Contract, Multicall, utils } from "koilib";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { FOGATA2_LIST_POOLS_CONTRACT_ID, VHP_CONTRACT_ID } from "@/koinos/constants";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import { computePoolApy, formatCompactVhp, formatPayoutPeriod, getNetworkStaking, summarizeFogata, type NetworkStaking } from "@/lib/fogata";
import { CreatePoolSheet } from "@/components/fogata/CreatePoolSheet";
import { PoolMark } from "@/components/fogata/PoolMark";
import { Empty, H2, Lede, Note, Page, RowSkeleton, Section, Status, Title } from "@/components/ks/Page";
import { GlyphMark, Row } from "@/components/ks/Row";

interface Pool {
  account: string;
  name: string;
  image: string;
  description: string;
  beneficiaries: { address: string; percentage: number }[];
  payment_period: string;
  vhp?: number;
}

function feeOf(pool: Pool): number {
  return (pool.beneficiaries ?? []).reduce((sum, b) => sum + b.percentage, 0) / 1000;
}

export default function FogataPage() {
  const { provider } = useWallet();
  const [pools, setPools] = useState<Pool[]>([]);
  const [network, setNetwork] = useState<NetworkStaking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!provider) return;
    let active = true;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const list = new Contract({ id: FOGATA2_LIST_POOLS_CONTRACT_ID, provider, abi: abiFogata2ListPools });
        const { result } = await list.functions.get_pools({ start: "", limit: 100, direction: 0 });
        const listed: { account: string }[] = result?.value ?? [];
        const contracts = listed.map((pool) => new Contract({ id: pool.account, provider, abi: abiFogata2Pool }));
        const vhp = new Contract({ id: VHP_CONTRACT_ID, provider, abi: utils.tokenAbi });
        const multicall = new Multicall({ provider, contracts: [...contracts, vhp] });
        for (const contract of contracts) await multicall.add(contract.functions.get_pool_params, {});
        for (const pool of listed) await multicall.add(vhp.functions.balanceOf, { owner: pool.account });
        const results = await multicall.call();
        if (!active) return;
        setPools(
          listed.map((pool, i) => {
            const balance = results[listed.length + i] as { value?: string } | Error;
            const amount = balance instanceof Error || balance?.value === undefined ? undefined : Number(balance.value) / 1e8;
            const params = results[i] instanceof Error ? {} : (results[i] as unknown as Partial<Pool>);
            return { name: "", image: "", description: "", beneficiaries: [], payment_period: "", ...params, ...pool, vhp: amount };
          }),
        );
        setNetwork(await getNetworkStaking(provider));
      } catch (err) {
        console.error("[fogata]", err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [provider, reloadKey]);

  const summary = summarizeFogata(
    pools.map((p) => p.vhp),
    network?.vhpProducing,
  );
  const ranked = [...pools]
    .map((pool) => ({ pool, apy: network ? computePoolApy(network.apy, pool.beneficiaries ?? []) : null }))
    .sort((a, b) => (b.apy ?? -1) - (a.apy ?? -1) || a.pool.name.localeCompare(b.pool.name));

  return (
    <Page>
      <Title>Fogata</Title>
      <Lede>Mine Koinos through a pool. Stake KOIN or VHP, the pool runs the node, and you&apos;re paid in KOIN.</Lede>
      {!loading && !error && pools.length > 0 && (
        <Status>
          {formatCompactVhp(summary.totalStaked)} VHP staked{summary.share !== null && <>, {summary.share.toFixed(1)}% of the network</>}.
        </Status>
      )}
      <p className="ks-docs">
        <Link href="/fogata/help#how-koinos-mining-works">How it works</Link>
        <Link href="/fogata/help">Fogata guide</Link>
        <Link href="/fogata/help#what-changed-in-fogata-2">What&apos;s new in v2</Link>
      </p>

      <Section label="Trade" className="ks-list">
        <H2>Trade</H2>
        <Row lead={<GlyphMark glyph="trade" />} title="Sell VHP for KOIN, or buy VHP" detail="Your VHP keeps earning until the order fills" href="/fogata/trade" />
      </Section>

      <Section label="Pools">
        <H2
          action={
            <button type="button" className="ks-btn ghost sm" onClick={() => setCreateOpen(true)}>
              Start a pool
            </button>
          }
        >
          Pools
        </H2>
        {loading && <RowSkeleton rows={3} />}
        {!loading && error && (
          <Empty>
            Pools could not be loaded.{" "}
            <button type="button" className="ks-link" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          </Empty>
        )}
        {!loading && !error && pools.length === 0 && <Empty>No pools are listed yet.</Empty>}
        {ranked.map(({ pool, apy }) => (
          <Link key={pool.account} href={`/fogata/${pool.account}`} className="ks-pool">
            <PoolMark poolId={pool.account} name={pool.name} image={pool.image} />
            <span style={{ minWidth: 0 }}>
              <span className="ks-t">{pool.name || "Unnamed pool"}</span>
              <span className="ks-d">
                {formatPayoutPeriod(pool.payment_period) !== "—" ? `Pays ${formatPayoutPeriod(pool.payment_period).toLowerCase()}` : "Payout period unknown"} · {feeOf(pool)}% fee
                {pool.vhp !== undefined && <> · {formatCompactVhp(pool.vhp)} VHP</>}
              </span>
            </span>
            <span className="ks-y">
              {apy !== null ? `${apy.toFixed(1)}%` : "—"}
              <small>a year, after fees</small>
            </span>
            <span className="ks-chev">›</span>
          </Link>
        ))}
        <Note>Pools are listed automatically once their contract is verified.</Note>
      </Section>

      <CreatePoolSheet open={createOpen} onOpenChange={setCreateOpen} />
    </Page>
  );
}
