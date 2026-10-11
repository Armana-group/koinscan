"use client";

// Who has staked in this pool, biggest first. Read from the cached server
// route for trusted nodes; a custom node is swept from the browser instead,
// so the server never relays to arbitrary URLs.
import { Provider } from "koilib";
import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { isKnownRpcNode } from "@/koinos/known-nodes";
import { fmt, rawToNumber } from "@/lib/format";
import { sweepPoolStakers, type PoolStakers as Stakers } from "@/lib/pool-stakers";
import { useNameOf } from "@/components/ks/Named";
import { Empty, H2, RowSkeleton, Section } from "@/components/ks/Page";
import { Avatar, More, Row } from "@/components/ks/Row";

const SHOW = 8;

interface Loaded {
  key: string;
  value: Stakers | null;
}

export function PoolStakers({ poolId, account }: { poolId: string; account: string | null }) {
  const { jsonRpcNode } = useWallet();
  const nameOf = useNameOf();
  const key = `${poolId}|${jsonRpcNode}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [shown, setShown] = useState(SHOW);

  useEffect(() => {
    if (!jsonRpcNode) return;
    const controller = new AbortController();
    (async () => {
      try {
        let value: Stakers;
        if (isKnownRpcNode(jsonRpcNode)) {
          const params = new URLSearchParams({ poolId, rpcNode: jsonRpcNode });
          const response = await fetch(`/api/pool-stakers?${params}`, { signal: controller.signal });
          if (!response.ok) throw new Error(`stakers ${response.status}`);
          value = (await response.json()) as Stakers;
        } else {
          value = await sweepPoolStakers(new Provider([jsonRpcNode]), poolId);
        }
        if (!controller.signal.aborted) setLoaded({ key, value });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.info("[fogata] stakers unavailable:", error);
        setLoaded({ key, value: null });
      }
    })();
    return () => controller.abort();
  }, [poolId, jsonRpcNode, key]);

  const current = loaded?.key === key ? loaded : null;
  const stakers = current?.value;

  return (
    <Section label="Stakers">
      <H2 count={stakers ? fmt(stakers.total) : undefined}>Stakers</H2>
      {!current && <RowSkeleton rows={3} />}
      {current && !stakers && <Empty>The staker list could not be loaded.</Empty>}
      {stakers && stakers.total === 0 && <Empty>Nobody has staked in this pool yet.</Empty>}
      {stakers && stakers.total > 0 && (
        <div className="ks-list">
          {stakers.stakers.slice(0, shown).map((staker) => {
            const you = staker.address === account;
            return (
              <Row
                key={staker.address}
                lead={<Avatar address={staker.address} name={nameOf(staker.address, "") || null} />}
                title={
                  <>
                    {nameOf(staker.address)}
                    {you && <span className="ks-badge" style={{ marginLeft: 8 }}>you</span>}
                  </>
                }
                detail={staker.share < 0.1 ? "under 0.1% of the pool" : `${staker.share.toFixed(1)}% of the pool`}
                amount={fmt(rawToNumber(staker.stake))}
                amountSub="VHP staked"
                amountTone="out"
                href={`/address/${staker.address}`}
              />
            );
          })}
        </div>
      )}
      {stakers && stakers.total > shown && <More onClick={() => setShown((n) => n + SHOW)}>{fmt(stakers.total - shown)} more</More>}
    </Section>
  );
}
