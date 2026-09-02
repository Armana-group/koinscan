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
import { abiDexKoinVhp } from "@/koinos/abis/dexKoinVhp";
import {
  KOIN_CONTRACT_ID,
  KOIN_VHP_DEX_CONTRACT_ID,
  VHP_CONTRACT_ID,
} from "@/koinos/constants";
import * as toast from "@/lib/toast";

const DECIMALS = 8;
const TIERS = Array.from({ length: 17 }, (_, index) => index + 1);
// A single 17-tier call exceeds the chain's compute-bandwidth limit.
const TIERS_PER_MULTICALL = 4;

interface DexOrder {
  id: string;
  buy: boolean;
  owner: string;
  pool: string;
  koin_amount: string;
  vhp_amount: string;
  tier: number;
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

export default function DexPage() {
  const { provider, signer, savedAddress } = useWallet();
  const account = signer?.getAddress() ?? savedAddress ?? null;

  const [sellOrders, setSellOrders] = useState<DexOrder[]>([]);
  const [buyOrders, setBuyOrders] = useState<DexOrder[]>([]);
  const [myOrders, setMyOrders] = useState<DexOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [side, setSide] = useState<"buy" | "sell">("sell");
  const [koinAmount, setKoinAmount] = useState("");
  const [vhpAmount, setVhpAmount] = useState("");
  const [pool, setPool] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<DexOrder | null>(null);
  const [fillAmount, setFillAmount] = useState("");

  const newOrderTier = useMemo(() => {
    const raw = parseAmount(vhpAmount);
    return raw ? Math.min(raw.length, 17) : null;
  }, [vhpAmount]);

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

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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
    if (vhpRaw.length > 17) {
      toast.error("The VHP amount exceeds the supported tier range");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Creating order...");
    try {
      const previousOperations = [];
      const usesPoolVhp = side === "sell" && pool.trim().length > 0;

      if (!usesPoolVhp) {
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
      await loadOrders();
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
      await loadOrders();
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
        <CardTitle className="text-lg capitalize">{type} orders</CardTitle>
        <CardDescription>
          Sorted by KOIN per VHP, with the best price first.
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
              Choose how much KOIN and VHP to exchange. The contract derives
              the order tier from the VHP amount.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Order side</Label>
                <Select
                  value={side}
                  onValueChange={(value) => setSide(value as "buy" | "sell")}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sell">Sell VHP for KOIN</SelectItem>
                    <SelectItem value="buy">Buy VHP with KOIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Calculated tier</Label>
                <div className="flex h-9 items-center rounded-md border px-3 text-sm">
                  {newOrderTier ?? "Enter a VHP amount"}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dex-koin-amount">KOIN amount</Label>
                <Input
                  id="dex-koin-amount"
                  type="number"
                  min="0"
                  step="0.00000001"
                  placeholder="0"
                  value={koinAmount}
                  onChange={(event) => setKoinAmount(event.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dex-vhp-amount">VHP amount</Label>
                <Input
                  id="dex-vhp-amount"
                  type="number"
                  min="0"
                  step="0.00000001"
                  placeholder="0"
                  value={vhpAmount}
                  onChange={(event) => setVhpAmount(event.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {side === "sell" && (
              <div className="space-y-2">
                <Label htmlFor="dex-pool">Mining pool address (optional)</Label>
                <Input
                  id="dex-pool"
                  placeholder="Leave empty to sell VHP from your wallet"
                  value={pool}
                  onChange={(event) => setPool(event.target.value)}
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  The pool must support DEX withdrawals and your pool settings
                  must allow the DEX to unstake VHP.
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleCreateOrder}
              disabled={!account || submitting}
            >
              {submitting ? "Submitting..." : "Create order"}
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
