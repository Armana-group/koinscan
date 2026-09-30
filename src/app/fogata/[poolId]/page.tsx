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
import { Plus, Trash2 } from "lucide-react";

import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import tokenAbi from "@/koinos/abi";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiKoin } from "@/koinos/abis/koin";
import { abiPob } from "@/koinos/abis";
import {
  FOGATA2_LIST_POOLS_CONTRACT_ID,
  KOIN_CONTRACT_ID,
  POB_CONTRACT_ID,
  VHP_CONTRACT_ID,
} from "@/koinos/constants";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletButton } from "@/components/WalletButton";
import { cn } from "@/lib/utils";
import { computePoolApy, estimateEarnings, formatAmountForInput, formatKoinEstimate, formatPayoutPeriod, getNetworkApy, poolHealth, sanitizeDecimalInput } from "@/lib/fogata";
import { AmountField } from "@/components/fogata/AmountField";
import { LineList, LineRow } from "@/components/fogata/LineRow";
import { PoolLogo } from "@/components/fogata/PoolLogo";
import { WordTabs } from "@/components/fogata/WordTabs";
import {
  backLink,
  footnote,
  ghostButton,
  pageWide,
  primaryButton,
  quietLink,
  splitColumns,
} from "@/components/fogata/styles";
import * as toast from "@/lib/toast";

type RewardMode = "percentage" | "virtual";

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
  koinAmount?: number;
  manaPercentage?: number;
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

function formatTokenAmount(amount?: number, symbol = "VHP"): string {
  if (amount === undefined) return "Unavailable";
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B ${symbol}`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M ${symbol}`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K ${symbol}`;
  return `${amount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} ${symbol}`;
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
  const [reservedKoin, setReservedKoin] = useState<string | null>(null);
  const [registeredPublicKey, setRegisteredPublicKey] = useState("");
  const [performance, setPerformance] = useState<PoolPerformance>({});
  const [nextPayment, setNextPayment] = useState<Date | null>(null);

  const [koinDeposit, setKoinDeposit] = useState("");
  const [vhpDeposit, setVhpDeposit] = useState("");
  const [koinWithdraw, setKoinWithdraw] = useState("");
  const [vhpWithdraw, setVhpWithdraw] = useState("");
  const [rewardMode, setRewardMode] = useState<RewardMode>("percentage");
  const [percentageKoin, setPercentageKoin] = useState("100");
  const [allAfterVirtual, setAllAfterVirtual] = useState("");
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

  const [sheet, setSheet] = useState<"deposit" | "withdraw" | "rewards" | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [depositToken, setDepositToken] = useState<"koin" | "vhp">("koin");
  const [withdrawToken, setWithdrawToken] = useState<"koin" | "vhp">("vhp");
  const [networkApy, setNetworkApy] = useState<number | null>(null);

  const openDeposit = () => {
    setKoinDeposit("");
    setVhpDeposit("");
    setDepositToken(
      walletBalances && BigInt(walletBalances.vhp) > BigInt(walletBalances.koin) ? "vhp" : "koin"
    );
    setSheet("deposit");
  };

  const openWithdraw = () => {
    setKoinWithdraw("");
    setVhpWithdraw("");
    setSheet("withdraw");
  };

  useEffect(() => {
    if (!provider) return;
    getNetworkApy(provider)
      .then(setNetworkApy)
      .catch((err) => console.info("Unable to load network APY:", err));
  }, [provider]);

  const poolApy =
    networkApy !== null && poolParams
      ? computePoolApy(networkApy, poolParams.beneficiaries ?? [])
      : null;
  const health = poolHealth(performance);
  const feePercent = (poolParams?.beneficiaries ?? []).reduce(
    (sum, beneficiary) => sum + beneficiary.percentage,
    0
  ) / 1000;
  const stakedVhp = poolBalance
    ? (BigInt(poolBalance.vhp_amount) + BigInt(poolBalance.koin_amount)).toString()
    : null;
  const hasStake = stakedVhp !== null && BigInt(stakedVhp) > BigInt(0);
  const payoutPeriod = formatPayoutPeriod(poolParams?.payment_period);
  const stakeEarnings =
    hasStake && poolApy !== null
      ? estimateEarnings(Number(stakedVhp) / SCALE, poolApy, poolParams?.payment_period)
      : null;
  const depositAmount = Number(depositToken === "koin" ? koinDeposit : vhpDeposit);
  const depositEarnings =
    poolApy !== null && depositAmount > 0 ? estimateEarnings(depositAmount, poolApy) : null;

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
        abi: abiKoin,
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
      await multicall.add(koinContract.functions.balanceOf, {
        owner: poolId,
      });
      await multicall.add(koinContract.functions.get_account_rc, {
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
      const poolKoinResult = results[4] as { value?: string } | Error;
      const poolManaResult = results[5] as { value?: string } | Error;
      const metadataResult = results[6] as
        | { value?: { difficulty?: string } }
        | Error;
      const poolStateResult = results[7] as PoolState | Error;

      if (isMulticallError(paramsResult)) throw paramsResult;
      if (isMulticallError(ownerResult)) throw ownerResult;

      setPoolParams(paramsResult);
      setPoolOwner(ownerResult.value ?? null);
      setReservedKoin(
        isMulticallError(reservedResult) ? null : (reservedResult.value ?? "0")
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
      const koinAmount = isMulticallError(poolKoinResult)
        ? undefined
        : Number(poolKoinResult.value ?? "0") / SCALE;
      const manaAmount = isMulticallError(poolManaResult)
        ? undefined
        : Number(poolManaResult.value ?? "0") / SCALE;
      const manaPercentage =
        manaAmount !== undefined &&
        koinAmount !== undefined &&
        koinAmount > 0
          ? (manaAmount * 100) / koinAmount
          : undefined;
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
        koinAmount,
        manaPercentage: Number.isFinite(manaPercentage)
          ? manaPercentage
          : undefined,
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
        const koinResult = results[8] as { value?: string } | Error;
        const vhpResult = results[9] as { value?: string } | Error;
        const preferencesResult = results[10] as
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
          (preferencesResult.percentage_koin !== undefined ||
            preferencesResult.all_after_virtual !== undefined)
        ) {
          const prefs = {
            percentage_koin: preferencesResult.percentage_koin ?? "0",
            all_after_virtual: preferencesResult.all_after_virtual ?? "0",
          };
          setPreferences(prefs);
          if (BigInt(prefs.all_after_virtual || "0") > BigInt(0)) {
            setRewardMode("virtual");
            const virtualAmount = Number(prefs.all_after_virtual) / SCALE;
            setAllAfterVirtual(
              Number.isFinite(virtualAmount) ? String(virtualAmount) : ""
            );
            setPercentageKoin("0");
          } else {
            setRewardMode("percentage");
            setPercentageKoin(String(Number(prefs.percentage_koin) / 1000));
            setAllAfterVirtual("");
          }
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
      setSheet(null);
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
      setSheet(null);
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
      const amount = toBaseUnits(allAfterVirtual);
      if (amount === "0") {
        toast.error("Enter a VHP amount to keep");
        return;
      }
      all_after_virtual = amount;
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
      const { transaction, receipt } =
        await poolContract.functions.set_collect_koin_preferences({
          account: userAccount,
          percentage_koin,
          all_after_virtual,
        });
      if (receipt?.reverted) {
        throw new Error("Transaction reverted");
      }
      await transaction?.wait();
      toast.dismiss(loadingToast);
      toast.success("Preferences saved");
      setSheet(null);
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
    if (action === "remove" && reservedKoin === null) {
      toast.error("Couldn't read the pool's reserved KOIN. Reload and try again.");
      return;
    }
    if (action === "remove" && reservedKoin !== null && BigInt(amount) > BigInt(reservedKoin)) {
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

  const healthWord = health === "producing" ? "Producing" : health === "late" ? "Producing slowly" : "Paused";
  const healthDot = (
    <span
      aria-label={healthWord}
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        health === "producing" && "bg-emerald-500",
        health === "late" && "bg-amber-500",
        health === "paused" && "bg-red-500"
      )}
    />
  );

  return (
    <div className={pageWide}>
      <Link href="/fogata" className={backLink}>
        ‹ Fogata
      </Link>

      {loading && (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-12 w-56" />
        </div>
      )}

      {error && !loading && (
        <div>
          <h1 className="break-all font-mono text-lg">{poolId}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Couldn&apos;t load this pool.{" "}
            <button type="button" className={quietLink} onClick={() => loadData()}>
              Retry
            </button>
          </p>
        </div>
      )}

      {!loading && !error && poolParams && (
        <>
          <div className={splitColumns}>
            <div>
              <header className="flex items-center gap-4">
                <PoolLogo poolId={poolId} name={poolParams.name} image={poolParams.image} size={44} className="h-11 w-11 rounded-[13px] text-base" />
                <div className="min-w-0">
                  <h1 className="flex items-center gap-2.5 text-[22px] font-semibold leading-tight tracking-[-0.02em]">
                    <span className="truncate">{poolParams.name || "Unnamed pool"}</span>
                    {healthDot}
                  </h1>
                  <p className="text-[13px] text-muted-foreground">
                    {healthWord}
                    {health === "paused" && performance.lastBlockTime && (
                      <> · last block {formatTimeAgo(performance.lastBlockTime)}</>
                    )}
                    {poolApy !== null && <> · {poolApy.toFixed(1)}% yield</>}
                    {isOwner && (
                      <>
                        {" "}·{" "}
                        <button
                          type="button"
                          className={quietLink}
                          onClick={() => setManageOpen(true)}
                        >
                          Manage
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </header>

              <section className="mt-12" aria-label={account && hasStake ? "Your stake" : "Estimated yearly yield"}>
                {!account && (
                  <>
                    <p className="text-xs text-muted-foreground">Estimated yearly yield</p>
                    <p className="mt-1.5 text-[56px] font-semibold leading-none tracking-[-0.05em] tabular-nums max-sm:text-[44px]">
                      {poolApy !== null ? poolApy.toFixed(1) : <span className="font-normal text-muted-foreground/40">—</span>}
                      <span className="ml-2 text-lg font-medium tracking-normal text-muted-foreground">%</span>
                    </p>
                    <div className="mt-7 flex">
                      <WalletButton connectLabel="Connect wallet" connectClassName={cn(primaryButton, "w-auto")} />
                    </div>
                  </>
                )}

                {account && !hasStake && (
                  <>
                    <p className="text-xs text-muted-foreground">Estimated yearly yield</p>
                    <p className="mt-1.5 text-[56px] font-semibold leading-none tracking-[-0.05em] tabular-nums max-sm:text-[44px]">
                      {poolApy !== null ? poolApy.toFixed(1) : <span className="font-normal text-muted-foreground/40">—</span>}
                      <span className="ml-2 text-lg font-medium tracking-normal text-muted-foreground">%</span>
                    </p>
                    <p className="mt-2.5 text-[13px] text-muted-foreground">You have nothing staked here.</p>
                    <div className="mt-7 flex">
                      <button type="button" className={cn(primaryButton, "w-auto")} onClick={openDeposit}>
                        Deposit
                      </button>
                    </div>
                  </>
                )}

                {account && hasStake && (
                  <>
                    <p className="text-xs text-muted-foreground">Your stake</p>
                    <p className="mt-1.5 text-[56px] font-semibold leading-none tracking-[-0.05em] tabular-nums max-sm:text-[44px]">
                      {formatAmount(stakedVhp!)}
                      <span className="ml-2 text-lg font-medium tracking-normal text-muted-foreground">VHP</span>
                    </p>
                    {stakeEarnings && (
                      <p className="mt-3 text-[15px] tabular-nums">
                        ≈ {formatKoinEstimate(stakeEarnings.yearly)} KOIN a year
                        <span className="text-muted-foreground">
                          {stakeEarnings.perPayout !== null && payoutPeriod !== "—" && (
                            <> · about {formatKoinEstimate(stakeEarnings.perPayout)} KOIN {payoutPeriod.toLowerCase()}</>
                          )}
                          {" "}at {poolApy!.toFixed(1)}%
                        </span>
                      </p>
                    )}
                    <p className="mt-2.5 text-[13px] text-muted-foreground">
                      {poolBalance && BigInt(poolBalance.koin_amount) > BigInt(0) && (
                        <>includes {formatAmount(poolBalance.koin_amount)} KOIN being converted · </>
                      )}
                      {nextPayment && <>next payout {formatTimeAgo(nextPayment)} · </>}
                      rewards{" "}
                      {preferences && BigInt(preferences.all_after_virtual || "0") > BigInt(0)
                        ? `keep ${formatAmount(preferences.all_after_virtual)} VHP`
                        : preferences && Number(preferences.percentage_koin) === 0
                          ? "kept as VHP"
                          : preferences
                            ? `${Number(preferences.percentage_koin) / 1000}% as KOIN`
                            : "—"}{" "}
                      ·{" "}
                      <button type="button" className={quietLink} onClick={() => setSheet("rewards")}>
                        change
                      </button>
                    </p>
                    <div className="mt-7 flex items-center gap-2.5">
                      <button type="button" className={cn(primaryButton, "w-auto")} onClick={openDeposit}>
                        Deposit
                      </button>
                      <button type="button" className={cn(ghostButton, "w-auto")} onClick={openWithdraw}>
                        Withdraw
                      </button>
                    </div>
                  </>
                )}
                {poolBalanceError && account && (
                  <p className="mt-3 text-xs text-muted-foreground">Couldn&apos;t load your balance in this pool.</p>
                )}
              </section>
            </div>
            <div>
              <section className="mt-14 lg:mt-0">
                <h2 className="text-xs font-normal text-muted-foreground">About this pool</h2>
                {poolParams.description && (
                  <p className="mt-2 mb-4 max-w-[60ch] whitespace-pre-line break-words text-[13px] leading-relaxed text-muted-foreground">{poolParams.description}</p>
                )}
                <LineList className={poolParams.description ? "" : "mt-2"}>
                  <LineRow label="Effectiveness">
                    <span className="inline-flex items-center gap-2 tabular-nums">{healthDot}{performance.effectiveness !== undefined ? `${performance.effectiveness.toFixed(0)}%` : "—"}</span>
                  </LineRow>
                  <LineRow label="Block time">
                    <span className="tabular-nums">
                      {formatDuration(performance.averageTimeToProduce)}
                      {performance.expectedTimeToProduce !== undefined && <span className="ml-2 text-muted-foreground">expected {formatDuration(performance.expectedTimeToProduce)}</span>}
                    </span>
                  </LineRow>
                  {performance.lastBlockHeight !== undefined ? (
                    <LineRow label="Last block" href={`/blocks/${performance.lastBlockHeight}`}>
                      <span className="tabular-nums">
                        #{performance.lastBlockHeight}
                        {performance.lastBlockTime && <span className="text-muted-foreground"> · {formatTimeAgo(performance.lastBlockTime)}</span>}
                      </span>
                    </LineRow>
                  ) : (
                    <LineRow label="Last block">—</LineRow>
                  )}
                  <LineRow label="Staked in pool"><span className="tabular-nums">{formatTokenAmount(performance.vhpAmount, "VHP")}</span></LineRow>
                  <LineRow label="Fee"><span className="tabular-nums">{feePercent}%</span></LineRow>
                  <LineRow label="Payout">{formatPayoutPeriod(poolParams.payment_period)}</LineRow>
                  <LineRow label="Next payout">{nextPayment ? formatTimeAgo(nextPayment) : "—"}</LineRow>
                  <LineRow label="Address" href={`/address/${poolId}`}>
                    <span className="font-mono text-xs">{poolId.slice(0, 8)}…{poolId.slice(-6)}</span>
                  </LineRow>
                  <LineRow label="Contract" href={`/contracts/${poolId}`}>Fogata Pool v2</LineRow>
                  <LineRow label="Trade" href="/fogata/trade">Sell VHP for KOIN</LineRow>
                </LineList>
              </section>

              <section className="mt-10">
                <h2 className="text-xs font-normal text-muted-foreground">Pool account</h2>
                <LineList className="mt-2">
                  <LineRow label="KOIN balance"><span className="tabular-nums">{formatTokenAmount(performance.koinAmount, "KOIN")}</span></LineRow>
                  <LineRow label="Mana">
                    <span className="tabular-nums">{performance.manaPercentage !== undefined ? `${performance.manaPercentage.toFixed(1)}%` : "—"}</span>
                  </LineRow>
                  <LineRow label="Reserved KOIN">
                    <span className="tabular-nums">{reservedKoin !== null ? formatTokenAmount(Number(reservedKoin) / SCALE, "KOIN") : "—"}</span>
                  </LineRow>
                </LineList>
                <p className={cn(footnote, "mt-2.5")}>
                  Withdrawals use the pool&apos;s mana. If mana is low a withdrawal can fail; mana recovers
                  over time, so try again later.
                </p>
              </section>
            </div>
          </div>

          <Dialog open={sheet === "deposit"} onOpenChange={(open) => { if (!open && !submitting) setSheet(null); }}>
            <DialogContent className="rounded-[22px] p-7 sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-xl tracking-[-0.02em]">Deposit to {poolParams.name || "this pool"}</DialogTitle>
              </DialogHeader>
              <WordTabs
                size="md"
                ariaLabel="Token"
                value={depositToken}
                disabled={submitting}
                options={[
                  { value: "koin", label: "KOIN" },
                  { value: "vhp", label: "VHP" },
                ]}
                onChange={(token) => {
                  setDepositToken(token);
                  setKoinDeposit("");
                  setVhpDeposit("");
                }}
              />
              <div className="mt-4">
                <AmountField
                  id={depositToken === "koin" ? "koin-deposit" : "vhp-deposit"}
                  size="md"
                  label="Amount"
                  unit={depositToken.toUpperCase()}
                  value={depositToken === "koin" ? koinDeposit : vhpDeposit}
                  onChange={(value) => (depositToken === "koin" ? setKoinDeposit(value) : setVhpDeposit(value))}
                  disabled={submitting}
                  onMax={() =>
                    depositToken === "koin"
                      ? setKoinDeposit(formatAmountForInput(walletBalances!.koin))
                      : setVhpDeposit(formatAmountForInput(walletBalances!.vhp))
                  }
                  maxDisabled={!walletBalances}
                  autoFocus
                />
              </div>
              <div className={cn(footnote, "flex justify-between tabular-nums")}>
                <span>
                  Wallet {walletBalances ? formatAmount(depositToken === "koin" ? walletBalances.koin : walletBalances.vhp) : "—"} {depositToken.toUpperCase()}
                </span>
                {depositEarnings ? (
                  <span>≈ {formatKoinEstimate(depositEarnings.yearly)} KOIN a year</span>
                ) : (
                  poolApy !== null && <span>≈ {poolApy.toFixed(1)}% yearly</span>
                )}
              </div>
              {depositToken === "koin" && formatPayoutPeriod(poolParams.payment_period) !== "—" && (
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  Your KOIN is staked as VHP to produce blocks. {formatPayoutPeriod(poolParams.payment_period)} the
                  pool pays your share in small KOIN payments, or stakes it again, depending on your reward
                  setting. To get out faster, sell VHP on{" "}
                  <Link href="/fogata/trade" className={quietLink}>Trade</Link>.
                </p>
              )}
              <button
                type="button"
                className={cn(primaryButton, "mt-3")}
                onClick={handleStake}
                disabled={!account || submitting || !(Number(depositToken === "koin" ? koinDeposit : vhpDeposit) > 0)}
              >
                {submitting
                  ? "Submitting…"
                  : `Deposit ${depositToken === "koin" ? koinDeposit || "0" : vhpDeposit || "0"} ${depositToken.toUpperCase()}`}
              </button>
            </DialogContent>
          </Dialog>

          <Dialog open={sheet === "withdraw"} onOpenChange={(open) => { if (!open && !submitting) setSheet(null); }}>
            <DialogContent className="rounded-[22px] p-7 sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-xl tracking-[-0.02em]">Withdraw from {poolParams.name || "this pool"}</DialogTitle>
              </DialogHeader>
              <WordTabs
                size="md"
                ariaLabel="Token"
                value={withdrawToken}
                disabled={submitting}
                options={[
                  { value: "vhp", label: "VHP" },
                  { value: "koin", label: "KOIN" },
                ]}
                onChange={(token) => {
                  setWithdrawToken(token);
                  setKoinWithdraw("");
                  setVhpWithdraw("");
                }}
              />
              <div className="mt-4">
                <AmountField
                  id={withdrawToken === "koin" ? "koin-withdraw" : "vhp-withdraw"}
                  size="md"
                  label="Amount"
                  unit={withdrawToken.toUpperCase()}
                  value={withdrawToken === "koin" ? koinWithdraw : vhpWithdraw}
                  onChange={(value) => (withdrawToken === "koin" ? setKoinWithdraw(value) : setVhpWithdraw(value))}
                  disabled={submitting}
                  onMax={() =>
                    withdrawToken === "koin"
                      ? setKoinWithdraw(formatAmountForInput(poolBalance!.koin_amount))
                      : setVhpWithdraw(formatAmountForInput(poolBalance!.vhp_amount))
                  }
                  maxDisabled={!poolBalance}
                  autoFocus
                />
              </div>
              <p className={cn(footnote, "tabular-nums")}>
                In pool {poolBalance ? formatAmount(withdrawToken === "koin" ? poolBalance.koin_amount : poolBalance.vhp_amount) : "—"} {withdrawToken.toUpperCase()}
              </p>
              <button
                type="button"
                className={cn(primaryButton, "mt-3")}
                onClick={handleUnstake}
                disabled={!account || submitting || !(Number(withdrawToken === "koin" ? koinWithdraw : vhpWithdraw) > 0)}
              >
                {submitting
                  ? "Submitting…"
                  : `Withdraw ${withdrawToken === "koin" ? koinWithdraw || "0" : vhpWithdraw || "0"} ${withdrawToken.toUpperCase()}`}
              </button>
            </DialogContent>
          </Dialog>

          <Dialog open={sheet === "rewards"} onOpenChange={(open) => { if (!open && !submitting) setSheet(null); }}>
            <DialogContent className="rounded-[22px] p-7 sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-xl tracking-[-0.02em]">Reward settings</DialogTitle>
                <DialogDescription>Rewards are paid in KOIN. Choose what the pool does with them.</DialogDescription>
              </DialogHeader>
              <RadioGroup
                value={rewardMode}
                onValueChange={(value) =>
                  setRewardMode(value as RewardMode)
                }
                disabled={!account || submitting}
                className="mt-2 gap-0 border-t border-border"
              >
                <div className="border-b border-border py-4">
                  <div className="flex items-center gap-2.5">
                    <RadioGroupItem value="percentage" id="reward-percentage" />
                    <Label htmlFor="reward-percentage" className="text-sm font-medium">
                      Take a share as KOIN
                    </Label>
                  </div>
                  <div className={cn("mt-3 pl-[26px] transition-opacity", rewardMode !== "percentage" && "opacity-40")}>
                    <div className="flex items-baseline gap-2 border-b border-border pb-2 focus-within:border-foreground">
                      <input
                        id="percentage-koin"
                        type="text"
                        inputMode="decimal"
                        aria-label="Percentage of rewards taken as KOIN"
                        className="w-full min-w-0 bg-transparent text-2xl font-semibold tracking-[-0.03em] tabular-nums outline-none placeholder:text-muted-foreground/50"
                        placeholder="0"
                        value={percentageKoin}
                        onChange={(e) => setPercentageKoin(sanitizeDecimalInput(e.target.value))}
                        disabled={
                          !account ||
                          submitting ||
                          rewardMode !== "percentage"
                        }
                      />
                      <span className="text-sm font-medium text-muted-foreground">%</span>
                    </div>
                    <p className={cn(footnote, "mt-2")}>
                      Keep this percentage of earned KOIN and burn the rest
                      into VHP.
                      {preferences &&
                        BigInt(preferences.all_after_virtual || "0") ===
                          BigInt(0) && (
                          <>
                            {" "}
                            Current:{" "}
                            {Number(preferences.percentage_koin) / 1000}%
                          </>
                        )}
                    </p>
                  </div>
                </div>

                <div className="border-b border-border py-4">
                  <div className="flex items-center gap-2.5">
                    <RadioGroupItem value="virtual" id="reward-virtual" />
                    <Label htmlFor="reward-virtual" className="text-sm font-medium">
                      Keep a VHP amount, take the rest as KOIN
                    </Label>
                  </div>
                  <div className={cn("mt-3 pl-[26px] transition-opacity", rewardMode !== "virtual" && "opacity-40")}>
                    <div className="flex items-baseline gap-2 border-b border-border pb-2 focus-within:border-foreground">
                      <input
                        id="all-after-virtual"
                        type="text"
                        inputMode="decimal"
                        aria-label="VHP to keep"
                        className="w-full min-w-0 bg-transparent text-2xl font-semibold tracking-[-0.03em] tabular-nums outline-none placeholder:text-muted-foreground/50"
                        placeholder="0"
                        value={allAfterVirtual}
                        onChange={(e) => setAllAfterVirtual(sanitizeDecimalInput(e.target.value))}
                        disabled={
                          !account || submitting || rewardMode !== "virtual"
                        }
                      />
                      <span className="text-sm font-medium text-muted-foreground">VHP</span>
                    </div>
                    <p className={cn(footnote, "mt-2")}>
                      Keep this amount of VHP and burn anything above it.
                      {preferences &&
                        BigInt(preferences.all_after_virtual || "0") >
                          BigInt(0) && (
                          <>
                            {" "}
                            Current:{" "}
                            {formatAmount(preferences.all_after_virtual)}{" "}
                            VHP
                          </>
                        )}
                    </p>
                  </div>
                </div>
              </RadioGroup>
              <button
                type="button"
                className={cn(primaryButton, "mt-3")}
                onClick={handleSavePreferences}
                disabled={!account || submitting}
              >
                {submitting ? "Saving…" : "Save"}
              </button>
            </DialogContent>
          </Dialog>

          {isOwner && (
            <Dialog open={manageOpen} onOpenChange={(open) => { if (!open && !submitting) setManageOpen(false); }}>
              <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[22px] p-7 sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle className="text-xl tracking-[-0.02em]">Manage {poolParams.name || "this pool"}</DialogTitle>
                  <DialogDescription>Only the pool owner sees these settings.</DialogDescription>
                </DialogHeader>
                <div className="space-y-10">
                  <section className="border-t border-border pt-5">
                    <h3 className="text-base font-semibold tracking-[-0.01em]">Pool parameters</h3>
                    <p className={cn(footnote, "mt-1")}>
                      Update the public details, beneficiaries, and reburn
                      period using the pool&apos;s set_pool_params function.
                    </p>
                    <div className="mt-5 space-y-4">
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
                        <p className={footnote}>Direct HTTPS image: PNG, JPEG, WebP or GIF, up to 2 MB and 16 megapixels. Logos appear as static thumbnails. SVG and redirect links aren&apos;t supported.</p>
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
                          type="text"
                          inputMode="decimal"
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
                              type="text"
                              inputMode="decimal"
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

                      <button
                        type="button"
                        className={primaryButton}
                        onClick={handleSavePoolParams}
                        disabled={submitting}
                      >
                        {submitting ? "Saving…" : "Save pool parameters"}
                      </button>
                    </div>
                  </section>

                  <section className="border-t border-border pt-5">
                    <h3 className="text-base font-semibold tracking-[-0.01em]">Reserved KOIN</h3>
                    <p className={cn(footnote, "mt-1")}>
                      Reserved KOIN provides mana for operating the pool and is
                      not burned. Lower reburn periods require more frequent
                      operations, so more reserved KOIN is recommended. As a
                      base reference, use about 2,000 KOIN for a 4-day reburn
                      period.
                    </p>
                    <div className="mt-5 space-y-4">
                      <p className="text-sm">
                        <span className="text-muted-foreground">
                          Currently reserved:{" "}
                        </span>
                        {reservedKoin !== null ? `${formatAmount(reservedKoin)} KOIN` : "—"}
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="reserved-koin-amount">KOIN amount</Label>
                        <Input
                          id="reserved-koin-amount"
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={reservedKoinAmount}
                          onChange={(event) =>
                            setReservedKoinAmount(event.target.value)
                          }
                          disabled={submitting}
                        />
                      </div>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <button
                          type="button"
                          className={primaryButton}
                          onClick={() => handleReservedKoin("add")}
                          disabled={submitting}
                        >
                          Add reserved KOIN
                        </button>
                        <button
                          type="button"
                          className={ghostButton}
                          onClick={() => handleReservedKoin("remove")}
                          disabled={submitting}
                        >
                          Remove reserved KOIN
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="border-t border-border pt-5">
                    <h3 className="text-base font-semibold tracking-[-0.01em]">Node operator public key</h3>
                    <p className={cn(footnote, "mt-1")}>
                      Register the public key from{" "}
                      <code>.koinos/block_producer/public.key</code>. Also set
                      the <code>producer</code> field in the{" "}
                      <code>block_producer</code> section of your node&apos;s{" "}
                      <code>config.yml</code> to this pool address.
                    </p>
                    <div className="mt-5 space-y-4">
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
                      <button
                        type="button"
                        className={primaryButton}
                        onClick={handleRegisterPublicKey}
                        disabled={submitting}
                      >
                        Register public key
                      </button>
                    </div>
                  </section>

                  <details className="border-t border-border pt-4">
                    <summary className="cursor-pointer list-none text-sm text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">Danger zone ›</summary>
                    <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                      <p>Removing the pool delists it from Fogata. Stakers keep their funds and can still withdraw. Enter the pool address to confirm.</p>
                      <Input
                        aria-label="Pool address confirmation"
                        value={deleteConfirmation}
                        onChange={(event) => setDeleteConfirmation(event.target.value)}
                        placeholder={poolId}
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        className={cn(ghostButton, "w-auto border-destructive/60 text-destructive hover:bg-destructive/10")}
                        onClick={handleDeletePool}
                        disabled={submitting || deleteConfirmation !== poolId}
                      >
                        Remove from Fogata list
                      </button>
                    </div>
                  </details>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </div>
  );
}
