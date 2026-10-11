"use client";

import { Contract, Multicall, type ProviderInterface, utils } from "koilib";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/chrome/Sheet";
import { ConnectButton } from "@/components/chrome/WalletSheet";
import { AmountInput, Segmented } from "@/components/ks/Controls";
import { Crumb, Empty, H2, Lede, Page, RowSkeleton, Section, Title } from "@/components/ks/Page";
import { Row } from "@/components/ks/Row";
import { useWallet } from "@/contexts/WalletContext";
import { useLatestLoader } from "@/hooks/useLatestLoader";
import tokenAbi from "@/koinos/abi";
import { abiDexKoinVhp } from "@/koinos/abis/dexKoinVhp";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import { FOGATA2_LIST_POOLS_CONTRACT_ID, KOIN_CONTRACT_ID, KOIN_VHP_DEX_CONTRACT_ID, VHP_CONTRACT_ID } from "@/koinos/constants";
import { amountAtPrice, findMatchingOrder, formatAmountForInput, multicallValue, sanitizeDecimalInput, suggestPrice } from "@/lib/fogata";
import { fmtRaw } from "@/lib/format";
import { createRpcReadQueue } from "@/lib/rpcReadQueue";
import * as toast from "@/lib/toast";

const DECIMALS = 8;
const TIERS = Array.from({ length: 17 }, (_, index) => index + 1);
// A single 17-tier call exceeds the chain's compute-bandwidth limit.
const TIERS_PER_MULTICALL = 4;
const queueRpcRead = createRpcReadQueue({ intervalMs: 250, retries: 3, retryDelayMs: 750, timeoutMs: 10_000 });

interface DexOrder {
  id: string;
  buy: boolean;
  owner: string;
  pool: string;
  koin_amount: string;
  vhp_amount: string;
  tier: number;
}
interface MiningPool {
  account: string;
  name: string;
}
interface OrdersResult {
  orders?: Omit<DexOrder, "tier">[];
}

function parseAmount(value: string): string | null {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{0,8})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const amount = BigInt(whole) * BigInt(10) ** BigInt(DECIMALS) + BigInt(fraction.padEnd(DECIMALS, "0") || "0");
  return amount > BigInt(0) ? amount.toString() : null;
}

function price(order: DexOrder): string {
  const vhp = Number(order.vhp_amount);
  if (!vhp) return "—";
  return (Number(order.koin_amount) / vhp).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

async function fetchOrders(provider: ProviderInterface, buy: boolean): Promise<DexOrder[]> {
  const dex = new Contract({ id: KOIN_VHP_DEX_CONTRACT_ID, provider, abi: abiDexKoinVhp });
  const orders: DexOrder[] = [];
  for (let offset = 0; offset < TIERS.length; offset += TIERS_PER_MULTICALL) {
    const batch = TIERS.slice(offset, offset + TIERS_PER_MULTICALL);
    const multicall = new Multicall({ provider, contracts: [dex] });
    for (const tier of batch) await multicall.add(dex.functions.get_orders, { start: "", limit: 20, descending: false, buy, tier });
    const results = (await queueRpcRead(() => multicall.call())) as OrdersResult[];
    results.forEach((result, index) => {
      for (const order of result?.orders ?? []) orders.push({ ...order, buy, tier: batch[index] });
    });
  }
  return orders.sort((a, b) => {
    const d = Number(a.koin_amount) / Number(a.vhp_amount) - Number(b.koin_amount) / Number(b.vhp_amount);
    return buy ? -d : d;
  });
}

async function fetchOrdersByOwner(provider: ProviderInterface, owner: string): Promise<DexOrder[]> {
  const dex = new Contract({ id: KOIN_VHP_DEX_CONTRACT_ID, provider, abi: abiDexKoinVhp });
  const { result } = await queueRpcRead(() => dex.functions.get_orders_by_owner({ owner, start: "", limit: 100, descending: false }));
  return ((result as OrdersResult | undefined)?.orders ?? []).map((order) => ({ ...order, buy: Boolean(order.buy), tier: Math.min((order.vhp_amount || "0").length, 17) }));
}

async function fetchMiningPools(provider: ProviderInterface): Promise<MiningPool[]> {
  const list = new Contract({ id: FOGATA2_LIST_POOLS_CONTRACT_ID, provider, abi: abiFogata2ListPools });
  const { result } = await queueRpcRead(() => list.functions.get_pools({ start: "", limit: 100, direction: 0 }));
  const listed = (result?.value ?? []) as { account: string }[];
  if (!listed.length) return [];
  const multicall = new Multicall({ provider, contracts: listed.map((p) => new Contract({ id: p.account, provider, abi: abiFogata2Pool })) });
  for (const contract of multicall.contracts) await multicall.add(contract.functions.get_pool_params, {});
  const params = await queueRpcRead(() => multicall.call());
  return listed.map((p, i) => ({ account: p.account, name: (params[i] as { name?: string } | undefined)?.name || "Unnamed pool" }));
}

async function fetchWalletBalances(provider: ProviderInterface, owner: string): Promise<{ koin: string; vhp: string }> {
  const koin = new Contract({ id: KOIN_CONTRACT_ID, provider, abi: tokenAbi });
  const vhp = new Contract({ id: VHP_CONTRACT_ID, provider, abi: tokenAbi });
  const multicall = new Multicall({ provider, contracts: [koin, vhp] });
  await multicall.add(koin.functions.balanceOf, { owner });
  await multicall.add(vhp.functions.balanceOf, { owner });
  const results = await queueRpcRead(() => multicall.call());
  const k = multicallValue(results[0]);
  const v = multicallValue(results[1]);
  if (k === undefined || v === undefined) throw new Error("Couldn't read wallet balances");
  return { koin: k, vhp: v };
}

async function fetchPoolVhp(provider: ProviderInterface, poolId: string, owner: string): Promise<string> {
  const pool = new Contract({ id: poolId, provider, abi: abiFogata2Pool });
  const { result } = await queueRpcRead(() => pool.functions.balance_of({ value: owner }));
  return result?.vhp_amount ?? "0";
}

export default function TradePage() {
  const { provider, signer, savedAddress } = useWallet();
  const account = signer?.getAddress() ?? savedAddress ?? null;

  const [sellOrders, setSellOrders] = useState<DexOrder[]>([]);
  const [buyOrders, setBuyOrders] = useState<DexOrder[]>([]);
  const [myOrders, setMyOrders] = useState<DexOrder[]>([]);
  const [pools, setPools] = useState<MiningPool[]>([]);
  const [wallet, setWallet] = useState<{ koin: string; vhp: string } | null>(null);
  const [poolVhp, setPoolVhp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const [side, setSide] = useState<"buy" | "sell">("sell");
  const [koinInput, setKoinInput] = useState("");
  const [vhpInput, setVhpInput] = useState("");
  const [pool, setPool] = useState("");
  const [selected, setSelected] = useState<DexOrder | null>(null);
  const [fillAmount, setFillAmount] = useState("");

  const suggestion = useMemo(() => suggestPrice(side, buyOrders, sellOrders, account), [side, buyOrders, sellOrders, account]);
  const getInput = side === "sell" ? koinInput : vhpInput;
  const suggestedGet = getInput === "" && suggestion ? amountAtPrice(side, side === "sell" ? vhpInput : koinInput, suggestion.price) : "";
  const usingSuggestion = suggestedGet !== "";
  const koinAmount = side === "sell" && usingSuggestion ? suggestedGet : koinInput;
  const vhpAmount = side === "buy" && usingSuggestion ? suggestedGet : vhpInput;
  const implied = useMemo(() => {
    const k = Number(koinAmount);
    const v = Number(vhpAmount);
    return Number.isFinite(k) && Number.isFinite(v) && k > 0 && v > 0 ? (k / v).toLocaleString("en-US", { maximumFractionDigits: 6 }) : null;
  }, [koinAmount, vhpAmount]);
  const matching = useMemo(() => findMatchingOrder(side, vhpAmount, koinAmount, side === "sell" ? buyOrders : sellOrders, account), [side, vhpAmount, koinAmount, buyOrders, sellOrders, account]);
  const available = side === "buy" ? (wallet?.koin ?? null) : pool ? poolVhp : (wallet?.vhp ?? null);
  const paySymbol = side === "sell" ? "VHP" : "KOIN";
  const getSymbol = side === "sell" ? "KOIN" : "VHP";

  const ordersScope = useMemo(() => ({ provider, account }), [provider, account]);
  const balancesScope = useMemo(() => ({ provider, account, pool }), [provider, account, pool]);
  const poolsScope = useMemo(() => ({ provider }), [provider]);
  const runOrders = useLatestLoader(ordersScope);
  const runBalances = useLatestLoader(balancesScope);
  const runPools = useLatestLoader(poolsScope);

  const loadOrders = useCallback(
    () =>
      runOrders(
        async () => {
          if (!provider) return { sells: [], buys: [], owned: [] };
          const [sells, buys, owned] = await Promise.all([fetchOrders(provider, false), fetchOrders(provider, true), account ? fetchOrdersByOwner(provider, account) : Promise.resolve([])]);
          return { sells, buys, owned };
        },
        {
          onStart: () => {
            setLoading(Boolean(provider));
            setError(false);
          },
          onSuccess: ({ sells, buys, owned }) => {
            setSellOrders(sells);
            setBuyOrders(buys);
            setMyOrders(owned);
          },
          onError: (err) => {
            console.error("[trade] orders:", err);
            setError(true);
          },
          onFinally: () => setLoading(false),
        },
      ),
    [provider, account, runOrders],
  );

  const loadBalances = useCallback(
    () =>
      runBalances(
        async () => {
          if (!provider || !account) return { wallet: null, staked: null };
          const [w, staked] = await Promise.all([fetchWalletBalances(provider, account), pool ? fetchPoolVhp(provider, pool, account) : Promise.resolve(null)]);
          return { wallet: w, staked };
        },
        {
          onStart: () => setBalancesLoading(Boolean(provider && account)),
          onSuccess: ({ wallet: w, staked }) => {
            setWallet(w);
            setPoolVhp(staked);
          },
          onError: (err) => {
            console.error("[trade] balances:", err);
            setWallet(null);
            setPoolVhp(null);
          },
          onFinally: () => setBalancesLoading(false),
        },
      ),
    [provider, account, pool, runBalances],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);
  useEffect(() => {
    void loadBalances();
  }, [loadBalances]);
  useEffect(() => {
    runPools(() => (provider ? fetchMiningPools(provider) : Promise.resolve([])), {
      onSuccess: setPools,
      onError: (err) => console.info("[trade] pools:", err),
    });
  }, [provider, runPools]);

  const run = async (label: string, success: string, action: () => Promise<{ transaction?: { wait: () => Promise<unknown> }; receipt?: { reverted?: boolean } }>) => {
    setSubmitting(true);
    const id = toast.loading(label);
    try {
      const { transaction, receipt } = await action();
      if (receipt?.reverted) throw new Error("Transaction reverted");
      await transaction?.wait();
      toast.dismiss(id);
      toast.success(success);
      await Promise.all([loadOrders(), loadBalances()]);
      return true;
    } catch (err) {
      toast.dismiss(id);
      toast.error(err instanceof Error ? err.message : `${success} failed`);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const place = async () => {
    if (!account || !signer || !provider) {
      toast.error("Connect your wallet to continue");
      return;
    }
    const koinRaw = parseAmount(koinAmount);
    const vhpRaw = parseAmount(vhpAmount);
    if (!koinRaw || !vhpRaw) {
      toast.error("Enter valid KOIN and VHP amounts (up to 8 decimals)");
      return;
    }
    if (BigInt(koinRaw) > BigInt(vhpRaw)) {
      toast.error("KOIN amount cannot be greater than VHP amount");
      return;
    }
    if (vhpRaw.length > 17) {
      toast.error("The VHP amount is above the supported range");
      return;
    }
    const offered = side === "buy" ? koinRaw : vhpRaw;
    if (available !== null && BigInt(offered) > BigInt(available)) {
      toast.error(`Not enough ${paySymbol}. Available: ${fmtRaw(available, 8, 4)}`);
      return;
    }
    const ok = await run("Placing order…", "Order placed", async () => {
      const previousOperations = [];
      if (side === "sell" && pool.trim()) {
        const poolContract = new Contract({ id: pool.trim(), provider, abi: abiFogata2Pool });
        const { operation } = await poolContract.functions.set_allow_dex_to_unstake({ account, allow_dex_to_unstake: true }, { onlyOperation: true });
        if (operation) previousOperations.push(operation);
      } else {
        const token = new Contract({ id: side === "buy" ? KOIN_CONTRACT_ID : VHP_CONTRACT_ID, signer, provider, abi: utils.tokenAbi });
        const { operation } = await token.functions.approve({ owner: account, spender: KOIN_VHP_DEX_CONTRACT_ID, value: offered }, { onlyOperation: true });
        if (operation) previousOperations.push(operation);
      }
      const dex = new Contract({ id: KOIN_VHP_DEX_CONTRACT_ID, signer, provider, abi: abiDexKoinVhp });
      return dex.functions.set_order({ id: "", buy: side === "buy", owner: account, pool: side === "sell" ? pool.trim() : "", koin_amount: koinRaw, vhp_amount: vhpRaw }, { previousOperations });
    });
    if (ok) {
      setKoinInput("");
      setVhpInput("");
      setPool("");
    }
  };

  const fill = async () => {
    if (!selected || !account || !signer || !provider) return;
    if (selected.owner === account) {
      toast.error("You cannot fill your own order");
      setSelected(null);
      return;
    }
    const amount = parseAmount(fillAmount);
    const maximum = selected.buy ? selected.vhp_amount : selected.koin_amount;
    if (!amount || BigInt(amount) > BigInt(maximum)) {
      toast.error(`Enter an amount up to ${fmtRaw(maximum, 8, 8)}`);
      return;
    }
    const ok = await run("Filling order…", "Order filled", async () => {
      const token = new Contract({ id: selected.buy ? VHP_CONTRACT_ID : KOIN_CONTRACT_ID, signer, provider, abi: utils.tokenAbi });
      const { operation } = await token.functions.approve({ owner: account, spender: KOIN_VHP_DEX_CONTRACT_ID, value: amount }, { onlyOperation: true });
      const dex = new Contract({ id: KOIN_VHP_DEX_CONTRACT_ID, signer, provider, abi: abiDexKoinVhp });
      return dex.functions.fill_order({ id: selected.id, account, amount }, { previousOperations: operation ? [operation] : [] });
    });
    if (ok) setSelected(null);
  };

  const cancel = async (order: DexOrder) => {
    if (!signer || !provider) return;
    await run("Cancelling order…", "Order cancelled", () => {
      const dex = new Contract({ id: KOIN_VHP_DEX_CONTRACT_ID, signer, provider, abi: abiDexKoinVhp });
      return dex.functions.cancel_order({ id: order.id });
    });
  };

  const poolName = (address: string) => pools.find((p) => p.account === address)?.name || address;
  const book = side === "sell" ? sellOrders : buyOrders;
  const mine = myOrders.filter((o) => o.buy === (side === "buy"));
  const rows = [...mine, ...book.filter((o) => o.owner !== account)];

  return (
    <Page>
      <Crumb back="Fogata" backHref="/fogata" right={<Link href="/fogata/help#trade-koin-and-vhp">Trading guide ›</Link>} />
      <Title>Trade</Title>
      <Lede>Sell VHP for KOIN, or buy VHP. An order waits for a taker; pools fill orders here before they burn any KOIN.</Lede>

      <Section label="Order">
        <Segmented
          options={[
            { value: "sell", label: "Sell VHP" },
            { value: "buy", label: "Buy VHP" },
          ]}
          value={side}
          onChange={(next) => {
            setSide(next);
            if (next === "buy") setPool("");
          }}
          disabled={submitting}
        />
        <label className="ks-field-label" htmlFor="trade-pay">
          {side === "sell" ? "You sell" : "You pay"}
        </label>
        <AmountInput
          id="trade-pay"
          value={side === "sell" ? vhpAmount : koinAmount}
          onChange={(v) => (side === "sell" ? setVhpInput(sanitizeDecimalInput(v)) : setKoinInput(sanitizeDecimalInput(v)))}
          unit={paySymbol}
          onMax={account ? () => available && (side === "sell" ? setVhpInput(formatAmountForInput(available)) : setKoinInput(formatAmountForInput(available))) : undefined}
          maxDisabled={!available || balancesLoading || BigInt(available || "0") <= BigInt(0)}
          disabled={submitting}
        />
        <label className="ks-field-label" htmlFor="trade-get">
          You get{usingSuggestion && suggestion ? ` · at the best open ${suggestion.source}` : ""}
        </label>
        <AmountInput id="trade-get" value={side === "sell" ? koinAmount : vhpAmount} onChange={(v) => (side === "sell" ? setKoinInput(sanitizeDecimalInput(v)) : setVhpInput(sanitizeDecimalInput(v)))} unit={getSymbol} disabled={submitting} />
        <div className="flex justify-between text-[13px] text-sub" style={{ marginTop: 10 }}>
          <span>{implied ? `${implied} KOIN per VHP` : ""}</span>
          <span>{account ? (balancesLoading ? "Loading balance…" : available !== null ? `${side === "sell" && pool ? "In pool" : "Wallet"} ${fmtRaw(available, 8, 4)} ${paySymbol}` : "") : ""}</span>
        </div>

        {side === "sell" && account && pools.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <label className="ks-field-label" htmlFor="trade-pool">
              Sell VHP from
            </label>
            <select id="trade-pool" className="ks-input" value={pool} onChange={(e) => setPool(e.target.value)} disabled={submitting}>
              <option value="">Your wallet</option>
              {pools.map((p) => (
                <option key={p.account} value={p.account}>
                  Your stake in {p.name}
                </option>
              ))}
            </select>
            <p className="ks-foot" style={{ marginTop: 6, fontSize: 12 }}>
              {pool ? "Sold straight from your stake. It keeps earning in the pool until the order fills." : "VHP in your wallet. You can also sell from your stake in a pool and keep earning until the order fills."}
            </p>
          </div>
        )}

        {matching && (
          <p className="ks-foot">
            An open order already matches:{" "}
            <button
              type="button"
              className="ks-link"
              disabled={!account || submitting}
              onClick={() => {
                setSelected(matching);
                setFillAmount(side === "sell" ? vhpAmount : koinAmount);
              }}
            >
              {matching.buy ? "sell" : "buy"} {fmtRaw(matching.vhp_amount, 8, 4)} VHP at {price(matching)} KOIN per VHP
            </button>
            .
          </p>
        )}

        <div className="ks-actions">
          {account ? (
            <button type="button" className="ks-btn" onClick={place} disabled={submitting}>
              {submitting ? "Submitting…" : "Place order"}
            </button>
          ) : (
            <ConnectButton />
          )}
        </div>
        <p className="ks-foot">Waits for a taker. Cancel any time.</p>
      </Section>

      <Section label="Open orders" className="ks-list">
        <H2 count={loading ? "…" : rows.length}>Open orders</H2>
        {loading && <RowSkeleton rows={3} />}
        {!loading && error && (
          <Empty>
            Orders could not be loaded.{" "}
            <button type="button" className="ks-link" onClick={() => loadOrders()}>
              Retry
            </button>
          </Empty>
        )}
        {!loading && !error && rows.length === 0 && <Empty>No open {side === "sell" ? "sell" : "buy"} orders.</Empty>}
        {rows.map((order) => {
          const isMine = order.owner === account;
          return (
            <Row
              key={order.id}
              title={`${isMine ? "You're " : ""}${isMine ? (order.buy ? "buying" : "selling") : order.buy ? "Buying" : "Selling"} ${fmtRaw(order.vhp_amount, 8, 4)} VHP`}
              detail={`at ${price(order)} KOIN per VHP${isMine && order.pool ? ` · from your stake in ${poolName(order.pool)}` : ""}`}
              right={
                isMine ? (
                  <button type="button" className="ks-btn ghost md" onClick={() => cancel(order)} disabled={submitting}>
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ks-btn ghost md"
                    onClick={() => {
                      setSelected(order);
                      setFillAmount(fmtRaw(order.buy ? order.vhp_amount : order.koin_amount, 8, 8).replace(/,/g, ""));
                    }}
                    disabled={!account || submitting}
                  >
                    Fill
                  </button>
                )
              }
              flat
            />
          );
        })}
      </Section>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && !submitting && setSelected(null)} title={`Fill ${selected?.buy ? "buy" : "sell"} order`}>
        {selected && (
          <>
            <p className="ks-foot" style={{ marginTop: 6 }}>
              {price(selected)} KOIN per VHP. You can fill part of it.
            </p>
            <label className="ks-field-label" htmlFor="trade-fill">
              You pay
            </label>
            <AmountInput id="trade-fill" value={fillAmount} onChange={(v) => setFillAmount(sanitizeDecimalInput(v))} unit={selected.buy ? "VHP" : "KOIN"} disabled={submitting} autoFocus />
            <p className="ks-foot">
              Up to {fmtRaw(selected.buy ? selected.vhp_amount : selected.koin_amount, 8, 8)} {selected.buy ? "VHP" : "KOIN"}
            </p>
            <button type="button" className="ks-btn wide" style={{ marginTop: 14 }} onClick={fill} disabled={submitting}>
              {submitting ? "Submitting…" : "Fill order"}
            </button>
          </>
        )}
      </Sheet>
    </Page>
  );
}
