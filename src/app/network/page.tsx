"use client";

/**
 * VHP producing = difficulty / 300 (the PoB contract targets one block per
 * 300 ten-millisecond attempts), APY = 2% * virtual supply / VHP producing,
 * and a producer's expected block time is 10 * difficulty / VHP balance ms.
 * The same formulas as src/lib/fogata.ts and the Koinos block producer.
 */
import { Contract, type ProviderInterface, utils } from "koilib";
import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import tokenAbi from "@/koinos/abi";
import { abiPob } from "@/koinos/abis";
import { KOIN_CONTRACT_ID, POB_CONTRACT_ID, VHP_CONTRACT_ID } from "@/koinos/constants";
import { compact, fmt, short } from "@/lib/format";
import { retry } from "@/lib/retry";
import { Filters } from "@/components/ks/Controls";
import { Empty, Lede, Page, RowSkeleton, Title } from "@/components/ks/Page";
import { Avatar, More, Row } from "@/components/ks/Row";
import { KV, Lines } from "@/components/ks/Advanced";
import { useNameOf } from "@/components/ks/Named";

const SAMPLE = 100;
const SHOW = 12;
type View = "producers" | "supply" | "yield";

interface NetworkData {
  producers: { address: string; share: number; blocks: number }[];
  averageBlockTime: number;
  totalVhp: number;
  totalKoin: number;
  vhpProducing: number;
  apy: number;
  difficulty: number;
}

async function getNetworkData(provider: ProviderInterface): Promise<NetworkData> {
  const head = await provider.getHeadInfo();
  const blocks = await provider.getBlocks(Number(head.head_topology.height) - SAMPLE, SAMPLE, "", { returnBlock: true, returnReceipt: false });
  const counts = new Map<string, number>();
  for (const block of blocks) {
    const signer = block.block.header!.signer!;
    counts.set(signer, (counts.get(signer) ?? 0) + 1);
  }
  const producers = [...counts.entries()].map(([address, n]) => ({ address, blocks: n, share: (100 * n) / blocks.length })).sort((a, b) => b.share - a.share);
  const first = blocks[0];
  const last = blocks[blocks.length - 1];
  const averageBlockTime = (Number(last.block.header!.timestamp) - Number(first.block.header!.timestamp)) / (blocks.length - 1) / 1000;

  const vhp = new Contract({ id: VHP_CONTRACT_ID, provider, abi: tokenAbi });
  const koin = new Contract({ id: KOIN_CONTRACT_ID, provider, abi: tokenAbi });
  const pob = new Contract({ id: POB_CONTRACT_ID, provider, abi: abiPob });
  const [{ result: vhpSupply }, { result: koinSupply }, { result: metadata }] = await Promise.all([vhp.functions.totalSupply(), koin.functions.totalSupply(), pob.functions.get_metadata()]);
  const totalVhp = Number(vhpSupply!.value) / 1e8;
  const totalKoin = Number(koinSupply!.value) / 1e8;
  const difficulty = Number("0x" + utils.toHexString(utils.decodeBase64url(metadata!.value.difficulty)));
  const vhpProducing = (10 * difficulty) / 3000 / 1e8;
  const apy = (2 * (totalVhp + totalKoin)) / vhpProducing;
  return { producers, averageBlockTime, totalVhp, totalKoin, vhpProducing, apy, difficulty };
}

export default function NetworkPage() {
  const { provider, jsonRpcNode } = useWallet();
  const nameOf = useNameOf();
  const [loaded, setLoaded] = useState<{ key: string; data: NetworkData | null; error: boolean } | null>(null);
  const [view, setView] = useState<View>("producers");
  const [shown, setShown] = useState(SHOW);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!provider) return;
    let active = true;
    // A hundred blocks in one request is what public nodes throttle first after
    // a burst of page loads; two more tries a couple of seconds apart usually get through.
    retry(() => getNetworkData(provider), 3, 2000)
      .then((result) => active && setLoaded({ key: `${jsonRpcNode}|${attempt}`, data: result, error: false }))
      .catch((err) => {
        console.error("[network]", err);
        if (active) setLoaded({ key: `${jsonRpcNode}|${attempt}`, data: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [provider, jsonRpcNode, attempt]);

  const current = loaded?.key === `${jsonRpcNode}|${attempt}` ? loaded : null;
  const data = current?.data ?? null;
  const error = current?.error ?? false;
  const producers = useMemo(() => data?.producers ?? [], [data]);
  const maxShare = producers[0]?.share ?? 1;

  return (
    <Page list>
      <Title>Network</Title>
      <Lede>
        {data ? (
          <>
            <span className="ks-live" />A block every {data.averageBlockTime.toFixed(1)} seconds. <b>{compact(data.vhpProducing)} VHP</b> producing, <b>{data.apy.toFixed(1)}%</b> yearly yield.
          </>
        ) : (
          "A block every 3 seconds."
        )}
      </Lede>
      <Filters
        top
        options={[
          { value: "producers", label: "Producers" },
          { value: "supply", label: "Supply" },
          { value: "yield", label: "Yield" },
        ]}
        value={view}
        onChange={setView}
      />

      {!data && !error && <RowSkeleton rows={6} />}
      {error && (
        <>
          <Empty>The node did not answer, it may be busy. Try again in a moment, or pick another node in the menu.</Empty>
          <More onClick={() => setAttempt((n) => n + 1)}>Try again</More>
        </>
      )}

      {data && view === "producers" && (
        <>
          <div className="ks-list">
            {producers.slice(0, shown).map((producer) => {
              const name = nameOf(producer.address, "");
              return (
                <Row
                  key={producer.address}
                  lead={<Avatar address={producer.address} name={name || null} />}
                  title={
                    <>
                      {name || short(producer.address)}
                      <span className="ks-share">
                        <i style={{ width: `${(producer.share / maxShare) * 100}%` }} />
                      </span>
                    </>
                  }
                  detail={name ? short(producer.address) : "No name yet"}
                  amount={`${producer.share.toFixed(1)}%`}
                  amountSub={`of the last ${SAMPLE}`}
                  amountTone="in"
                  href={`/network/${producer.address}`}
                />
              );
            })}
          </div>
          {producers.length > shown && <More onClick={() => setShown((n) => n + SHOW)}>{fmt(producers.length - shown)} more producer{producers.length - shown === 1 ? "" : "s"}</More>}
        </>
      )}

      {data && view === "supply" && (
        <Lines className="mt-4">
          <KV k="KOIN">
            {fmt(data.totalKoin)} <span>in circulation</span>
          </KV>
          <KV k="VHP">
            {fmt(data.totalVhp)} <span>hash power, from burned KOIN</span>
          </KV>
          <KV k="Virtual supply">
            {fmt(data.totalKoin + data.totalVhp)} <span>KOIN and VHP together</span>
          </KV>
          <KV k="Producing">
            {fmt(data.vhpProducing)} VHP <span>· {((100 * data.vhpProducing) / data.totalVhp).toFixed(1)}% of all VHP is producing blocks</span>
          </KV>
        </Lines>
      )}

      {data && view === "yield" && (
        <>
          <Lines className="mt-4">
            <KV k="Yearly yield">
              {data.apy.toFixed(2)}% <span>for VHP that is producing</span>
            </KV>
            <KV k="Inflation">
              2% <span>of the virtual supply, paid to producers</span>
            </KV>
            <KV k="Block time">
              {data.averageBlockTime.toFixed(2)}s <span>average over the last {SAMPLE} blocks</span>
            </KV>
            <KV k="Difficulty">{data.difficulty.toExponential(3)}</KV>
          </Lines>
          <p className="ks-foot">The yield is 2% of the virtual supply divided by the VHP producing blocks. When more VHP produces, each VHP earns less.</p>
        </>
      )}
    </Page>
  );
}
