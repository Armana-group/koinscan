"use client";

import { Contract, Multicall, ProviderInterface, utils } from "koilib";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WalletButton } from "@/components/WalletButton";
import { useWallet } from "@/contexts/WalletContext";
import tokenAbi from "@/koinos/abi";
import { abiDexKoinVhp } from "@/koinos/abis/dexKoinVhp";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import {
  FOGATA2_LIST_POOLS_CONTRACT_ID,
  KOIN_CONTRACT_ID,
  KOIN_VHP_DEX_CONTRACT_ID,
  VHP_CONTRACT_ID,
} from "@/koinos/constants";
import { findMatchingOrder } from "@/lib/fogata";
import { cn } from "@/lib/utils";
import * as toast from "@/lib/toast";

const DECIMALS = 8;
const TIERS = Array.from({ length: 17 }, (_, index) => index + 1);
// A single 17-tier call exceeds the chain's compute-bandwidth limit.
const TIERS_PER_MULTICALL = 4;
const NO_POOL_VALUE = "__wallet__";

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

interface WalletBalances {
  koin: string;
  vhp: string;
}

interface PoolBalance {
  koin_amount: string;
  vhp_amount: string;
  vapor_amount: string;
}

interface OrdersResult {
  orders?: Omit<DexOrder, "tier">[];
}

function parseAmount(value: string): string | null {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{0,8})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  const amount = BigInt(whole) * BigInt(10) ** BigInt(DECIMALS)
    + BigInt(fraction.padEnd(DECIMALS, "0") || "0");
  return amount > BigInt(0) ? amount.toString() : null;
}

function formatAmount(raw: string, maximumFractionDigits = 8): string {
  const amount = BigInt(raw || "0");
  const scale = BigInt(100_000_000);
  const whole = amount / scale;
  const fraction = (amount % scale)
    .toString()
    .padStart(DECIMALS, "0")
    .slice(0, maximumFractionDigits)
    .replace(/0+$/, "");
  return `${whole.toLocaleString()}${fraction ? `.${fraction}` : ""}`;
}

function formatAmountForInput(raw: string): string {
  const amount = BigInt(raw || "0");
  const scale = BigInt(100_000_000);
  const whole = amount / scale;
  const fraction = (amount % scale)
    .toString()
    .padStart(DECIMALS, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function formatPrice(order: DexOrder): string {
  const vhp = Number(order.vhp_amount);
  if (!vhp) return "—";
  return (Number(order.koin_amount) / vhp).toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

async function fetchOrders(
  provider: ProviderInterface,
  buy: boolean
): Promise<DexOrder[]> {
  const dex = new Contract({
    id: KOIN_VHP_DEX_CONTRACT_ID,
    provider,
    abi: abiDexKoinVhp,
  });
  const orders: DexOrder[] = [];

  for (let offset = 0; offset < TIERS.length; offset += TIERS_PER_MULTICALL) {
    const tierBatch = TIERS.slice(offset, offset + TIERS_PER_MULTICALL);
    const multicall = new Multicall({ provider, contracts: [dex] });

    for (const tier of tierBatch) {
      await multicall.add(dex.functions.get_orders, {
        start: "",
        limit: 20,
        descending: false,
        buy,
        tier,
      });
    }

    const results = (await multicall.call()) as OrdersResult[];
    results.forEach((result, index) => {
      const tier = tierBatch[index];
      for (const order of result?.orders ?? []) {
        orders.push({ ...order, buy, tier });
      }
    });
  }

  return orders.sort((a, b) => {
    const difference =
      Number(a.koin_amount) / Number(a.vhp_amount)
      - Number(b.koin_amount) / Number(b.vhp_amount);
    return buy ? -difference : difference;
  });
}

async function fetchOrdersByOwner(
  provider: ProviderInterface,
  owner: string
): Promise<DexOrder[]> {
  const dex = new Contract({
    id: KOIN_VHP_DEX_CONTRACT_ID,
    provider,
    abi: abiDexKoinVhp,
  });
  const { result } = await dex.functions.get_orders_by_owner({
    owner,
    start: "",
    limit: 100,
    descending: false,
  });
  const orders = ((result as OrdersResult | undefined)?.orders ?? []).map(
    (order) => ({
      ...order,
      buy: Boolean(order.buy),
      tier: Math.min((order.vhp_amount || "0").length, 17),
    })
  );

  return orders.sort((a, b) => {
    if (a.buy !== b.buy) return a.buy ? -1 : 1;
    const difference =
      Number(a.koin_amount) / Number(a.vhp_amount)
      - Number(b.koin_amount) / Number(b.vhp_amount);
    return a.buy ? -difference : difference;
  });
}

async function fetchMiningPools(
  provider: ProviderInterface
): Promise<MiningPool[]> {
  const listPoolsContract = new Contract({
    id: FOGATA2_LIST_POOLS_CONTRACT_ID,
    provider,
    abi: abiFogata2ListPools,
  });
  const { result: listPoolsResult } = await listPoolsContract.functions.get_pools({
    start: "",
    limit: 100,
    direction: 0,
  });
  const listedPools = (listPoolsResult?.value ?? []) as { account: string }[];
  if (listedPools.length === 0) return [];

  const multicall = new Multicall({
    provider,
    contracts: listedPools.map(
      (listedPool) =>
        new Contract({
          id: listedPool.account,
          provider,
          abi: abiFogata2Pool,
        })
    ),
  });
  for (const contract of multicall.contracts) {
    await multicall.add(contract.functions.get_pool_params, {});
  }
  const poolParams = await multicall.call();
  return listedPools.map((listedPool, index) => ({
    account: listedPool.account,
    name:
      (poolParams[index] as { name?: string } | undefined)?.name
      || "Unnamed Pool",
  }));
}

async function fetchWalletBalances(
  provider: ProviderInterface,
  owner: string
): Promise<WalletBalances> {
  const koinContract = new Contract({
    id: KOIN_CONTRACT_ID,
    provider,
    abi: tokenAbi,
  });
  const vhpContract = new Contract({
    id: VHP_CONTRACT_ID,
    provider,
    abi: tokenAbi,
  });

  const multicall = new Multicall({
    provider,
    contracts: [koinContract, vhpContract],
  });
  await multicall.add(koinContract.functions.balanceOf, { owner });
  await multicall.add(vhpContract.functions.balanceOf, { owner });
  const results = await multicall.call();
  const koinResult = results[0] as { value?: string } | undefined;
  const vhpResult = results[1] as { value?: string } | undefined;

  return {
    koin: koinResult?.value ?? "0",
    vhp: vhpResult?.value ?? "0",
  };
}

async function fetchPoolBalance(
  provider: ProviderInterface,
  poolId: string,
  owner: string
): Promise<PoolBalance> {
  const poolContract = new Contract({
    id: poolId,
    provider,
    abi: abiFogata2Pool,
  });
  const { result } = await poolContract.functions.balance_of({ value: owner });
  return {
    koin_amount: result?.koin_amount ?? "0",
    vhp_amount: result?.vhp_amount ?? "0",
    vapor_amount: result?.vapor_amount ?? "0",
  };
}

export default function DexPage() {
  const { provider, signer, savedAddress } = useWallet();
  const account = signer?.getAddress() ?? savedAddress ?? null;

  const [sellOrders, setSellOrders] = useState<DexOrder[]>([]);
  const [buyOrders, setBuyOrders] = useState<DexOrder[]>([]);
  const [myOrders, setMyOrders] = useState<DexOrder[]>([]);
  const [pools, setPools] = useState<MiningPool[]>([]);
  const [walletBalances, setWalletBalances] = useState<WalletBalances | null>(
    null
  );
  const [poolBalance, setPoolBalance] = useState<PoolBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [poolsLoading, setPoolsLoading] = useState(false);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [side, setSide] = useState<"buy" | "sell">("sell");
  const [koinAmount, setKoinAmount] = useState("");
  const [vhpAmount, setVhpAmount] = useState("");
  const [pool, setPool] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<DexOrder | null>(null);
  const [fillAmount, setFillAmount] = useState("");

  const impliedPrice = useMemo(() => {
    const koin = Number(koinAmount);
    const vhp = Number(vhpAmount);
    if (!Number.isFinite(koin) || !Number.isFinite(vhp) || koin <= 0 || vhp <= 0) {
      return null;
    }
    return (koin / vhp).toLocaleString(undefined, { maximumFractionDigits: 8 });
  }, [koinAmount, vhpAmount]);

  const matchingOrder = useMemo(
    () =>
      findMatchingOrder(
        side,
        vhpAmount,
        koinAmount,
        side === "sell" ? buyOrders : sellOrders,
        account
      ),
    [side, vhpAmount, koinAmount, buyOrders, sellOrders, account]
  );

  const availablePayBalance = useMemo(() => {
    if (side === "buy") return walletBalances?.koin ?? null;
    if (pool) return poolBalance?.vhp_amount ?? null;
    return walletBalances?.vhp ?? null;
  }, [side, pool, walletBalances, poolBalance]);

  const availablePaySymbol = side === "buy" ? "KOIN" : "VHP";

  const loadOrders = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    setError(null);
    try {
      const [sells, buys, owned] = await Promise.all([
        fetchOrders(provider, false),
        fetchOrders(provider, true),
        account ? fetchOrdersByOwner(provider, account) : Promise.resolve([]),
      ]);
      setSellOrders(sells);
      setBuyOrders(buys);
      setMyOrders(owned);
    } catch (err) {
      console.error("Failed to load DEX orders:", err);
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [provider, account]);

  const loadBalances = useCallback(async () => {
    if (!provider || !account) {
      setWalletBalances(null);
      setPoolBalance(null);
      return;
    }

    setBalancesLoading(true);
    try {
      const [wallet, staked] = await Promise.all([
        fetchWalletBalances(provider, account),
        pool
          ? fetchPoolBalance(provider, pool, account)
          : Promise.resolve(null),
      ]);
      setWalletBalances(wallet);
      setPoolBalance(staked);
    } catch (err) {
      console.error("Failed to load balances:", err);
      setWalletBalances(null);
      setPoolBalance(null);
    } finally {
      setBalancesLoading(false);
    }
  }, [provider, account, pool]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const loadPools = async () => {
      if (!provider) return;
      setPoolsLoading(true);
      try {
        setPools(await fetchMiningPools(provider));
      } catch (err) {
        console.error("Failed to load mining pools:", err);
        setPools([]);
      } finally {
        setPoolsLoading(false);
      }
    };
    loadPools();
  }, [provider]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const requireWallet = () => {
    if (!account || !signer || !provider) {
      toast.error("Connect your wallet to continue");
      return false;
    }
    return true;
  };

  const handleCreateOrder = async () => {
    if (!requireWallet() || !account || !signer || !provider) return;

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
      toast.error("The VHP amount exceeds the supported tier range");
      return;
    }

    const offeredRaw = side === "buy" ? koinRaw : vhpRaw;
    if (
      availablePayBalance !== null
      && BigInt(offeredRaw) > BigInt(availablePayBalance)
    ) {
      toast.error(
        `Insufficient ${availablePaySymbol} balance. Available: ${formatAmount(availablePayBalance)}`
      );
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Creating order...");
    try {
      const previousOperations = [];
      const usesPoolVhp = side === "sell" && pool.trim().length > 0;

      if (usesPoolVhp) {
        const poolContract = new Contract({
          id: pool.trim(),
          provider,
          abi: abiFogata2Pool,
        });
        const { operation } = await poolContract.functions.set_allow_dex_to_unstake({
          account,
          allow_dex_to_unstake: true,
        }, { onlyOperation: true });
        if (operation) previousOperations.push(operation);
      } else {
        const offeredToken = new Contract({
          id: side === "buy" ? KOIN_CONTRACT_ID : VHP_CONTRACT_ID,
          signer,
          provider,
          abi: utils.tokenAbi,
        });
        const offeredAmount = side === "buy" ? koinRaw : vhpRaw;
        const { operation } = await offeredToken.functions.approve(
          {
            owner: account,
            spender: KOIN_VHP_DEX_CONTRACT_ID,
            value: offeredAmount,
          },
          { onlyOperation: true }
        );
        if (operation) previousOperations.push(operation);
      }

      const dex = new Contract({
        id: KOIN_VHP_DEX_CONTRACT_ID,
        signer,
        provider,
        abi: abiDexKoinVhp,
      });
      const { transaction, receipt } = await dex.functions.set_order(
        {
          id: "",
          buy: side === "buy",
          owner: account,
          pool: side === "sell" ? pool.trim() : "",
          koin_amount: koinRaw,
          vhp_amount: vhpRaw,
        },
        { previousOperations }
      );
      if (receipt?.reverted) throw new Error("Transaction reverted");
      await transaction?.wait();

      toast.dismiss(toastId);
      toast.success("Order created");
      setKoinAmount("");
      setVhpAmount("");
      setPool("");
      await Promise.all([loadOrders(), loadBalances()]);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const openFillDialog = (order: DexOrder) => {
    setSelectedOrder(order);
    setFillAmount(
      formatAmount(order.buy ? order.vhp_amount : order.koin_amount)
    );
  };

  const handleFillOrder = async () => {
    if (
      !selectedOrder
      || !requireWallet()
      || !account
      || !signer
      || !provider
    ) return;
    if (selectedOrder.owner === account) {
      toast.error("You cannot fill your own order");
      setSelectedOrder(null);
      return;
    }

    const amount = parseAmount(fillAmount);
    const maximum = selectedOrder.buy
      ? selectedOrder.vhp_amount
      : selectedOrder.koin_amount;
    if (!amount || BigInt(amount) > BigInt(maximum)) {
      toast.error(`Enter an amount no greater than ${formatAmount(maximum)}`);
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Filling order...");
    try {
      const paymentToken = new Contract({
        id: selectedOrder.buy ? VHP_CONTRACT_ID : KOIN_CONTRACT_ID,
        signer,
        provider,
        abi: utils.tokenAbi,
      });
      const { operation: approveOperation } =
        await paymentToken.functions.approve(
          {
            owner: account,
            spender: KOIN_VHP_DEX_CONTRACT_ID,
            value: amount,
          },
          { onlyOperation: true }
        );

      const dex = new Contract({
        id: KOIN_VHP_DEX_CONTRACT_ID,
        signer,
        provider,
        abi: abiDexKoinVhp,
      });
      const { transaction, receipt } = await dex.functions.fill_order(
        { id: selectedOrder.id, account, amount },
        { previousOperations: approveOperation ? [approveOperation] : [] }
      );
      if (receipt?.reverted) throw new Error("Transaction reverted");
      await transaction?.wait();

      toast.dismiss(toastId);
      toast.success("Order filled");
      setSelectedOrder(null);
      await Promise.all([loadOrders(), loadBalances()]);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : "Failed to fill order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (order: DexOrder) => {
    if (!requireWallet() || !signer || !provider) return;

    setSubmitting(true);
    const toastId = toast.loading("Cancelling order...");
    try {
      const dex = new Contract({
        id: KOIN_VHP_DEX_CONTRACT_ID,
        signer,
        provider,
        abi: abiDexKoinVhp,
      });
      const { transaction, receipt } = await dex.functions.cancel_order({
        id: order.id,
      });
      if (receipt?.reverted) throw new Error("Transaction reverted");
      await transaction?.wait();

      toast.dismiss(toastId);
      toast.success("Order cancelled");
      await loadOrders();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setSubmitting(false);
    }
  };

  const getPoolLabel = (poolAddress: string) => {
    if (!poolAddress) return "—";
    const match = pools.find((miningPool) => miningPool.account === poolAddress);
    return match?.name || poolAddress;
  };

  const renderBook = () => {
    const orders = side === "sell" ? sellOrders : buyOrders;
    const mine = myOrders.filter((order) => order.buy === (side === "buy"));
    const others = orders.filter((order) => order.owner !== account);
    const rows = [...mine, ...others];
    return (
      <>
        {error && (
          <p className="mt-9 text-sm text-muted-foreground">
            Couldn&apos;t load orders.{" "}
            <button type="button" className="text-brand" onClick={loadOrders}>Retry</button>
          </p>
        )}
        <details className={cn("border-t", error ? "mt-3" : "mt-9")}>
          <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-sm text-muted-foreground [&::-webkit-details-marker]:hidden">
            <span>Open orders</span>
            <span className="tabular-nums">{loading ? "…" : rows.length} ›</span>
          </summary>
          {!error && rows.length === 0 && !loading && (
            <p className="pb-3 text-sm text-muted-foreground">No open orders.</p>
          )}
          {rows.length > 0 && (
            <table className="w-full text-sm">
              <tbody>
                {rows.map((order) => {
                  const isMine = order.owner === account;
                  return (
                    <tr key={order.id} className="border-t">
                      <td className={cn("py-2.5", isMine && "text-brand")}>
                        {isMine ? "Your " : ""}
                        {order.buy ? "buy" : "sell"} {formatAmount(order.vhp_amount)} VHP
                        {isMine && order.pool && <span className="text-muted-foreground"> · {getPoolLabel(order.pool)}</span>}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatPrice(order)}
                        {" · "}
                        {isMine ? (
                          <button type="button" className="hover:text-foreground" onClick={() => handleCancelOrder(order)} disabled={submitting}>
                            cancel
                          </button>
                        ) : (
                          <button type="button" className="text-brand" onClick={() => openFillDialog(order)} disabled={!account || submitting}>
                            fill
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </details>
      </>
    );
  };

  const payAmount = side === "sell" ? vhpAmount : koinAmount;
  const getAmount = side === "sell" ? koinAmount : vhpAmount;
  const paySymbol = side === "sell" ? "VHP" : "KOIN";
  const getSymbol = side === "sell" ? "KOIN" : "VHP";

  return (
    <div className="mx-auto w-full max-w-[440px] px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Trade</h1>

      <div className="mt-6 grid grid-cols-2 gap-0.5 rounded-[9px] bg-muted p-[3px]" role="group" aria-label="Order side">
        <button
          type="button"
          disabled={submitting}
          aria-pressed={side === "sell"}
          onClick={() => setSide("sell")}
          className={cn("rounded-[7px] py-1.5 text-sm transition-colors", side === "sell" ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
        >
          Sell VHP
        </button>
        <button
          type="button"
          disabled={submitting}
          aria-pressed={side === "buy"}
          onClick={() => { setSide("buy"); setPool(""); }}
          className={cn("rounded-[7px] py-1.5 text-sm transition-colors", side === "buy" ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
        >
          Buy VHP
        </button>
      </div>

      <div className="mt-4 flex items-baseline gap-2.5 rounded-xl border px-4 py-3.5 focus-within:ring-2 focus-within:ring-brand/40">
        <input
          id="dex-pay-amount"
          type="number"
          min="0"
          step="0.00000001"
          placeholder="0"
          inputMode="decimal"
          aria-label={`You ${side === "sell" ? "sell" : "pay"}`}
          className="w-full min-w-0 bg-transparent text-[28px] font-semibold tracking-tight outline-none tabular-nums"
          value={payAmount}
          onChange={(event) => (side === "sell" ? setVhpAmount(event.target.value) : setKoinAmount(event.target.value))}
          disabled={submitting}
        />
        <span className="font-medium text-muted-foreground">{paySymbol}</span>
        <button
          type="button"
          className="text-xs font-semibold text-brand disabled:opacity-40"
          disabled={submitting || !availablePayBalance || balancesLoading || BigInt(availablePayBalance || "0") <= BigInt(0)}
          onClick={() => {
            if (!availablePayBalance) return;
            const maxValue = formatAmountForInput(availablePayBalance);
            if (side === "sell") setVhpAmount(maxValue);
            else setKoinAmount(maxValue);
          }}
        >
          Max
        </button>
      </div>
      <div className="mt-2.5 flex items-baseline gap-2.5 rounded-xl border px-4 py-3.5 focus-within:ring-2 focus-within:ring-brand/40">
        <input
          id="dex-get-amount"
          type="number"
          min="0"
          step="0.00000001"
          placeholder="0"
          inputMode="decimal"
          aria-label="You get"
          className="w-full min-w-0 bg-transparent text-[28px] font-semibold tracking-tight outline-none tabular-nums"
          value={getAmount}
          onChange={(event) => (side === "sell" ? setKoinAmount(event.target.value) : setVhpAmount(event.target.value))}
          disabled={submitting}
        />
        <span className="font-medium text-muted-foreground">{getSymbol}</span>
      </div>
      <div className="mt-2 flex justify-between px-0.5 text-xs text-muted-foreground">
        <span className="tabular-nums">{impliedPrice ? `${impliedPrice} KOIN per VHP` : " "}</span>
        <span>
          {!account
            ? ""
            : balancesLoading
              ? "Loading balance…"
              : availablePayBalance !== null
                ? `Wallet ${formatAmount(availablePayBalance)} ${availablePaySymbol}${side === "sell" && pool ? " in pool" : ""}`
                : ""}
        </span>
      </div>

      {side === "sell" && account && pools.length > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          <Select value={pool || NO_POOL_VALUE} onValueChange={(value) => setPool(value === NO_POOL_VALUE ? "" : value)} disabled={submitting || poolsLoading}>
            <SelectTrigger id="dex-pool" className="h-8 w-auto gap-2 border-0 px-0 text-xs text-brand shadow-none">
              <SelectValue placeholder="Sell from a pool instead" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_POOL_VALUE}>Sell from your wallet</SelectItem>
              {pools.map((miningPool) => (
                <SelectItem key={miningPool.account} value={miningPool.account}>
                  Sell from {miningPool.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {matchingOrder && (
        <p className="mt-4 text-xs text-muted-foreground">
          An open order matches —{" "}
          <button type="button" className="text-brand" onClick={() => { openFillDialog(matchingOrder); setFillAmount(side === "sell" ? vhpAmount : koinAmount); }} disabled={!account || submitting}>
            {matchingOrder.buy ? "Sell" : "Buy"} {formatAmount(matchingOrder.vhp_amount)} VHP at {formatPrice(matchingOrder)} ›
          </button>
        </p>
      )}

      {account ? (
        <Button
          className="mt-4 h-[42px] w-full rounded-[11px] bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={handleCreateOrder}
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Place order"}
        </Button>
      ) : (
        <div className="mt-4">
          <WalletButton connectLabel="Connect wallet" />
        </div>
      )}
      <p className="mt-2.5 text-center text-xs text-muted-foreground">Waits for a taker. Cancel any time.</p>

      {renderBook()}

      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open && !submitting) setSelectedOrder(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Fill {selectedOrder?.buy ? "buy" : "sell"} order
            </DialogTitle>
            <DialogDescription>
              Price: {selectedOrder ? formatPrice(selectedOrder) : "—"} KOIN
              per VHP. You can fill part of it.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-2">
              <Label htmlFor="dex-fill-amount">
                You pay ({selectedOrder.buy ? "VHP" : "KOIN"})
              </Label>
              <Input
                id="dex-fill-amount"
                type="number"
                min="0"
                step="0.00000001"
                value={fillAmount}
                onChange={(event) => setFillAmount(event.target.value)}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Maximum:{" "}
                {formatAmount(
                  selectedOrder.buy
                    ? selectedOrder.vhp_amount
                    : selectedOrder.koin_amount
                )}{" "}
                {selectedOrder.buy ? "VHP" : "KOIN"}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedOrder(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleFillOrder} disabled={submitting}>
              {submitting ? "Submitting..." : "Fill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
