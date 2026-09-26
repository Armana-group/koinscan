"use client";

import { Contract, Multicall, Signer, utils } from "koilib";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownUp, ChevronRight, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWallet } from "@/contexts/WalletContext";
import { FOGATA2_LIST_POOLS_CONTRACT_ID, POB_CONTRACT_ID, KOIN_CONTRACT_ID, VHP_CONTRACT_ID } from "@/koinos/constants";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { useEffect, useState } from "react";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import { abiPob } from "@/koinos/abis";
import { computePoolApy, formatCompactVhp, getNetworkStaking, summarizeFogata, type NetworkStaking } from "@/lib/fogata";
import { HowItWorks } from "@/components/fogata/HowItWorks";
import { PoolLogo } from "@/components/fogata/PoolLogo";
import { ShareBar } from "@/components/fogata/ShareBar";
import { pageColumn, pageTitle, quietLink } from "@/components/fogata/styles";
import * as toast from "@/lib/toast";

const listRow =
  "-mx-3 flex items-center gap-4 rounded-xl px-3 py-[18px] transition-colors hover:bg-muted/50";

interface Pool {
  account: string;
  name: string;
  image: string;
  description: string;
  beneficiaries: {
    address: string;
    percentage: number;
  }[];
  payment_period: string;
  submission_time: string;
  approval_time: string;
  /** VHP held by the pool, in whole VHP; undefined when the read failed. */
  vhp?: number;
}

interface Beneficiary {
  address: string;
  percentage: number;
}

const KOIN_DECIMALS = 8;
const KOIN_SCALE = 10 ** KOIN_DECIMALS;

function toBaseUnits(amount: string): string {
  const value = parseFloat(amount);
  if (Number.isNaN(value) || value <= 0) return "0";
  return Math.floor(value * KOIN_SCALE).toString();
}

export default function FogataPage() {
  const router = useRouter();
  const { provider, signer, savedAddress } = useWallet();
  const account = signer?.getAddress() ?? savedAddress ?? null;
  const [pools, setPools] = useState<Pool[]>([]);
  const [network, setNetwork] = useState<NetworkStaking | null>(null);
  const networkApy = network?.apy ?? null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [poolImage, setPoolImage] = useState("");
  const [poolDescription, setPoolDescription] = useState("");
  const [reburnPeriodDays, setReburnPeriodDays] = useState("4");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [reservedKoinAmount, setReservedKoinAmount] = useState("2000");
  const [publicKey, setPublicKey] = useState("");

  const handleCreatePool = async () => {
    if (!account || !signer || !provider) {
      toast.error("Connect your wallet to create a pool");
      return;
    }

    const days = Number(reburnPeriodDays);
    const totalBeneficiaryPercentage = beneficiaries.reduce(
      (sum, beneficiary) => sum + beneficiary.percentage,
      0
    );
    const reservedKoinBaseUnits = toBaseUnits(reservedKoinAmount);
    const normalizedPublicKey = publicKey.trim();
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
    if (reservedKoinBaseUnits === "0") {
      toast.error("Enter a reserved KOIN amount greater than zero");
      return;
    }
    if (!normalizedPublicKey) {
      toast.error("Enter the node operator public key");
      return;
    }

    setCreating(true);
    let activeToast = toast.loading("Preparing pool deployment...");
    try {
      const bytecodeResponse = await fetch("/miningpool.wasm");
      if (!bytecodeResponse.ok) {
        throw new Error("Failed to load mining pool bytecode");
      }
      const bytecode = new Uint8Array(await bytecodeResponse.arrayBuffer());
      const contractSigner = new Signer({
        privateKey: crypto.getRandomValues(new Uint8Array(32)),
        provider,
      });
      const poolContract = new Contract({
        signer: contractSigner,
        provider,
        abi: abiFogata2Pool,
        bytecode,
      });
      const poolAddress = poolContract.getId();
      const listContract = new Contract({
        id: FOGATA2_LIST_POOLS_CONTRACT_ID,
        provider,
        abi: abiFogata2ListPools,
      });
      const koinContract = new Contract({
        id: KOIN_CONTRACT_ID,
        provider,
        abi: utils.tokenAbi,
      });
      const pobContract = new Contract({
        id: POB_CONTRACT_ID,
        provider,
        abi: abiPob,
      });

      const [
        { operation: setOwnerOperation },
        { operation: setParamsOperation },
        { operation: startOperation },
        { operation: submitOperation },
        { operation: approveReservedOperation },
        { operation: addReservedOperation },
        { operation: registerPublicKeyOperation },
      ] = await Promise.all([
        poolContract.functions.set_owner(
          { value: account },
          { onlyOperation: true }
        ),
        poolContract.functions.set_pool_params(
          {
            name: poolName.trim(),
            image: poolImage.trim(),
            description: poolDescription.trim(),
            beneficiaries: beneficiaries.map((beneficiary) => ({
              address: beneficiary.address.trim(),
              percentage: beneficiary.percentage,
            })),
            payment_period: String(Math.round(days * 86_400_000)),
          },
          { onlyOperation: true }
        ),
        poolContract.functions.reburn_and_snapshot(
          {},
          { onlyOperation: true }
        ),
        listContract.functions.submit_pool(
          { value: poolAddress },
          { onlyOperation: true }
        ),
        koinContract.functions.approve(
          {
            owner: account,
            spender: poolAddress,
            value: reservedKoinBaseUnits,
          },
          { onlyOperation: true }
        ),
        poolContract.functions.add_reserved_koin(
          { account, koin_amount: reservedKoinBaseUnits },
          { onlyOperation: true }
        ),
        pobContract.functions.register_public_key(
          {
            producer: poolAddress,
            public_key: normalizedPublicKey,
          },
          { onlyOperation: true }
        ),
      ]);

      toast.dismiss(activeToast);
      activeToast = toast.loading(
        "Approve the deployment in your wallet..."
      );
      const { transaction, receipt } = await poolContract.deploy({
        abi: JSON.stringify(abiFogata2Pool),
        authorizesCallContract: true,
        authorizesUploadContract: true,
        payer: account,
        nextOperations: [
          submitOperation,
          setOwnerOperation,
          setParamsOperation,
          startOperation,
          approveReservedOperation,
          addReservedOperation,
          registerPublicKeyOperation,
        ],
        beforeSend: async (transactionToSign) => {
          await signer.signTransaction(transactionToSign, {
            [poolAddress]: abiFogata2Pool,
            [FOGATA2_LIST_POOLS_CONTRACT_ID]: abiFogata2ListPools,
            [KOIN_CONTRACT_ID]: utils.tokenAbi,
            [POB_CONTRACT_ID]: abiPob,
          });
        },
      });
      if (receipt?.reverted) throw new Error("Transaction reverted");
      await transaction?.wait();
      toast.dismiss(activeToast);
      toast.success("Mining pool deployed and submitted");
      setCreateOpen(false);
      router.push(`/dapps/fogata/${poolAddress}`);
    } catch (err) {
      toast.dismiss(activeToast);
      toast.error(err instanceof Error ? err.message : "Pool deployment failed");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const fetchPools = async () => {
      if (!provider) return;

      setLoading(true);
      setError(null);

      try {
        const listPoolsContract = new Contract({
          id: FOGATA2_LIST_POOLS_CONTRACT_ID,
          provider,
          abi: abiFogata2ListPools,
        });

        const { result: listPoolsResult } = await listPoolsContract.functions.get_pools({
          start: "", // Empty to start from beginning
          limit: 100, // Get up to 100 pools
          direction: 0, // ascending
        });

        const listed: { account: string }[] = listPoolsResult?.value ?? [];
        const poolContracts = listed.map((pool) => new Contract({
          id: pool.account,
          provider,
          abi: abiFogata2Pool,
        }));
        const vhpContract = new Contract({ id: VHP_CONTRACT_ID, provider, abi: utils.tokenAbi });
        const multicall = new Multicall({
          provider,
          contracts: [...poolContracts, vhpContract],
        });
        for (const contract of poolContracts) {
          await multicall.add(contract.functions.get_pool_params, {});
        }
        // One VHP balance per pool, appended after the params so the two
        // halves of the result line up by index.
        for (const pool of listed) {
          await multicall.add(vhpContract.functions.balanceOf, { owner: pool.account });
        }
        const results = await multicall.call();
        const poolParams = listed.map((pool, i) => {
          const balance = results[listed.length + i];
          const vhp =
            balance instanceof Error || balance?.value === undefined
              ? undefined
              : Number(balance.value) / 1e8;
          return { ...results[i], ...pool, vhp } as Pool;
        });
        setPools(poolParams);
        setNetwork(await getNetworkStaking(provider));
      } catch (err) {
        console.error("Error fetching pools:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch pools");
      } finally {
        setLoading(false);
      }
    };

    fetchPools();
  }, [provider, reloadKey]);

  const summary = summarizeFogata(pools.map((pool) => pool.vhp), network?.vhpProducing);

  return (
    <div className={pageColumn}>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <h1 className={pageTitle}>Fogata</h1>
        <HowItWorks>
          <p>
            Fogata pools run Koinos nodes for you. Stake KOIN with a pool and earn a share of the
            block rewards without running a node yourself.
          </p>
          <ol className="list-decimal space-y-1.5 pl-5 marker:text-muted-foreground">
            <li>
              <span className="text-foreground">Connect a Kondor wallet</span> that holds KOIN.
            </li>
            <li>
              <span className="text-foreground">Pick a pool.</span> The list is sorted by estimated
              yearly yield, after each pool&apos;s fee.
            </li>
            <li>
              <span className="text-foreground">Deposit.</span> Your KOIN is staked as VHP and starts
              producing blocks.
            </li>
            <li>
              <span className="text-foreground">Get paid.</span> Every payout period the pool pays your
              share in KOIN, or stakes it again. Your reward setting on the pool decides which.
            </li>
            <li>
              <span className="text-foreground">Get your KOIN back.</span> Producing slowly turns VHP
              back into KOIN, so with rewards set to KOIN your stake returns over time. For a quicker
              way out, sell VHP on{" "}
              <Link href="/fogata/trade" className={quietLink}>Trade</Link>; pools fill orders there
              before they burn any KOIN.
            </li>
          </ol>
        </HowItWorks>
        <HowItWorks label="What's new in v2">
          <ul className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground">
            <li>
              A built-in order book, <Link href="/fogata/trade" className={quietLink}>Trade</Link>.
              Pools buy VHP there when the price is good and only burn the KOIN they can&apos;t trade.
            </li>
            <li>You can sell VHP straight from your stake, and it keeps earning until the order fills.</li>
            <li>No more Vapor token. The Koinos Fund System now covers what it was for.</li>
            <li>Pools are listed automatically once their contract fingerprint is verified, with no manual approval.</li>
            <li>One shared bot triggers payouts for every pool, so owners no longer run their own.</li>
          </ul>
          <p>
            v1 pools remain at{" "}
            <a href="https://fogata.io" target="_blank" rel="noopener noreferrer" className={quietLink}>fogata.io</a>.
          </p>
        </HowItWorks>

        {!loading && !error && pools.length > 0 && (
          <p className="mt-6 text-[13px] text-muted-foreground tabular-nums">
            <span className="text-foreground">{formatCompactVhp(summary.totalStaked)} VHP</span> staked across{" "}
            {pools.length === 1 ? "one pool" : `${pools.length} pools`}
            {summary.share !== null && (
              <>
                {" "}· <span className="text-foreground">{summary.share.toFixed(1)}%</span> of network production
              </>
            )}
          </p>
        )}
        {!loading && !error && pools.length > 0 && network && network.vhpProducing > 0 && (
          <ShareBar
            className="mt-4"
            remainderLabel="Rest of network"
            segments={[...pools]
              .filter((pool) => pool.vhp !== undefined && pool.vhp > 0)
              .sort((a, b) => (b.vhp ?? 0) - (a.vhp ?? 0))
              .map((pool) => ({
                label: pool.name || "Unnamed pool",
                share: ((pool.vhp ?? 0) * 100) / network.vhpProducing,
                detail: `${formatCompactVhp(pool.vhp ?? 0)} VHP`,
              }))}
          />
        )}

        <ul className="mt-8 border-t border-border">
          <li className="border-b border-border">
            <Link href="/fogata/trade" className={listRow}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-foreground">
                <ArrowDownUp className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">Trade</span>
                <span className="block truncate text-[12.5px] text-muted-foreground">Sell VHP for KOIN, or buy VHP</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" aria-hidden />
            </Link>
          </li>
        </ul>

        {loading && (
          <ul aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-4 border-b border-border py-[18px]">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-14" />
              </li>
            ))}
          </ul>
        )}

        {error && !loading && (
          <p className="mt-6 text-sm text-muted-foreground">
            Couldn&apos;t load pools.{" "}
            <button type="button" className={quietLink} onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          </p>
        )}

        {!loading && !error && pools.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">No pools are listed yet.</p>
        )}

        {!loading && !error && pools.length > 0 && (
          <ul>
            {[...pools]
              .map((pool) => ({
                pool,
                apy:
                  networkApy !== null
                    ? computePoolApy(networkApy, pool.beneficiaries ?? [])
                    : null,
              }))
              .sort((a, b) => (b.apy ?? -1) - (a.apy ?? -1) || a.pool.name.localeCompare(b.pool.name))
              .map(({ pool, apy }) => (
                <li key={pool.account} className="border-b border-border">
                  <Link href={`/fogata/${pool.account}`} className={listRow}>
                    <PoolLogo name={pool.name} image={pool.image} size={40} className="h-10 w-10 rounded-xl text-sm" />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                      {pool.name || "Unnamed pool"}
                    </span>
                    <span className="text-xl font-semibold tracking-[-0.02em] tabular-nums">
                      {apy !== null ? (
                        <>
                          {apy.toFixed(1)}
                          <span className="ml-0.5 text-[13px] font-medium text-muted-foreground">%</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" aria-hidden />
                  </Link>
                </li>
              ))}
          </ul>
        )}

        <p className="mt-6 text-[12.5px] text-muted-foreground/80">
          Estimated yearly yield after the pool&apos;s fee. Run a node?{" "}
          <DialogTrigger asChild>
            <button type="button" className={quietLink}>
              Start a pool
            </button>
          </DialogTrigger>
        </p>

        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create a Fogata mining pool</DialogTitle>
            <DialogDescription>
              Deploy a new pool contract, configure it, start its first
              snapshot, and submit it to the Fogata list in one transaction.
              The connected account becomes the pool owner.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            Before creating a mining pool, you must already be running a
            Koinos block producer. A pool coordinates mining work, but it
            does not set up or run a block producer for you.
          </div>

          {!account && (
            <p className="rounded-md border p-3 text-sm text-muted-foreground">
              Connect your wallet before creating a pool.
            </p>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pool-name">Name</Label>
              <Input
                id="new-pool-name"
                value={poolName}
                onChange={(event) => setPoolName(event.target.value)}
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pool-image">Image URL</Label>
              <Input
                id="new-pool-image"
                type="url"
                value={poolImage}
                onChange={(event) => setPoolImage(event.target.value)}
                disabled={creating}
              />
              <p className="text-xs text-muted-foreground">Any https image: PNG, JPEG, WebP or GIF. SVG isn&apos;t supported.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pool-description">Description</Label>
              <textarea
                id="new-pool-description"
                value={poolDescription}
                onChange={(event) =>
                  setPoolDescription(event.target.value)
                }
                disabled={creating}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pool-reburn-period">
                Reburn period (days)
              </Label>
              <Input
                id="new-pool-reburn-period"
                type="text"
                inputMode="decimal"
                value={reburnPeriodDays}
                onChange={(event) =>
                  setReburnPeriodDays(event.target.value)
                }
                disabled={creating}
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
                  disabled={creating}
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
                    disabled={creating}
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
                    disabled={creating}
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
                    disabled={creating}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Total beneficiary share:{" "}
                {beneficiaries.reduce(
                  (sum, beneficiary) => sum + beneficiary.percentage,
                  0
                ) / 1000}
                %
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-pool-reserved-koin">
                Reserved KOIN
              </Label>
              <Input
                id="new-pool-reserved-koin"
                type="text"
                inputMode="decimal"
                placeholder="2000"
                value={reservedKoinAmount}
                onChange={(event) =>
                  setReservedKoinAmount(event.target.value)
                }
                disabled={creating}
              />
              <p className="text-xs text-muted-foreground">
                Reserved KOIN provides mana for operating the pool and is not
                burned. Lower reburn periods require more frequent operations,
                so more reserved KOIN is recommended. As a base reference, use
                about 2,000 KOIN for a 4-day reburn period.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-pool-public-key">
                Node operator public key
              </Label>
              <Input
                id="new-pool-public-key"
                value={publicKey}
                onChange={(event) => setPublicKey(event.target.value)}
                placeholder="Paste the contents of public.key"
                disabled={creating}
              />
              <p className="text-xs text-muted-foreground">
                Register the public key from{" "}
                <code>.koinos/block_producer/public.key</code>. Also set the{" "}
                <code>producer</code> field in the{" "}
                <code>block_producer</code> section of your node&apos;s{" "}
                <code>config.yml</code> to the new pool address after
                deployment.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleCreatePool}
              disabled={!account || !signer || creating}
            >
              {creating ? "Deploying..." : "Deploy and submit pool"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              A random one-time contract key is generated locally. Ownership
              is assigned to your connected account during deployment.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

