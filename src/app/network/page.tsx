"use client";

/**
 * VHP producing = difficulty / 300 (the PoB contract targets one block per
 * 300 ten-millisecond attempts), APY = 2% * virtual supply / VHP producing,
 * and a producer's expected block time is 10 * difficulty / VHP balance ms.
 * The same formulas as src/lib/fogata.ts and the Koinos block producer.
 */
import { Contract, type ProviderInterface, utils } from "koilib";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useHead } from "@/hooks/useHead";
import { slide, summarise, type SampledBlock, type WindowSummary } from "@/lib/block-window";
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
import { ProducerPie } from "@/components/ks/ProducerPie";
import { LineChart } from "@/components/ks/LineChart";
import { StackBar } from "@/components/ks/StackBar";
import { pieColour } from "@/lib/pie";

const SAMPLE = 100;
const SHOW = 12;
type View = "producers" | "supply" | "yield";

interface ChainStats {
  totalVhp: number;
  totalKoin: number;
  vhpProducing: number;
  apy: number;
  difficulty: number;
}

type NetworkData = ChainStats & WindowSummary;

// Supply and difficulty barely move; the block window updates on every new block.
const STATS_EVERY_MS = 60_000;

async function readBlocks(provider: ProviderInterface, from: number, count: number): Promise<SampledBlock[]> {
  const blocks = await provider.getBlocks(from, count, "", { returnBlock: true, returnReceipt: false });
  return blocks.map((b) => ({ height: Number(b.block.header!.height), timestamp: Number(b.block.header!.timestamp), signer: b.block.header!.signer! }));
}

async function readRecentBlocks(provider: ProviderInterface): Promise<SampledBlock[]> {
  const head = await provider.getHeadInfo();
  return readBlocks(provider, Number(head.head_topology.height) - SAMPLE, SAMPLE);
}

async function readStats(provider: ProviderInterface): Promise<ChainStats> {
  const vhp = new Contract({ id: VHP_CONTRACT_ID, provider, abi: tokenAbi });
  const koin = new Contract({ id: KOIN_CONTRACT_ID, provider, abi: tokenAbi });
  const pob = new Contract({ id: POB_CONTRACT_ID, provider, abi: abiPob });
  const [{ result: vhpSupply }, { result: koinSupply }, { result: metadata }] = await Promise.all([vhp.functions.totalSupply(), koin.functions.totalSupply(), pob.functions.get_metadata()]);
  const totalVhp = Number(vhpSupply!.value) / 1e8;
  const totalKoin = Number(koinSupply!.value) / 1e8;
  const difficulty = Number("0x" + utils.toHexString(utils.decodeBase64url(metadata!.value.difficulty)));
  const vhpProducing = (10 * difficulty) / 3000 / 1e8;
  const apy = (2 * (totalVhp + totalKoin)) / vhpProducing;
  return { totalVhp, totalKoin, vhpProducing, apy, difficulty };
}

interface Live {
  key: string;
  blocks: SampledBlock[];
  stats: ChainStats | null;
  error: boolean;
}

export default function NetworkPage() {
  const { provider, jsonRpcNode } = useWallet();
  const nameOf = useNameOf();
  const head = useHead(3000);
  const [live, setLive] = useState<Live | null>(null);
  const [view, setView] = useState<View>("producers");
  const [shown, setShown] = useState(SHOW);
  const [attempt, setAttempt] = useState(0);
  const key = `${jsonRpcNode}|${attempt}`;
  const fetching = useRef(false);

  // The first full read: the last hundred blocks and the chain's supply figures.
  useEffect(() => {
    if (!provider) return;
    let active = true;
    // A hundred blocks in one request is what public nodes throttle first after
    // a burst of page loads; two more tries a couple of seconds apart usually get through.
    retry(() => Promise.all([readRecentBlocks(provider), readStats(provider)]), 3, 2000)
      .then(([blocks, stats]) => active && setLive({ key, blocks, stats, error: false }))
      .catch((err) => {
        console.error("[network]", err);
        if (active) setLive({ key, blocks: [], stats: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [provider, key]);

  // Each new head: read only the blocks since the last one we have and slide them in.
  const lastHeight = live?.key === key && !live.error ? live.blocks[live.blocks.length - 1]?.height : undefined;
  useEffect(() => {
    if (!provider || !head || lastHeight === undefined || head.height <= lastHeight || fetching.current) return;
    const count = Math.min(head.height - lastHeight, SAMPLE);
    fetching.current = true;
    readBlocks(provider, head.height - count + 1, count)
      .then((incoming) => setLive((previous) => (previous && previous.key === key ? { ...previous, blocks: slide(previous.blocks, incoming, SAMPLE) } : previous)))
      // A missed update is fine: the next block asks again from the same place.
      .catch((err) => console.info("[network] new blocks unavailable:", err))
      .finally(() => {
        fetching.current = false;
      });
  }, [provider, head, lastHeight, key]);

  // Supply and yield, refreshed now and then while the tab is in view.
  const loaded = live?.key === key && !live.error;
  useEffect(() => {
    if (!provider || !loaded) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      readStats(provider)
        .then((stats) => setLive((previous) => (previous && previous.key === key ? { ...previous, stats } : previous)))
        .catch((err) => console.info("[network] supply unavailable:", err));
    }, STATS_EVERY_MS);
    return () => clearInterval(timer);
  }, [provider, loaded, key]);

  const current = live?.key === key ? live : null;
  const error = current?.error ?? false;
  const summary = useMemo(() => (current && !current.error ? summarise(current.blocks) : null), [current]);
  const data: NetworkData | null = summary && current?.stats ? { ...summary, ...current.stats } : null;
  const producers = useMemo(() => summary?.producers ?? [], [summary]);
  const maxShare = producers[0]?.share ?? 1;
  const blockLine = useMemo(() => (summary?.blockTimes ?? []).map((b) => ({ x: b.height, y: b.seconds })), [summary]);

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
      {data && blockLine.length > 1 && (
        <LineChart
          points={blockLine}
          height={56}
          colour="var(--faint)"
          reference={3}
          label={`Seconds between each of the last ${SAMPLE} blocks`}
          idle={<>Seconds between each of the last {SAMPLE} blocks · dashed line is the 3 second target</>}
          readout={(p) => (
            <>
              Block {fmt(p.x)} · <b>{p.y.toFixed(1)} s</b> after the one before
            </>
          )}
        />
      )}
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
          <ProducerPie producers={producers} sample={SAMPLE} nameOf={(address) => nameOf(address, "")} />
          <div className="ks-list">
            {producers.slice(0, shown).map((producer, index) => {
              const name = nameOf(producer.address, "");
              return (
                <Row
                  key={producer.address}
                  lead={<Avatar address={producer.address} name={name || null} />}
                  title={
                    <>
                      {name || short(producer.address)}
                      <span className="ks-share">
                        <i style={{ width: `${(producer.share / maxShare) * 100}%`, background: pieColour(index) }} />
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
        <>
          <StackBar
            label="Where all KOIN and VHP sits"
            parts={[
              { label: "KOIN in circulation", value: data.totalKoin, colour: "#522fe3" },
              { label: "VHP producing blocks", value: data.vhpProducing, colour: "#e4b80c" },
              { label: "VHP not producing", value: Math.max(0, data.totalVhp - data.vhpProducing), colour: "rgb(228 184 12 / 0.35)" },
            ]}
          />
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
        </>
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
