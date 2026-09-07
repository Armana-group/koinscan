"use client";

import {
  BlockHeaderJson,
  Contract,
  Multicall,
  ProviderInterface,
  utils,
} from "koilib";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  Clock,
  Coins,
  Hash,
  Plus,
  Trash2,
} from "lucide-react";

import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import tokenAbi from "@/koinos/abi";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiPob } from "@/koinos/abis";
import {
  FOGATA2_LIST_POOLS_CONTRACT_ID,
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
  beneficiaries: Beneficiary[];
  payment_period: string;
}

interface Beneficiary {
  address: string;
  percentage: number;
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

interface PoolPerformance {
  vhpAmount?: number;
  averageTimeToProduce?: number;
  expectedTimeToProduce?: number;
  effectiveness?: number;
  lastBlockHeight?: number;
  lastBlockTime?: Date;
}

interface PoolState {
  next_snapshot?: string;
}

function formatAmount(raw: string): string {
  const value = Number(raw) / SCALE;
  if (value === 0) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function formatVhp(amount?: number): string {
  if (amount === undefined) return "Unavailable";
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B VHP`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M VHP`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K VHP`;
  return `${amount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} VHP`;
}

function formatDuration(milliseconds?: number): string {
  if (
    milliseconds === undefined ||
    !Number.isFinite(milliseconds) ||
    milliseconds < 0
  ) {
    return "Unavailable";
  }

  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatTimeAgo(date?: Date): string {
  if (!date) return "Never";

  const difference = Math.floor((Date.now() - date.getTime()) / 1000);
  const seconds = Math.abs(difference);
  const relative =
    seconds < 60
      ? `${seconds}s`
      : seconds < 3600
        ? `${Math.floor(seconds / 60)}m`
        : seconds < 86400
          ? `${Math.floor(seconds / 3600)}h`
          : `${Math.floor(seconds / 86400)}d`;

  return difference < 0 ? `in ${relative}` : `${relative} ago`;
}

async function getRecentProducedBlocks(
  provider: ProviderInterface,
  producer: string
): Promise<{ header: BlockHeaderJson }[]> {
  const result = await provider.call<{
    values?: {
      block?: {
        header: BlockHeaderJson;
      };
    }[];
  }>("account_history.get_account_history", {
    address: producer,
    ascending: false,
    limit: 30,
    irreversible: false,
    seq_num: null,
  });

  return (result.values ?? []).flatMap((entry) =>
    entry.block ? [entry.block] : []
  );
}

function toBaseUnits(amount: string): string {
  const value = parseFloat(amount);
  if (Number.isNaN(value) || value <= 0) return "0";
  return Math.floor(value * SCALE).toString();
}

function isMulticallError(result: unknown): result is Error {
  return result instanceof Error;
}

export default function FogataPoolPage() {
  const params = useParams<{ poolId: string }>();
  const router = useRouter();
  const poolId = params.poolId;
  const { provider, signer, savedAddress } = useWallet();

  const account = signer?.getAddress() ?? savedAddress ?? null;

  const [poolParams, setPoolParams] = useState<PoolParams | null>(null);
  const [walletBalances, setWalletBalances] = useState<{ koin: string; vhp: string } | null>(null);
  const [poolBalance, setPoolBalance] = useState<PoolBalance | null>(null);
  const [preferences, setPreferences] = useState<CollectKoinPreferences | null>(null);
  const [poolOwner, setPoolOwner] = useState<string | null>(null);
  const [reservedKoin, setReservedKoin] = useState("0");
  const [registeredPublicKey, setRegisteredPublicKey] = useState("");
  const [performance, setPerformance] = useState<PoolPerformance>({});
  const [nextPayment, setNextPayment] = useState<Date | null>(null);

  const [koinDeposit, setKoinDeposit] = useState("");
  const [vhpDeposit, setVhpDeposit] = useState("");
  const [koinWithdraw, setKoinWithdraw] = useState("");
  const [vhpWithdraw, setVhpWithdraw] = useState("");
  const [percentageKoin, setPercentageKoin] = useState("100");
  const [poolName, setPoolName] = useState("");
  const [poolImage, setPoolImage] = useState("");
  const [poolDescription, setPoolDescription] = useState("");
  const [reburnPeriodDays, setReburnPeriodDays] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [reservedKoinAmount, setReservedKoinAmount] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poolBalanceError, setPoolBalanceError] = useState<string | null>(null);
  const isOwner = Boolean(account && poolOwner && account === poolOwner);

  const loadData = useCallback(async () => {
    if (!provider || !poolId) return;

    setLoading(true);
    setError(null);

    try {
      const poolContract = new Contract({
        id: poolId,
        provider,
        abi: abiFogata2Pool,
      });
      const pobContract = new Contract({
        id: POB_CONTRACT_ID,
        provider,
        abi: abiPob,
      });
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
        contracts: [poolContract, pobContract, koinContract, vhpContract],
      });

      await multicall.add(poolContract.functions.get_pool_params, {});
      await multicall.add(poolContract.functions.get_owner, {});
      await multicall.add(poolContract.functions.get_all_reserved_koin, {});
      await multicall.add(vhpContract.functions.balanceOf, {
        owner: poolId,
      });
      await multicall.add(pobContract.functions.get_metadata, {});
      await multicall.add(poolContract.functions.get_pool_state, {});
      if (account) {
        await multicall.add(koinContract.functions.balanceOf, {
          owner: account,
        });
        await multicall.add(vhpContract.functions.balanceOf, {
          owner: account,
        });
        await multicall.add(
          poolContract.functions.get_collect_koin_preferences,
          { value: account }
        );
      }

      const publicKeyRequest = account
        ? pobContract.functions
            .get_public_key({ producer: poolId })
            .catch((err) => {
              console.info("No public key registered for this pool:", err);
              return null;
            })
        : Promise.resolve(null);
      const poolBalanceRequest = account
        ? poolContract.functions
            .balance_of({ value: account })
            .then((response) => ({
              result: response.result as Partial<PoolBalance> | undefined,
              error: null,
            }))
            .catch((err) => ({
              result: undefined,
              error:
                err instanceof Error
                  ? err.message
                  : "The pool contract could not return your balance",
            }))
        : Promise.resolve(null);

      const recentBlocksRequest = getRecentProducedBlocks(provider, poolId).catch(
        (err) => {
          console.info("Unable to load recent blocks for this pool:", err);
          return [];
        }
      );

      const [results, publicKeyResponse, poolBalanceResponse, recentBlocks] =
        await Promise.all([
          multicall.call(),
          publicKeyRequest,
          poolBalanceRequest,
          recentBlocksRequest,
        ]);
      const paramsResult = results[0] as PoolParams | Error;
      const ownerResult = results[1] as { value?: string } | Error;
      const reservedResult = results[2] as { value?: string } | Error;
      const poolVhpResult = results[3] as { value?: string } | Error;
      const metadataResult = results[4] as
        | { value?: { difficulty?: string } }
        | Error;
      const poolStateResult = results[5] as PoolState | Error;

      if (isMulticallError(paramsResult)) throw paramsResult;
      if (isMulticallError(ownerResult)) throw ownerResult;

      setPoolParams(paramsResult);
      setPoolOwner(ownerResult.value ?? null);
      setReservedKoin(
        isMulticallError(reservedResult) ? "0" : (reservedResult.value ?? "0")
      );
      setRegisteredPublicKey(publicKeyResponse?.result?.value ?? "");
      setPoolName(paramsResult.name ?? "");
      setPoolImage(paramsResult.image ?? "");
      setPoolDescription(paramsResult.description ?? "");
      setBeneficiaries(paramsResult.beneficiaries ?? []);
      setReburnPeriodDays(
        paramsResult.payment_period
          ? String(Number(paramsResult.payment_period) / 1000 / 86400)
          : ""
      );
      const nextSnapshot = isMulticallError(poolStateResult)
        ? undefined
        : Number(poolStateResult.next_snapshot);
      setNextPayment(
        nextSnapshot !== undefined &&
          Number.isFinite(nextSnapshot) &&
          nextSnapshot > 0
          ? new Date(nextSnapshot)
          : null
      );

      const vhpAmount = isMulticallError(poolVhpResult)
        ? undefined
        : Number(poolVhpResult.value ?? "0") / SCALE;
      let expectedTimeToProduce: number | undefined;

      if (
        !isMulticallError(metadataResult) &&
        metadataResult.value?.difficulty &&
        vhpAmount !== undefined &&
        vhpAmount > 0
      ) {
        const difficulty = Number(
          "0x" +
            utils.toHexString(
              utils.decodeBase64url(metadataResult.value.difficulty)
            )
        );
        const expected = (10 * difficulty) / (vhpAmount * SCALE);
        if (Number.isFinite(expected)) expectedTimeToProduce = expected;
      }

      const newestBlock = recentBlocks[0];
      const oldestBlock = recentBlocks[recentBlocks.length - 1];
      const newestTime = newestBlock
        ? Number(newestBlock.header.timestamp)
        : undefined;
      const oldestTime = oldestBlock
        ? Number(oldestBlock.header.timestamp)
        : undefined;
      let averageTimeToProduce: number | undefined;

      if (
        newestTime !== undefined &&
        oldestTime !== undefined &&
        expectedTimeToProduce !== undefined
      ) {
        const timeSinceLastBlock = Date.now() - newestTime;
        if (timeSinceLastBlock > expectedTimeToProduce) {
          averageTimeToProduce =
            (Date.now() - oldestTime) / recentBlocks.length;
        } else if (recentBlocks.length > 1) {
          averageTimeToProduce =
            (newestTime - oldestTime) / (recentBlocks.length - 1);
        }
      }

      const effectiveness =
        expectedTimeToProduce !== undefined &&
        averageTimeToProduce !== undefined &&
        averageTimeToProduce > 0
          ? (expectedTimeToProduce * 100) / averageTimeToProduce
          : undefined;

      setPerformance({
        vhpAmount,
        expectedTimeToProduce,
        averageTimeToProduce,
        effectiveness: Number.isFinite(effectiveness)
          ? effectiveness
          : undefined,
        lastBlockHeight: newestBlock
          ? Number(newestBlock.header.height)
          : undefined,
        lastBlockTime:
          newestTime !== undefined ? new Date(newestTime) : undefined,
      });

      if (account) {
        const koinResult = results[6] as { value?: string } | Error;
        const vhpResult = results[7] as { value?: string } | Error;
        const preferencesResult = results[8] as
          | Partial<CollectKoinPreferences>
          | Error;

        if (isMulticallError(koinResult) || isMulticallError(vhpResult)) {
          setWalletBalances(null);
        } else {
          setWalletBalances({
            koin: koinResult.value ?? "0",
            vhp: vhpResult.value ?? "0",
          });
        }

        if (
          !poolBalanceResponse?.result ||
          poolBalanceResponse.result.koin_amount === undefined ||
          poolBalanceResponse.result.vhp_amount === undefined
        ) {
          setPoolBalance(null);
          setPoolBalanceError(
            poolBalanceResponse?.error ??
              "The pool contract could not return your balance"
          );
        } else {
          setPoolBalance({
            koin_amount: poolBalanceResponse.result.koin_amount,
            vhp_amount: poolBalanceResponse.result.vhp_amount,
            vapor_amount: poolBalanceResponse.result.vapor_amount ?? "0",
          });
          setPoolBalanceError(null);
        }

        if (
          !isMulticallError(preferencesResult) &&
          preferencesResult.percentage_koin !== undefined
        ) {
          const prefs = {
            percentage_koin: preferencesResult.percentage_koin,
            all_after_virtual: preferencesResult.all_after_virtual ?? "0",
          };
          setPreferences(prefs);
          setPercentageKoin(String(Number(prefs.percentage_koin) / 1000));
        } else {
          setPreferences(null);
        }
      } else {
        setWalletBalances(null);
        setPoolBalance(null);
        setPreferences(null);
        setPoolBalanceError(null);
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
        abi: abiFogata2Pool,
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
        abi: abiFogata2Pool,
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
        abi: abiFogata2Pool,
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

  const requireOwner = (): string | null => {
    const userAccount = requireWallet();
    if (!userAccount) return null;
    if (userAccount !== poolOwner) {
      toast.error("Only the pool owner can perform this action");
      return null;
    }
    return userAccount;
  };

  const handleSavePoolParams = async () => {
    if (!requireOwner() || !provider) return;

    const days = Number(reburnPeriodDays);
    const totalBeneficiaryPercentage = beneficiaries.reduce(
      (sum, beneficiary) => sum + beneficiary.percentage,
      0
    );
    if (!poolName.trim()) {
      toast.error("Pool name is required");
      return;
    }
    if (!Number.isFinite(days) || days <= 0) {
      toast.error("Reburn period must be greater than zero");
      return;
    }
    if (
      beneficiaries.some(
        (beneficiary) =>
          !beneficiary.address.trim() ||
          !Number.isFinite(beneficiary.percentage) ||
          beneficiary.percentage <= 0
      )
    ) {
      toast.error("Each beneficiary needs an address and a positive percentage");
      return;
    }
    if (totalBeneficiaryPercentage > 100_000) {
      toast.error("Beneficiary percentages cannot exceed 100%");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading("Updating pool parameters...");
    try {
      const poolContract = new Contract({
        id: poolId,
        signer,
        provider,
        abi: abiFogata2Pool,
      });
      const { transaction, receipt } =
        await poolContract.functions.set_pool_params({
          name: poolName.trim(),
          image: poolImage.trim(),
          description: poolDescription.trim(),
          beneficiaries: beneficiaries.map((beneficiary) => ({
            address: beneficiary.address.trim(),
            percentage: beneficiary.percentage,
          })),
          payment_period: String(Math.round(days * 86_400_000)),
        });
      if (receipt?.reverted) throw new Error("Transaction reverted");
      await transaction?.wait();
      toast.dismiss(loadingToast);
      toast.success("Pool parameters updated");
      await loadData();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err instanceof Error ? err.message : "Failed to update pool");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReservedKoin = async (action: "add" | "remove") => {
    const owner = requireOwner();
    if (!owner || !provider) return;

    const amount = toBaseUnits(reservedKoinAmount);
    if (amount === "0") {
      toast.error("Enter a KOIN amount");
      return;
    }
    if (action === "remove" && BigInt(amount) > BigInt(reservedKoin)) {
      toast.error("Amount exceeds the pool's reserved KOIN");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading(
      action === "add" ? "Adding reserved KOIN..." : "Removing reserved KOIN..."
    );
    try {
      const poolContract = new Contract({
        id: poolId,
        signer,
        provider,
        abi: abiFogata2Pool,
      });
      let response;
      if (action === "add") {
        const koinContract = new Contract({
          id: KOIN_CONTRACT_ID,
          signer,
          provider,
          abi: utils.tokenAbi,
        });
        const { operation: approveOperation } =
          await koinContract.functions.approve(
            { owner, spender: poolId, value: amount },
            { onlyOperation: true }
          );
        response = await poolContract.functions.add_reserved_koin(
          { account: owner, koin_amount: amount },
          { previousOperations: [approveOperation] }
        );
      } else {
        response = await poolContract.functions.remove_reserved_koin({
          account: owner,
          koin_amount: amount,
        });
      }
      if (response.receipt?.reverted) throw new Error("Transaction reverted");
      await response.transaction?.wait();
      toast.dismiss(loadingToast);
      toast.success(
        action === "add" ? "Reserved KOIN added" : "Reserved KOIN removed"
      );
      setReservedKoinAmount("");
      await loadData();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(
        err instanceof Error ? err.message : `Failed to ${action} reserved KOIN`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterPublicKey = async () => {
    if (!requireOwner() || !provider) return;
    const normalizedPublicKey = publicKey.trim();
    if (!normalizedPublicKey) {
      toast.error("Enter the node operator public key");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading("Registering public key...");
    try {
      const pobContract = new Contract({
        id: POB_CONTRACT_ID,
        signer,
        provider,
        abi: abiPob,
      });
      const { transaction, receipt } =
        await pobContract.functions.register_public_key({
          producer: poolId,
          public_key: normalizedPublicKey,
        });
      if (receipt?.reverted) throw new Error("Transaction reverted");
      await transaction?.wait();
      toast.dismiss(loadingToast);
      toast.success("Public key registered");
      setPublicKey("");
      await loadData();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(
        err instanceof Error ? err.message : "Failed to register public key"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePool = async () => {
    if (!requireOwner() || !provider || deleteConfirmation !== poolId) return;

    setSubmitting(true);
    const loadingToast = toast.loading("Removing pool from the Fogata list...");
    try {
      const listContract = new Contract({
        id: FOGATA2_LIST_POOLS_CONTRACT_ID,
        signer,
        provider,
        abi: abiFogata2ListPools,
      });
      const { transaction, receipt } = await listContract.functions.remove_pool({
        value: poolId,
      });
      if (receipt?.reverted) throw new Error("Transaction reverted");
      await transaction?.wait();
      toast.dismiss(loadingToast);
      toast.success("Pool removed from the Fogata list");
      router.push("/dapps/fogata");
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err instanceof Error ? err.message : "Failed to remove pool");
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
        <div className="mx-auto max-w-5xl space-y-6">
          <Card className="border-border/60">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted text-2xl font-semibold text-muted-foreground">
                  {(poolParams.name || "P").charAt(0).toUpperCase()}
                  {poolParams.image && (
                    <>
                      {/* Pool logo hosts are arbitrary on-chain URLs */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={poolParams.image}
                        alt={`${poolParams.name || "Pool"} logo`}
                        className="absolute inset-0 h-full w-full bg-background object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    </>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {poolParams.name || "Unnamed Pool"}
                  </h1>
                  {poolParams.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {poolParams.description}
                    </p>
                  )}
                  <div className="mt-4 space-y-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Pool address:{" "}
                      </span>
                      <span className="break-all font-mono">{poolId}</span>
                    </div>
                    {poolParams.payment_period && (
                      <div>
                        <span className="text-muted-foreground">
                          Payment period:{" "}
                        </span>
                        {Number(poolParams.payment_period) / 1000 / 86400} days
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <section aria-labelledby="pool-performance-heading">
            <h2
              id="pool-performance-heading"
              className="mb-3 text-lg font-semibold"
            >
              Pool performance
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    VHP amount
                  </CardTitle>
                  <Hash className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {formatVhp(performance.vhpAmount)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Producing stake held by the pool
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Average time to produce
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {formatDuration(performance.averageTimeToProduce)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expected{" "}
                    {formatDuration(performance.expectedTimeToProduce)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    Effectiveness
                    {performance.effectiveness !== undefined &&
                      performance.effectiveness > 5 && (
                        <span
                          className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.15)]"
                          title="Effectiveness is above 5%"
                        />
                      )}
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {performance.effectiveness !== undefined
                      ? `${performance.effectiveness.toFixed(1)}%`
                      : "Unavailable"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Based on expected production time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Last block produced
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {performance.lastBlockHeight !== undefined ? (
                      <Link
                        href={`/blocks/${performance.lastBlockHeight}`}
                        className="hover:underline"
                      >
                        #{performance.lastBlockHeight}
                      </Link>
                    ) : (
                      "Unavailable"
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTimeAgo(performance.lastBlockTime)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {account && (
            <section aria-labelledby="pool-position-heading">
              <h2
                id="pool-position-heading"
                className="mb-3 text-lg font-semibold"
              >
                Your pool position
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      VHP staked
                    </CardTitle>
                    <Hash className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold">
                      {poolBalance
                        ? `${formatAmount(poolBalance.vhp_amount)} VHP`
                        : "Unavailable"}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Changes over time: reburning rewards increases it, while
                      taking rewards as KOIN reduces it
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      KOIN balance
                    </CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold">
                      {poolBalance
                        ? `${formatAmount(poolBalance.koin_amount)} KOIN`
                        : "Unavailable"}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Automatically reburned or sent to you according to your
                      reward configuration
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Next payment
                    </CardTitle>
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-base font-semibold">
                      {nextPayment ? nextPayment.toLocaleString() : "Unavailable"}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {nextPayment
                        ? `Scheduled ${formatTimeAgo(nextPayment)}`
                        : "Pool schedule is unavailable"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}

          {!account && (
            <Alert>
              <AlertDescription>
                Connect your wallet to deposit, withdraw, or manage this pool.
              </AlertDescription>
            </Alert>
          )}

          {poolBalanceError && (
            <Alert variant="destructive">
              <AlertDescription>
                Unable to load your pool balance: {poolBalanceError}. The rest
                of the pool data is still available.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="deposit">
            <TabsList
              className={`grid w-full ${isOwner ? "grid-cols-4" : "grid-cols-3"}`}
            >
              <TabsTrigger value="deposit">Deposit</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
              <TabsTrigger value="rewards">Rewards</TabsTrigger>
              {isOwner && (
                <TabsTrigger value="configure">Configure</TabsTrigger>
              )}
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

            <TabsContent value="rewards">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reward preferences</CardTitle>
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

            {isOwner && (
              <TabsContent value="configure" className="space-y-6">
                <Alert>
                  <AlertDescription>
                    You are connected as this pool&apos;s owner. The settings
                    below modify the pool on-chain.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pool parameters</CardTitle>
                    <CardDescription>
                      Update the public details, beneficiaries, and reburn
                      period using the pool&apos;s set_pool_params function.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pool-name">Name</Label>
                      <Input
                        id="pool-name"
                        value={poolName}
                        onChange={(event) => setPoolName(event.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pool-image">Image URL</Label>
                      <Input
                        id="pool-image"
                        type="url"
                        value={poolImage}
                        onChange={(event) => setPoolImage(event.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pool-description">Description</Label>
                      <textarea
                        id="pool-description"
                        value={poolDescription}
                        onChange={(event) =>
                          setPoolDescription(event.target.value)
                        }
                        disabled={submitting}
                        rows={4}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reburn-period">Reburn period (days)</Label>
                      <Input
                        id="reburn-period"
                        type="number"
                        min="0"
                        step="0.01"
                        value={reburnPeriodDays}
                        onChange={(event) =>
                          setReburnPeriodDays(event.target.value)
                        }
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Beneficiaries</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setBeneficiaries((current) => [
                              ...current,
                              { address: "", percentage: 0 },
                            ])
                          }
                          disabled={submitting}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add
                        </Button>
                      </div>
                      {beneficiaries.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No beneficiaries configured.
                        </p>
                      )}
                      {beneficiaries.map((beneficiary, index) => (
                        <div
                          key={index}
                          className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_8rem_auto]"
                        >
                          <Input
                            aria-label={`Beneficiary ${index + 1} address`}
                            placeholder="Beneficiary address"
                            value={beneficiary.address}
                            onChange={(event) =>
                              setBeneficiaries((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, address: event.target.value }
                                    : item
                                )
                              )
                            }
                            disabled={submitting}
                          />
                          <Input
                            aria-label={`Beneficiary ${index + 1} percentage`}
                            type="number"
                            min="0"
                            max="100"
                            step="0.001"
                            placeholder="%"
                            value={beneficiary.percentage / 1000}
                            onChange={(event) =>
                              setBeneficiaries((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        percentage: Math.round(
                                          Number(event.target.value) * 1000
                                        ),
                                      }
                                    : item
                                )
                              )
                            }
                            disabled={submitting}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove beneficiary ${index + 1}`}
                            onClick={() =>
                              setBeneficiaries((current) =>
                                current.filter(
                                  (_, itemIndex) => itemIndex !== index
                                )
                              )
                            }
                            disabled={submitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        Total beneficiary share:{" "}
                        {beneficiaries.reduce(
                          (sum, beneficiary) =>
                            sum + beneficiary.percentage,
                          0
                        ) / 1000}
                        %
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleSavePoolParams}
                      disabled={submitting}
                    >
                      {submitting ? "Saving..." : "Save pool parameters"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Manage reserved KOIN
                    </CardTitle>
                    <CardDescription>
                      Reserved KOIN provides mana for operating the pool and is
                      not burned. Lower reburn periods require more frequent
                      operations, so more reserved KOIN is recommended. As a
                      base reference, use about 2,000 KOIN for a 4-day reburn
                      period.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">
                      <span className="text-muted-foreground">
                        Currently reserved:{" "}
                      </span>
                      {formatAmount(reservedKoin)} KOIN
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="reserved-koin-amount">KOIN amount</Label>
                      <Input
                        id="reserved-koin-amount"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={reservedKoinAmount}
                        onChange={(event) =>
                          setReservedKoinAmount(event.target.value)
                        }
                        disabled={submitting}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        onClick={() => handleReservedKoin("add")}
                        disabled={submitting}
                      >
                        Add reserved KOIN
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReservedKoin("remove")}
                        disabled={submitting}
                      >
                        Remove reserved KOIN
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Register node operator public key
                    </CardTitle>
                    <CardDescription>
                      Register the public key from{" "}
                      <code>.koinos/block_producer/public.key</code>. Also set
                      the <code>producer</code> field in the{" "}
                      <code>block_producer</code> section of your node&apos;s{" "}
                      <code>config.yml</code> to this pool address.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {registeredPublicKey && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Currently registered public key
                        </p>
                        <p className="break-all font-mono text-xs">
                          {registeredPublicKey}
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="public-key">Public key</Label>
                      <Input
                        id="public-key"
                        value={publicKey}
                        onChange={(event) => setPublicKey(event.target.value)}
                        placeholder="Paste the contents of public.key"
                        disabled={submitting}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleRegisterPublicKey}
                      disabled={submitting}
                    >
                      Register public key
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-lg text-destructive">
                      Remove pool
                    </CardTitle>
                    <CardDescription>
                      Remove this pool from the Fogata pool list. This does not
                      delete the deployed pool contract. Enter the pool address
                      to confirm.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      aria-label="Pool address confirmation"
                      value={deleteConfirmation}
                      onChange={(event) =>
                        setDeleteConfirmation(event.target.value)
                      }
                      placeholder={poolId}
                      disabled={submitting}
                    />
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleDeletePool}
                      disabled={
                        submitting || deleteConfirmation !== poolId
                      }
                    >
                      Remove pool from Fogata
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </div>
  );
}
