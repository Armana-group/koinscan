"use client";

import { Contract, Multicall, ProviderInterface, utils } from "koilib";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { abiFogataPool } from "@/koinos/abis/fogataPool";
import tokenAbi from "@/koinos/abi";
import {
  KOIN_CONTRACT_ID,
  POB_CONTRACT_ID,
  VHP_CONTRACT_ID,
} from "@/koinos/constants";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as toast from "@/lib/toast";

const DECIMALS = 8;
const SCALE = 10 ** DECIMALS;

interface PoolParams {
  name: string;
  image: string;
  description: string;
  payment_period: string;
}

interface PoolBalance {
  koin_amount: string;
  vhp_amount: string;
  vapor_amount: string;
}

interface CollectKoinPreferences {
  percentage_koin: string;
  all_after_virtual: string;
}

function formatAmount(raw: string): string {
  const value = Number(raw) / SCALE;
  if (value === 0) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function toBaseUnits(amount: string): string {
  const value = parseFloat(amount);
  if (Number.isNaN(value) || value <= 0) return "0";
  return Math.floor(value * SCALE).toString();
}

async function fetchWalletBalances(
  provider: ProviderInterface,
  account: string
): Promise<{ koin: string; vhp: string }> {
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
  await multicall.add(koinContract.functions.balanceOf, { owner: account });
  await multicall.add(vhpContract.functions.balanceOf, { owner: account });
  const [koinResult, vhpResult] = await multicall.call();

  return {
    koin: koinResult?.value ?? "0",
    vhp: vhpResult?.value ?? "0",
  };
}

async function fetchPoolBalance(
  provider: ProviderInterface,
  poolId: string,
  account: string
): Promise<PoolBalance> {
  const poolContract = new Contract({
    id: poolId,
    provider,
    abi: abiFogataPool,
  });
  const { result } = await poolContract.functions.balance_of({ account });
  return {
    koin_amount: result?.koin_amount ?? "0",
    vhp_amount: result?.vhp_amount ?? "0",
    vapor_amount: result?.vapor_amount ?? "0",
  };
}

export default function FogataPoolPage() {
  const params = useParams<{ poolId: string }>();
  const poolId = params.poolId;
  const { provider, signer, savedAddress } = useWallet();

  const account = signer?.getAddress() ?? savedAddress ?? null;

  const [poolParams, setPoolParams] = useState<PoolParams | null>(null);
  const [walletBalances, setWalletBalances] = useState<{ koin: string; vhp: string } | null>(null);
  const [poolBalance, setPoolBalance] = useState<PoolBalance | null>(null);
  const [preferences, setPreferences] = useState<CollectKoinPreferences | null>(null);

  const [koinDeposit, setKoinDeposit] = useState("");
  const [vhpDeposit, setVhpDeposit] = useState("");
  const [koinWithdraw, setKoinWithdraw] = useState("");
  const [vhpWithdraw, setVhpWithdraw] = useState("");
  const [percentageKoin, setPercentageKoin] = useState("100");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!provider || !poolId) return;

    setLoading(true);
    setError(null);

    try {
      const poolContract = new Contract({
        id: poolId,
        provider,
        abi: abiFogataPool,
      });
      const { result: paramsResult } = await poolContract.functions.get_pool_params({});
      setPoolParams(paramsResult as PoolParams);

      if (account) {
        const [balances, staked, prefsResult] = await Promise.all([
          fetchWalletBalances(provider, account),
          fetchPoolBalance(provider, poolId, account),
          poolContract.functions.get_collect_koin_preferences({ account }),
        ]);
        setWalletBalances(balances);
        setPoolBalance(staked);
        if (prefsResult.result) {
          const prefs = prefsResult.result as CollectKoinPreferences;
          setPreferences(prefs);
          setPercentageKoin(String(Number(prefs.percentage_koin) / 1000));
        }
      } else {
        setWalletBalances(null);
        setPoolBalance(null);
        setPreferences(null);
      }
    } catch (err) {
      console.error("Error loading pool:", err);
      setError(err instanceof Error ? err.message : "Failed to load pool");
    } finally {
      setLoading(false);
    }
  }, [provider, poolId, account]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const requireWallet = (): string | null => {
    if (!account) {
      toast.error("Connect your wallet to continue");
      return null;
    }
    if (!signer) {
      toast.error("Wallet signer not available");
      return null;
    }
    return account;
  };

  const handleStake = async () => {
    const userAccount = requireWallet();
    if (!userAccount || !provider) return;

    const koinAmount = toBaseUnits(koinDeposit);
    const vhpAmount = toBaseUnits(vhpDeposit);
    if (koinAmount === "0" && vhpAmount === "0") {
      toast.error("Enter a KOIN or VHP amount to deposit");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading("Submitting deposit...");
    try {
      const koinContract = new Contract({
        id: KOIN_CONTRACT_ID,
        signer,
        provider,
        abi: utils.tokenAbi,
      });
      const vhpContract = new Contract({
        id: VHP_CONTRACT_ID,
        signer,
        provider,
        abi: utils.tokenAbi,
      });
      const { operation: opApproveBurn } = await koinContract.functions.approve({ 
        owner: userAccount,
        spender: POB_CONTRACT_ID,
        value: koinAmount,
      }, { onlyOperation: true });
      const { operation: opApproveTransfer } = await vhpContract.functions.approve({ 
        owner: userAccount,
        spender: poolId,
        value: (BigInt(vhpAmount) + BigInt(koinAmount)).toString(),
      }, { onlyOperation: true });

      const poolContract = new Contract({
        id: poolId,
        signer,
        provider,
        abi: abiFogataPool,
      });
      const { transaction, receipt } = await poolContract.functions.stake(
        { account: userAccount, koin_amount: koinAmount, vhp_amount: vhpAmount },
        { previousOperations: [opApproveBurn, opApproveTransfer] }
      );
      if (receipt?.reverted) {
        throw new Error("Transaction reverted");
      }
      await transaction?.wait();
      toast.dismiss(loadingToast);
      toast.success("Deposit submitted successfully");
      setKoinDeposit("");
      setVhpDeposit("");
      await loadData();
    } catch (err) {
      console.error("error", err);
      toast.error(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnstake = async () => {
    const userAccount = requireWallet();
    if (!userAccount || !provider) return;

    const koinAmount = toBaseUnits(koinWithdraw);
    const vhpAmount = toBaseUnits(vhpWithdraw);
    if (koinAmount === "0" && vhpAmount === "0") {
      toast.error("Enter a KOIN or VHP amount to withdraw");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading("Submitting withdrawal...");
    try {
      const poolContract = new Contract({
        id: poolId,
        signer,
        provider,
        abi: abiFogataPool,
      });
      const { transaction, receipt } = await poolContract.functions.unstake(
        { account: userAccount, koin_amount: koinAmount, vhp_amount: vhpAmount },
      );
      if (receipt?.reverted) {
        throw new Error("Transaction reverted");
      }
      await transaction?.wait();
      toast.dismiss(loadingToast);
      toast.success("Withdrawal submitted successfully");
      setKoinWithdraw("");
      setVhpWithdraw("");
      await loadData();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePreferences = async () => {
    const userAccount = requireWallet();
    if (!userAccount || !provider) return;

    const pct = parseFloat(percentageKoin);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Percentage must be between 0 and 100");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading("Saving preferences...");
    try {
      const poolContract = new Contract({
        id: poolId,
        signer,
        provider,
        abi: abiFogataPool,
      });
      console.log("provider", provider);
      const { transaction, receipt } =
        await poolContract.functions.set_collect_koin_preferences({
          account: userAccount,
          percentage_koin: String(Math.round(pct * 1000)),
          all_after_virtual: preferences?.all_after_virtual ?? "0",
        });
      if (receipt?.reverted) {
        throw new Error("Transaction reverted");
      }
      console.log("transaction", transaction);
      await transaction?.wait();
      toast.dismiss(loadingToast);
      toast.success("Preferences saved");
      await loadData();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <Link
        href="/dapps/fogata"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pools
      </Link>

      {loading && (
        <div className="text-center text-muted-foreground">Loading pool...</div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && poolParams && (
        <div className="mx-auto max-w-2xl space-y-6">
          <Card className="overflow-hidden border border-border/60">
            {poolParams.image && (
              <div className="relative h-48 w-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poolParams.image}
                  alt={poolParams.name || "Pool image"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">
                {poolParams.name || "Unnamed Pool"}
              </CardTitle>
              {poolParams.description && (
                <CardDescription>{poolParams.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Pool address: </span>
                <span className="break-all font-mono">{poolId}</span>
              </div>
              {poolParams.payment_period && (
                <div>
                  <span className="text-muted-foreground">Payment period: </span>
                  {Number(poolParams.payment_period) / 1000 / 86400} days
                </div>
              )}
            </CardContent>
          </Card>

          {!account && (
            <Alert>
              <AlertDescription>
                Connect your wallet to deposit, withdraw, or configure this pool.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="deposit">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="deposit">Deposit</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
              <TabsTrigger value="configure">Configure</TabsTrigger>
            </TabsList>

            <TabsContent value="deposit">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Deposit</CardTitle>
                  <CardDescription>
                    Stake KOIN or VHP into this mining pool.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="koin-deposit">KOIN amount</Label>
                      <div className="flex gap-2">
                        <Input
                          id="koin-deposit"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={koinDeposit}
                          onChange={(e) => setKoinDeposit(e.target.value)}
                          disabled={!account || submitting}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!walletBalances || submitting}
                          onClick={() =>
                            setKoinDeposit(formatAmount(walletBalances!.koin))
                          }
                        >
                          Max
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Available: {walletBalances ? formatAmount(walletBalances.koin) : "—"} KOIN
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vhp-deposit">VHP amount</Label>
                      <div className="flex gap-2">
                        <Input
                          id="vhp-deposit"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={vhpDeposit}
                          onChange={(e) => setVhpDeposit(e.target.value)}
                          disabled={!account || submitting}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!walletBalances || submitting}
                          onClick={() =>
                            setVhpDeposit(formatAmount(walletBalances!.vhp))
                          }
                        >
                          Max
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Available: {walletBalances ? formatAmount(walletBalances.vhp) : "—"} VHP
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleStake}
                    disabled={!account || submitting}
                  >
                    {submitting ? "Submitting..." : "Deposit"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="withdraw">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Withdraw</CardTitle>
                  <CardDescription>
                    Unstake KOIN or VHP from this mining pool.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="koin-withdraw">KOIN amount</Label>
                      <div className="flex gap-2">
                        <Input
                          id="koin-withdraw"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={koinWithdraw}
                          onChange={(e) => setKoinWithdraw(e.target.value)}
                          disabled={!account || submitting}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!poolBalance || submitting}
                          onClick={() =>
                            setKoinWithdraw(formatAmount(poolBalance!.koin_amount))
                          }
                        >
                          Max
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Available: {poolBalance ? formatAmount(poolBalance.koin_amount) : "—"} KOIN
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vhp-withdraw">VHP amount</Label>
                      <div className="flex gap-2">
                        <Input
                          id="vhp-withdraw"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={vhpWithdraw}
                          onChange={(e) => setVhpWithdraw(e.target.value)}
                          disabled={!account || submitting}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!poolBalance || submitting}
                          onClick={() =>
                            setVhpWithdraw(formatAmount(poolBalance!.vhp_amount))
                          }
                        >
                          Max
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Available: {poolBalance ? formatAmount(poolBalance.vhp_amount) : "—"} VHP
                      </p>
                    </div>
                  </div>
                  {poolBalance && Number(poolBalance.vapor_amount) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Vapor balance: {formatAmount(poolBalance.vapor_amount)} VAPOR
                    </p>
                  )}
                  <Button
                    className="w-full"
                    onClick={handleUnstake}
                    disabled={!account || submitting}
                  >
                    {submitting ? "Submitting..." : "Withdraw"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="configure">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configure</CardTitle>
                  <CardDescription>
                    Set how rewards are collected from this pool.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="percentage-koin">
                      KOIN collection percentage
                    </Label>
                    <Input
                      id="percentage-koin"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={percentageKoin}
                      onChange={(e) => setPercentageKoin(e.target.value)}
                      disabled={!account || submitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      Percentage of earned KOIN to collect as KOIN (remainder as VHP).
                      {preferences && (
                        <> Current: {Number(preferences.percentage_koin) / 1000}%</>
                      )}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSavePreferences}
                    disabled={!account || submitting}
                  >
                    {submitting ? "Saving..." : "Save preferences"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
