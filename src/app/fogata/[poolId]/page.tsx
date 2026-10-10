"use client";

import { type BlockHeaderJson, Contract, Multicall, type ProviderInterface, utils } from "koilib";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import tokenAbi from "@/koinos/abi";
import { abiKoin } from "@/koinos/abis/koin";
import { abiPob } from "@/koinos/abis";
import { KOIN_CONTRACT_ID, POB_CONTRACT_ID, VHP_CONTRACT_ID } from "@/koinos/constants";
import { computePoolApy, estimateEarnings, formatAmountForInput, formatKoinEstimate, formatPayoutPeriod, getNetworkStaking, poolHealth, sanitizeDecimalInput, type NetworkStaking } from "@/lib/fogata";
import { ago, compact, fmt, fmtRaw, rawToNumber, short, until } from "@/lib/format";
import * as toast from "@/lib/toast";
import { Sheet } from "@/components/chrome/Sheet";
import { ConnectButton } from "@/components/chrome/WalletSheet";
import { ManagePoolSheet } from "@/components/fogata/ManagePoolSheet";
import { PoolMark } from "@/components/fogata/PoolMark";
import { toBaseUnits, type Beneficiary } from "@/components/fogata/pool-form";
import { Advanced, CopyButton, KV, Lines, Mono } from "@/components/ks/Advanced";
import { AmountInput, Segmented } from "@/components/ks/Controls";
import { Crumb, Dot, H2, Lede, Page, Section, Skeleton, Title } from "@/components/ks/Page";

type RewardMode = "percentage" | "virtual";
const SCALE = 1e8;
const DAY = 86_400_000;

interface PoolParams {
  name: string;
  image: string;
  description: string;
  beneficiaries: Beneficiary[];
  payment_period: string;
}
interface PoolBalance {
  koin_amount: string;
  vhp_amount: string;
}
interface Preferences {
  percentage_koin: string;
  all_after_virtual: string;
}
interface Performance {
  vhpAmount?: number;
  koinAmount?: number;
  manaPercentage?: number;
  averageTimeToProduce?: number;
  expectedTimeToProduce?: number;
  effectiveness?: number;
  lastBlockHeight?: number;
  lastBlockTime?: Date;
  blocksLastDay?: number;
  sampleSize?: number;
}

function duration(ms?: number): string {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 90) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

async function recentBlocks(provider: ProviderInterface, producer: string): Promise<{ header: BlockHeaderJson }[]> {
  const result = await provider.call<{ values?: { block?: { header: BlockHeaderJson } }[] }>("account_history.get_account_history", {
    address: producer,
    ascending: false,
    limit: 30,
    irreversible: false,
    seq_num: null,
  });
  return (result.values ?? []).flatMap((entry) => (entry.block ? [entry.block] : []));
}

export default function FogataPoolPage() {
  const { poolId } = useParams<{ poolId: string }>();
  const { provider, signer, savedAddress } = useWallet();
  const account = signer?.getAddress() ?? savedAddress ?? null;

  const [params, setParams] = useState<PoolParams | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [reservedKoin, setReservedKoin] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState("");
  const [performance, setPerformance] = useState<Performance>({});
  const [nextPayment, setNextPayment] = useState<Date | null>(null);
  const [wallet, setWallet] = useState<{ koin: string; vhp: string } | null>(null);
  const [balance, setBalance] = useState<PoolBalance | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [network, setNetwork] = useState<NetworkStaking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sheet, setSheet] = useState<"deposit" | "withdraw" | "rewards" | "manage" | null>(null);
  const [depositToken, setDepositToken] = useState<"koin" | "vhp">("koin");
  const [withdrawToken, setWithdrawToken] = useState<"koin" | "vhp">("vhp");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [rewardMode, setRewardMode] = useState<RewardMode>("percentage");
  const [percentageKoin, setPercentageKoin] = useState("100");
  const [allAfterVirtual, setAllAfterVirtual] = useState("");

  useEffect(() => {
    if (!provider) return;
    getNetworkStaking(provider)
      .then(setNetwork)
      .catch((err) => console.info("[fogata] network unavailable:", err));
  }, [provider]);

  const load = useCallback(async () => {
    if (!provider || !poolId) return;
    setLoading(true);
    setError(false);
    try {
      const pool = new Contract({ id: poolId, provider, abi: abiFogata2Pool });
      const pob = new Contract({ id: POB_CONTRACT_ID, provider, abi: abiPob });
      const koin = new Contract({ id: KOIN_CONTRACT_ID, provider, abi: abiKoin });
      const vhp = new Contract({ id: VHP_CONTRACT_ID, provider, abi: tokenAbi });
      const multicall = new Multicall({ provider, contracts: [pool, pob, koin, vhp] });
      await multicall.add(pool.functions.get_pool_params, {});
      await multicall.add(pool.functions.get_owner, {});
      await multicall.add(pool.functions.get_all_reserved_koin, {});
      await multicall.add(vhp.functions.balanceOf, { owner: poolId });
      await multicall.add(koin.functions.balanceOf, { owner: poolId });
      await multicall.add(koin.functions.get_account_rc, { owner: poolId });
      await multicall.add(pob.functions.get_metadata, {});
      await multicall.add(pool.functions.get_pool_state, {});
      if (account) {
        await multicall.add(koin.functions.balanceOf, { owner: account });
        await multicall.add(vhp.functions.balanceOf, { owner: account });
        await multicall.add(pool.functions.get_collect_koin_preferences, { value: account });
      }
      const keyRequest = account ? pob.functions.get_public_key({ producer: poolId }).catch(() => null) : Promise.resolve(null);
      const balanceRequest = account
        ? pool.functions
            .balance_of({ value: account })
            .then((r) => ({ result: r.result as Partial<PoolBalance> | undefined, error: false }))
            .catch(() => ({ result: undefined, error: true }))
        : Promise.resolve(null);
      const blocksRequest = recentBlocks(provider, poolId).catch(() => [] as { header: BlockHeaderJson }[]);
      const [results, keyResponse, balanceResponse, blocks] = await Promise.all([multicall.call(), keyRequest, balanceRequest, blocksRequest]);

      const isErr = (v: unknown): v is Error => v instanceof Error;
      const paramsResult = results[0] as PoolParams | Error;
      const ownerResult = results[1] as { value?: string } | Error;
      if (isErr(paramsResult)) throw paramsResult;
      if (isErr(ownerResult)) throw ownerResult;
      setParams(paramsResult);
      setOwner(ownerResult.value ?? null);
      const reserved = results[2] as { value?: string } | Error;
      setReservedKoin(isErr(reserved) ? null : (reserved.value ?? "0"));
      setPublicKey(keyResponse?.result?.value ?? "");
      const state = results[7] as { next_snapshot?: string } | Error;
      const nextSnapshot = isErr(state) ? NaN : Number(state.next_snapshot);
      setNextPayment(Number.isFinite(nextSnapshot) && nextSnapshot > 0 ? new Date(nextSnapshot) : null);

      const read = (v: unknown) => (isErr(v) ? undefined : Number((v as { value?: string }).value ?? "0") / SCALE);
      const vhpAmount = read(results[3]);
      const koinAmount = read(results[4]);
      const mana = read(results[5]);
      const metadata = results[6] as { value?: { difficulty?: string } } | Error;
      let expected: number | undefined;
      if (!isErr(metadata) && metadata.value?.difficulty && vhpAmount && vhpAmount > 0) {
        const difficulty = Number("0x" + utils.toHexString(utils.decodeBase64url(metadata.value.difficulty)));
        const value = (10 * difficulty) / (vhpAmount * SCALE);
        if (Number.isFinite(value)) expected = value;
      }
      const newest = blocks[0];
      const oldest = blocks[blocks.length - 1];
      const newestTime = newest ? Number(newest.header.timestamp) : undefined;
      const oldestTime = oldest ? Number(oldest.header.timestamp) : undefined;
      let average: number | undefined;
      if (newestTime !== undefined && oldestTime !== undefined && expected !== undefined) {
        if (Date.now() - newestTime > expected) average = (Date.now() - oldestTime) / blocks.length;
        else if (blocks.length > 1) average = (newestTime - oldestTime) / (blocks.length - 1);
      }
      const effectiveness = expected !== undefined && average !== undefined && average > 0 ? (expected * 100) / average : undefined;
      setPerformance({
        vhpAmount,
        koinAmount,
        manaPercentage: mana !== undefined && koinAmount ? (mana * 100) / koinAmount : undefined,
        expectedTimeToProduce: expected,
        averageTimeToProduce: average,
        effectiveness: effectiveness !== undefined && Number.isFinite(effectiveness) ? effectiveness : undefined,
        lastBlockHeight: newest ? Number(newest.header.height) : undefined,
        lastBlockTime: newestTime !== undefined ? new Date(newestTime) : undefined,
        blocksLastDay: blocks.filter((b) => Date.now() - Number(b.header.timestamp) < DAY).length,
        sampleSize: blocks.length,
      });

      if (account) {
        const k = results[8] as { value?: string } | Error;
        const v = results[9] as { value?: string } | Error;
        setWallet(isErr(k) || isErr(v) ? null : { koin: k.value ?? "0", vhp: v.value ?? "0" });
        if (!balanceResponse?.result || balanceResponse.result.koin_amount === undefined || balanceResponse.result.vhp_amount === undefined) {
          setBalance(null);
          setBalanceError(true);
        } else {
          setBalance({ koin_amount: balanceResponse.result.koin_amount, vhp_amount: balanceResponse.result.vhp_amount });
          setBalanceError(false);
        }
        const prefs = results[10] as Partial<Preferences> | Error;
        if (!isErr(prefs) && (prefs.percentage_koin !== undefined || prefs.all_after_virtual !== undefined)) {
          const next = { percentage_koin: prefs.percentage_koin ?? "0", all_after_virtual: prefs.all_after_virtual ?? "0" };
          setPreferences(next);
          if (BigInt(next.all_after_virtual || "0") > BigInt(0)) {
            setRewardMode("virtual");
            setAllAfterVirtual(String(Number(next.all_after_virtual) / SCALE));
            setPercentageKoin("0");
          } else {
            setRewardMode("percentage");
            setPercentageKoin(String(Number(next.percentage_koin) / 1000));
            setAllAfterVirtual("");
          }
        } else setPreferences(null);
      } else {
        setWallet(null);
        setBalance(null);
        setPreferences(null);
        setBalanceError(false);
      }
    } catch (err) {
      console.error("[fogata] pool:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [provider, poolId, account]);

  useEffect(() => {
    void load();
  }, [load]);

  const apy = network && params ? computePoolApy(network.apy, params.beneficiaries ?? []) : null;
  const health = poolHealth(performance);
  const fee = (params?.beneficiaries ?? []).reduce((sum, b) => sum + b.percentage, 0) / 1000;
  const staked = balance ? (BigInt(balance.vhp_amount) + BigInt(balance.koin_amount)).toString() : null;
  const hasStake = staked !== null && BigInt(staked) > BigInt(0);
  const payout = formatPayoutPeriod(params?.payment_period);
  const earnings = hasStake && apy !== null ? estimateEarnings(Number(staked) / SCALE, apy, params?.payment_period) : null;
  const share = network && performance.vhpAmount ? (performance.vhpAmount * 100) / network.vhpProducing : null;
  const isOwner = Boolean(account && owner && account === owner);
  const depositValue = Number(depositAmount);
  const depositEstimate = apy !== null && depositValue > 0 ? estimateEarnings(depositValue, apy) : null;
  const rewardsText = preferences
    ? BigInt(preferences.all_after_virtual || "0") > BigInt(0)
      ? `keep ${fmtRaw(preferences.all_after_virtual, 8, 2)} VHP`
      : Number(preferences.percentage_koin) === 0
        ? "kept as VHP"
        : `${Number(preferences.percentage_koin) / 1000}% as KOIN`
    : null;

  const requireWallet = (): string | null => {
    if (!account || !signer) {
      toast.error("Connect your wallet to continue");
      return null;
    }
    return account;
  };

  const submit = async (label: string, success: string, action: () => Promise<{ transaction?: { wait: () => Promise<unknown> }; receipt?: { reverted?: boolean } }>) => {
    setSubmitting(true);
    const loadingToast = toast.loading(label);
    try {
      const { transaction, receipt } = await action();
      if (receipt?.reverted) throw new Error("Transaction reverted");
      await transaction?.wait();
      toast.dismiss(loadingToast);
      toast.success(success);
      setSheet(null);
      await load();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const deposit = async () => {
    const user = requireWallet();
    if (!user || !provider) return;
    const amount = toBaseUnits(depositAmount);
    if (amount === "0") {
      toast.error(`Enter a ${depositToken.toUpperCase()} amount`);
      return;
    }
    const koinAmount = depositToken === "koin" ? amount : "0";
    const vhpAmount = depositToken === "vhp" ? amount : "0";
    await submit("Submitting deposit…", "Deposit submitted", async () => {
      const koin = new Contract({ id: KOIN_CONTRACT_ID, signer, provider, abi: utils.tokenAbi });
      const vhp = new Contract({ id: VHP_CONTRACT_ID, signer, provider, abi: utils.tokenAbi });
      const { operation: approveBurn } = await koin.functions.approve({ owner: user, spender: POB_CONTRACT_ID, value: koinAmount }, { onlyOperation: true });
      const { operation: approveTransfer } = await vhp.functions.approve({ owner: user, spender: poolId, value: (BigInt(vhpAmount) + BigInt(koinAmount)).toString() }, { onlyOperation: true });
      const pool = new Contract({ id: poolId, signer, provider, abi: abiFogata2Pool });
      return pool.functions.stake({ account: user, koin_amount: koinAmount, vhp_amount: vhpAmount }, { previousOperations: [approveBurn, approveTransfer] });
    });
    setDepositAmount("");
  };

  const withdraw = async () => {
    const user = requireWallet();
    if (!user || !provider) return;
    const amount = toBaseUnits(withdrawAmount);
    if (amount === "0") {
      toast.error(`Enter a ${withdrawToken.toUpperCase()} amount`);
      return;
    }
    await submit("Submitting withdrawal…", "Withdrawal submitted", () => {
      const pool = new Contract({ id: poolId, signer, provider, abi: abiFogata2Pool });
      return pool.functions.unstake({ account: user, koin_amount: withdrawToken === "koin" ? amount : "0", vhp_amount: withdrawToken === "vhp" ? amount : "0" });
    });
    setWithdrawAmount("");
  };

  const savePreferences = async () => {
    const user = requireWallet();
    if (!user || !provider) return;
    let percentage_koin = "0";
    let all_after_virtual = "0";
    if (rewardMode === "percentage") {
      const pct = parseFloat(percentageKoin);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        toast.error("Percentage must be between 0 and 100");
        return;
      }
      percentage_koin = String(Math.round(pct * 1000));
    } else {
      all_after_virtual = toBaseUnits(allAfterVirtual);
      if (all_after_virtual === "0") {
        toast.error("Enter a VHP amount to keep");
        return;
      }
    }
    await submit("Saving…", "Reward settings saved", () => {
      const pool = new Contract({ id: poolId, signer, provider, abi: abiFogata2Pool });
      return pool.functions.set_collect_koin_preferences({ account: user, percentage_koin, all_after_virtual });
    });
  };

  const openDeposit = () => {
    setDepositAmount("");
    setDepositToken(wallet && BigInt(wallet.vhp) > BigInt(wallet.koin) ? "vhp" : "koin");
    setSheet("deposit");
  };

  const healthWord = health === "producing" ? "Producing" : health === "late" ? "Producing slowly" : "Paused";
  const name = params?.name || "Unnamed pool";

  return (
    <Page>
      <Crumb back="Fogata" backHref="/fogata" right={<Link href="/fogata/help#choose-a-pool-and-read-its-page">Pool guide ›</Link>} />

      {loading && <Skeleton lines={2} />}
      {!loading && error && (
        <>
          <Title>Could not load</Title>
          <Lede>
            This pool did not answer.{" "}
            <button type="button" className="ks-link" onClick={() => load()}>
              Retry
            </button>
          </Lede>
          <p className="ks-status">
            <Mono>{poolId}</Mono>
          </p>
        </>
      )}

      {!loading && !error && params && (
        <>
          <section className="ks-who" aria-label="Pool">
            <PoolMark poolId={poolId} name={params.name} image={params.image} large />
            <div style={{ minWidth: 0 }}>
              <Title>{name}</Title>
              <p className="ks-status" style={{ marginTop: 8 }}>
                <Dot tone={health === "producing" ? "ok" : health} />
                <span>
                  {healthWord}
                  {performance.lastBlockTime && <> · last block {ago(performance.lastBlockTime)}</>}
                </span>
              </p>
            </div>
          </section>

          <Section className="ks-big" label={account && hasStake ? "Your stake" : "Yield"}>
            {account && hasStake ? (
              <>
                <H2>Your stake</H2>
                <div className="ks-n">
                  {fmtRaw(staked!, 8, 2)}
                  <small>VHP</small>
                </div>
                {earnings && apy !== null && (
                  <p className="ks-est">
                    <b>About {formatKoinEstimate(earnings.yearly / 365)} KOIN a day</b>, {formatKoinEstimate(earnings.yearly)} a year at {apy.toFixed(1)}%.
                  </p>
                )}
                <p className="ks-meta">
                  {balance && BigInt(balance.koin_amount) > BigInt(0) && <>Includes {fmtRaw(balance.koin_amount, 8, 2)} KOIN being converted · </>}
                  {nextPayment && <>Next payout {until(nextPayment)} · </>}
                  rewards {rewardsText ?? "—"} ·{" "}
                  <button type="button" onClick={() => setSheet("rewards")}>
                    change
                  </button>
                </p>
                <div className="ks-actions">
                  <button type="button" className="ks-btn" onClick={openDeposit}>
                    Deposit
                  </button>
                  <button
                    type="button"
                    className="ks-btn ghost"
                    onClick={() => {
                      setWithdrawAmount("");
                      setSheet("withdraw");
                    }}
                  >
                    Withdraw
                  </button>
                </div>
              </>
            ) : (
              <>
                <H2>Yield</H2>
                <div className="ks-n">
                  {apy !== null ? apy.toFixed(1) : "—"}
                  <small>% a year</small>
                </div>
                <p className="ks-est">After the pool&apos;s {fee}% fee. It moves with how much VHP the whole network is staking.</p>
                {account && <p className="ks-meta">You have nothing staked here.</p>}
                <div className="ks-actions">
                  {account ? (
                    <button type="button" className="ks-btn" onClick={openDeposit}>
                      Deposit
                    </button>
                  ) : (
                    <ConnectButton />
                  )}
                </div>
              </>
            )}
            {account && balanceError && <p className="ks-foot">Couldn&apos;t load your balance in this pool.</p>}
          </Section>

          {params.description && (
            <Section className="ks-about" label="About">
              <H2>About this pool</H2>
              <p>{params.description}</p>
            </Section>
          )}

          <Section label="Details">
            <Lines>
              <KV k="Staked">
                {performance.vhpAmount !== undefined ? `${fmt(performance.vhpAmount)} VHP` : "—"}
                {share !== null && <span> · {share.toFixed(1)}% of the network</span>}
              </KV>
              <KV k="Blocks">
                {performance.blocksLastDay !== undefined ? `${performance.blocksLastDay}${performance.sampleSize === 30 && performance.blocksLastDay === 30 ? "+" : ""} in the last day` : "—"}
                {performance.expectedTimeToProduce !== undefined && <span> · about one every {duration(performance.expectedTimeToProduce)}</span>}
              </KV>
              <KV k="Payout">
                {payout}
                {nextPayment && <span> · next {until(nextPayment)}</span>}
              </KV>
              <KV k="Fee">
                {fee}% <span>· to the operator</span>
              </KV>
              <KV k="Last block">
                {performance.lastBlockHeight !== undefined ? <Link href={`/blocks/${performance.lastBlockHeight}`}>{fmt(performance.lastBlockHeight)}</Link> : "—"}
                {performance.lastBlockTime && <span> · {ago(performance.lastBlockTime)}</span>}
              </KV>
            </Lines>
          </Section>

          <Advanced>
            <KV k="Pool address">
              <Link href={`/address/${poolId}`}>
                <Mono>{poolId}</Mono>
              </Link>{" "}
              <CopyButton value={poolId} what="Address" />
            </KV>
            <KV k="Contract">
              <Link href={`/contracts/${poolId}`}>Fogata Pool v2</Link>
            </KV>
            <KV k="Owner">{owner ? <Link href={`/address/${owner}`}>{short(owner)}</Link> : "—"}</KV>
            <KV k="Effectiveness">
              {performance.effectiveness !== undefined ? `${performance.effectiveness.toFixed(0)}%` : "—"} <span className="text-sub">of expected blocks</span>
            </KV>
            <KV k="Block time">
              {duration(performance.averageTimeToProduce)} <span className="text-sub">expected {duration(performance.expectedTimeToProduce)}</span>
            </KV>
            <KV k="KOIN balance">{performance.koinAmount !== undefined ? `${fmt(performance.koinAmount, 2)} KOIN` : "—"}</KV>
            <KV k="Reserved KOIN">
              {reservedKoin !== null ? `${compact(rawToNumber(reservedKoin))} KOIN` : "—"} <span className="text-sub">kept for mana, not paid out</span>
            </KV>
            <KV k="Mana">{performance.manaPercentage !== undefined ? `${performance.manaPercentage.toFixed(0)}%` : "—"}</KV>
            <p className="ks-foot">Withdrawals use the pool&apos;s mana. If mana is low a withdrawal can fail; it recovers over time, so try again later.</p>
            {isOwner && (
              <button type="button" className="ks-btn ghost md" style={{ marginTop: 14 }} onClick={() => setSheet("manage")}>
                Manage this pool
              </button>
            )}
          </Advanced>

          <Sheet open={sheet === "deposit"} onOpenChange={(open) => !open && !submitting && setSheet(null)} title={`Deposit to ${name}`} subtitle={<Link href="/fogata/help#deposit-koin-or-vhp" className="ks-guide">Read the deposit guide</Link>}>
            <div style={{ marginTop: 22 }}>
              <Segmented
                options={[
                  { value: "koin", label: "KOIN" },
                  { value: "vhp", label: "VHP" },
                ]}
                value={depositToken}
                onChange={(token) => {
                  setDepositToken(token);
                  setDepositAmount("");
                }}
                disabled={submitting}
              />
            </div>
            <div style={{ marginTop: 18 }}>
              <AmountInput
                id="deposit-amount"
                value={depositAmount}
                onChange={(value) => setDepositAmount(sanitizeDecimalInput(value))}
                unit={depositToken.toUpperCase()}
                onMax={() => wallet && setDepositAmount(formatAmountForInput(depositToken === "koin" ? wallet.koin : wallet.vhp))}
                maxDisabled={!wallet}
                disabled={submitting}
                autoFocus
              />
            </div>
            <div className="flex justify-between text-[13px] text-sub" style={{ marginTop: 10 }}>
              <span>
                Wallet {wallet ? fmtRaw(depositToken === "koin" ? wallet.koin : wallet.vhp, 8, 2) : "—"} {depositToken.toUpperCase()}
              </span>
              <span>{depositEstimate ? `≈ ${formatKoinEstimate(depositEstimate.yearly)} KOIN a year` : apy !== null ? `≈ ${apy.toFixed(1)}% yearly` : ""}</span>
            </div>
            {depositToken === "koin" && (
              <p className="ks-foot" style={{ marginTop: 14 }}>
                Your KOIN is staked as VHP to produce blocks. {payout !== "—" ? payout : "Each payout"} the pool pays your share in small KOIN payments, or stakes it again, depending on your reward setting. To get out faster, sell VHP on{" "}
                <Link href="/fogata/trade" className="ks-link">
                  Trade
                </Link>
                .
              </p>
            )}
            <button type="button" className="ks-btn wide" style={{ marginTop: 18 }} onClick={deposit} disabled={!account || submitting || !(Number(depositAmount) > 0)}>
              {submitting ? "Submitting…" : `Deposit ${depositAmount || "0"} ${depositToken.toUpperCase()}`}
            </button>
          </Sheet>

          <Sheet open={sheet === "withdraw"} onOpenChange={(open) => !open && !submitting && setSheet(null)} title={`Withdraw from ${name}`} subtitle={<Link href="/fogata/help#withdraw-or-leave-a-pool" className="ks-guide">Read the withdrawal guide</Link>}>
            <div style={{ marginTop: 22 }}>
              <Segmented
                options={[
                  { value: "vhp", label: "VHP" },
                  { value: "koin", label: "KOIN" },
                ]}
                value={withdrawToken}
                onChange={(token) => {
                  setWithdrawToken(token);
                  setWithdrawAmount("");
                }}
                disabled={submitting}
              />
            </div>
            <div style={{ marginTop: 18 }}>
              <AmountInput
                id="withdraw-amount"
                value={withdrawAmount}
                onChange={(value) => setWithdrawAmount(sanitizeDecimalInput(value))}
                unit={withdrawToken.toUpperCase()}
                onMax={() => balance && setWithdrawAmount(formatAmountForInput(withdrawToken === "koin" ? balance.koin_amount : balance.vhp_amount))}
                maxDisabled={!balance}
                disabled={submitting}
                autoFocus
              />
            </div>
            <p className="text-[13px] text-sub" style={{ marginTop: 10 }}>
              In pool {balance ? fmtRaw(withdrawToken === "koin" ? balance.koin_amount : balance.vhp_amount, 8, 4) : "—"} {withdrawToken.toUpperCase()}
            </p>
            <button type="button" className="ks-btn wide" style={{ marginTop: 18 }} onClick={withdraw} disabled={!account || submitting || !(Number(withdrawAmount) > 0)}>
              {submitting ? "Submitting…" : `Withdraw ${withdrawAmount || "0"} ${withdrawToken.toUpperCase()}`}
            </button>
          </Sheet>

          <Sheet open={sheet === "rewards"} onOpenChange={(open) => !open && !submitting && setSheet(null)} title="Reward settings" subtitle={<Link href="/fogata/help#choose-your-reward-settings" className="ks-guide">Reward settings guide</Link>}>
            <p className="ks-foot" style={{ marginTop: 10 }}>
              Rewards are paid in KOIN. Choose what the pool does with them.
            </p>
            <div style={{ marginTop: 16 }}>
              <label className="ks-radio">
                <input type="radio" name="reward-mode" checked={rewardMode === "percentage"} onChange={() => setRewardMode("percentage")} disabled={!account || submitting} />
                <span style={{ flex: 1 }}>
                  <span className="ks-rt">Take a share as KOIN</span>
                  <span className="ks-rd">This share of your KOIN allocation is paid out; the rest is staked again as VHP.</span>
                  {rewardMode === "percentage" && (
                    <span style={{ display: "block", marginTop: 10 }}>
                      <AmountInput id="percentage-koin" value={percentageKoin} onChange={(v) => setPercentageKoin(sanitizeDecimalInput(v))} unit="%" disabled={!account || submitting} />
                    </span>
                  )}
                </span>
              </label>
              <label className="ks-radio">
                <input type="radio" name="reward-mode" checked={rewardMode === "virtual"} onChange={() => setRewardMode("virtual")} disabled={!account || submitting} />
                <span style={{ flex: 1 }}>
                  <span className="ks-rt">Keep a VHP amount, take the rest as KOIN</span>
                  <span className="ks-rd">Hold this much VHP in the pool and take anything above it as KOIN, as the pool&apos;s KOIN allows.</span>
                  {rewardMode === "virtual" && (
                    <span style={{ display: "block", marginTop: 10 }}>
                      <AmountInput id="all-after-virtual" value={allAfterVirtual} onChange={(v) => setAllAfterVirtual(sanitizeDecimalInput(v))} unit="VHP" disabled={!account || submitting} />
                    </span>
                  )}
                </span>
              </label>
            </div>
            <button type="button" className="ks-btn wide" style={{ marginTop: 18 }} onClick={savePreferences} disabled={!account || submitting}>
              {submitting ? "Saving…" : "Save"}
            </button>
          </Sheet>

          {isOwner && sheet === "manage" && (
            <ManagePoolSheet
              open
              onOpenChange={(open) => !open && setSheet(null)}
              poolId={poolId}
              poolOwner={owner}
              initial={{ name: params.name ?? "", image: params.image ?? "", description: params.description ?? "", beneficiaries: params.beneficiaries ?? [], paymentPeriod: params.payment_period }}
              reservedKoin={reservedKoin}
              registeredPublicKey={publicKey}
              onChanged={load}
            />
          )}
        </>
      )}
    </Page>
  );
}
