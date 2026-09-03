"use client";

import { Contract, Multicall, ProviderInterface, utils } from "koilib";
import { ArrowDownUp, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const renderOrders = (orders: DexOrder[], type: "buy" | "sell") => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg capitalize">{type} VHP orders</CardTitle>
        <CardDescription>
         Orders that are {type === "buy" ? "buying VHP with KOIN" : "selling VHP for KOIN"}. By filling an order you pay {type === "buy" 
            ? "VHP to get KOIN"
            : "KOIN to get VHP"
          }.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No {type} orders found in tiers 1–17.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Price</TableHead>
                <TableHead>KOIN</TableHead>
                <TableHead>VHP</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={`${type}-${order.id}`}>
                  <TableCell className="font-medium">
                    {formatPrice(order)}
                  </TableCell>
                  <TableCell>{formatAmount(order.koin_amount)}</TableCell>
                  <TableCell>{formatAmount(order.vhp_amount)}</TableCell>
                  <TableCell className="text-right">
                    {account === order.owner ? (
                      <Badge variant="secondary">My order</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => openFillDialog(order)}
                        disabled={!account || submitting}
                      >
                        Fill
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  const getPoolLabel = (poolAddress: string) => {
    if (!poolAddress) return "—";
    const match = pools.find((miningPool) => miningPool.account === poolAddress);
    return match?.name || poolAddress;
  };

  const renderMyOrders = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">My orders</CardTitle>
        <CardDescription>
          Open buy and sell orders owned by your connected account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!account ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Connect your wallet to view your orders.
          </p>
        ) : myOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            You have no open orders.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Side</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>KOIN</TableHead>
                <TableHead>VHP</TableHead>
                <TableHead>Pool</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myOrders.map((order) => (
                <TableRow key={`mine-${order.id}`}>
                  <TableCell className="font-medium">
                    {order.buy ? "Buy" : "Sell"}
                  </TableCell>
                  <TableCell>{formatPrice(order)}</TableCell>
                  <TableCell>{formatAmount(order.koin_amount)}</TableCell>
                  <TableCell>{formatAmount(order.vhp_amount)}</TableCell>
                  <TableCell>{getPoolLabel(order.pool)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelOrder(order)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <ArrowDownUp className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            KOIN / VHP order book decentralized exchange
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-muted-foreground">
            Trade KOIN and VHP directly through a decentralized order book.
            You can also create VHP sell orders while your VHP is still mining
            in a compatible mining pool.
          </p>
        </div>

        {!account && (
          <Alert>
            <AlertDescription>
              Connect your wallet to create or fill an order.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Create an order</CardTitle>
            <CardDescription>
              Set the amounts you pay and receive. The contract derives the
              order tier from the VHP amount.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
              role="group"
              aria-label="Order side"
            >
              <button
                type="button"
                disabled={submitting}
                onClick={() => setSide("sell")}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  side === "sell"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sell VHP
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setSide("buy");
                  setPool("");
                }}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  side === "buy"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Buy VHP
              </button>
            </div>

            {side === "sell" && (
              <div className="space-y-2">
                <Label htmlFor="dex-pool">Mining pool (optional)</Label>
                <Select
                  value={pool || NO_POOL_VALUE}
                  onValueChange={(value) =>
                    setPool(value === NO_POOL_VALUE ? "" : value)
                  }
                  disabled={submitting || poolsLoading}
                >
                  <SelectTrigger id="dex-pool">
                    <SelectValue
                      placeholder={
                        poolsLoading
                          ? "Loading pools..."
                          : "Sell VHP from your wallet"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_POOL_VALUE}>
                      Sell VHP from your wallet
                    </SelectItem>
                    {pools.map((miningPool) => (
                      <SelectItem
                        key={miningPool.account}
                        value={miningPool.account}
                      >
                        {miningPool.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The pool must support DEX withdrawals and your pool settings
                  must allow the DEX to unstake VHP.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="dex-pay-amount">
                  {side === "sell" ? "VHP to pay" : "KOIN to pay"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="dex-pay-amount"
                    type="number"
                    min="0"
                    step="0.00000001"
                    placeholder="0"
                    value={side === "sell" ? vhpAmount : koinAmount}
                    onChange={(event) =>
                      side === "sell"
                        ? setVhpAmount(event.target.value)
                        : setKoinAmount(event.target.value)
                    }
                    disabled={submitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      submitting
                      || !availablePayBalance
                      || balancesLoading
                      || BigInt(availablePayBalance || "0") <= BigInt(0)
                    }
                    onClick={() => {
                      if (!availablePayBalance) return;
                      const maxValue = formatAmountForInput(availablePayBalance);
                      if (side === "sell") setVhpAmount(maxValue);
                      else setKoinAmount(maxValue);
                    }}
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {!account
                    ? "Connect your wallet to see available balance"
                    : balancesLoading
                      ? "Loading available balance..."
                      : availablePayBalance !== null
                        ? `Available: ${formatAmount(availablePayBalance)} ${availablePaySymbol}${
                            side === "sell" && pool ? " in pool" : ""
                          }`
                        : "Available balance unavailable"}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>
                  {impliedPrice
                    ? `${impliedPrice} KOIN / VHP`
                    : "Price appears when both amounts are set"}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dex-get-amount">
                  {side === "sell" ? "KOIN to get" : "VHP to get"}
                </Label>
                <Input
                  id="dex-get-amount"
                  type="number"
                  min="0"
                  step="0.00000001"
                  placeholder="0"
                  value={side === "sell" ? koinAmount : vhpAmount}
                  onChange={(event) =>
                    side === "sell"
                      ? setKoinAmount(event.target.value)
                      : setVhpAmount(event.target.value)
                  }
                  disabled={submitting}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleCreateOrder}
              disabled={!account || submitting}
            >
              {submitting
                ? "Submitting..."
                : side === "sell"
                  ? "Create sell order"
                  : "Create buy order"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Order book</h2>
            <p className="text-sm text-muted-foreground">
              Up to 20 orders from each of tiers 1–17.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading all order tiers...
          </div>
        ) : (
          <Tabs defaultValue="sell">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sell">
                Sell orders ({sellOrders.length})
              </TabsTrigger>
              <TabsTrigger value="buy">
                Buy orders ({buyOrders.length})
              </TabsTrigger>
              <TabsTrigger value="mine">
                My orders ({myOrders.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="sell">
              {renderOrders(sellOrders, "sell")}
            </TabsContent>
            <TabsContent value="buy">
              {renderOrders(buyOrders, "buy")}
            </TabsContent>
            <TabsContent value="mine">{renderMyOrders()}</TabsContent>
          </Tabs>
        )}
      </div>

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
              per VHP. Partial fills are supported.
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
              {submitting ? "Submitting..." : "Fill order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
