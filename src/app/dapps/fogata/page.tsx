"use client";

import { Contract, Multicall, ProviderInterface, Signer, utils } from "koilib";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import tokenAbi from "@/koinos/abi";
import * as toast from "@/lib/toast";

/**
 * APY = 2% * virtual supply / VHP producing
 * Same formula as src/app/network/page.tsx
 */
async function getNetworkApy(provider: ProviderInterface): Promise<number> {
  const vhpContract = new Contract({ id: VHP_CONTRACT_ID, provider, abi: tokenAbi });
  const { result: resultVhp } = await vhpContract.functions.totalSupply();
  const totalVhp = Number(resultVhp!.value) / 1e8;

  const koinContract = new Contract({ id: KOIN_CONTRACT_ID, provider, abi: tokenAbi });
  const { result: resultKoin } = await koinContract.functions.totalSupply();
  const totalKoin = Number(resultKoin!.value) / 1e8;

  const pobContract = new Contract({ id: POB_CONTRACT_ID, provider, abi: abiPob });
  const { result: resultPob } = await pobContract.functions.get_metadata();
  const difficulty = Number(
    "0x" + utils.toHexString(utils.decodeBase64url(resultPob!.value.difficulty))
  );
  const vhpProducing = 10 * difficulty / 3000 / 1e8;
  return 2 * (totalVhp + totalKoin) / vhpProducing;
}

function computePoolApy(
  networkApy: number,
  beneficiaries: Pool["beneficiaries"]
): number {
  const beneficiaryShare = beneficiaries.reduce(
    (sum, beneficiary) => sum + beneficiary.percentage,
    0
  ) / 1000;
  return networkApy * (1 - beneficiaryShare / 100);
}

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
}

interface Beneficiary {
  address: string;
  percentage: number;
}

export default function FogataPage() {
  const router = useRouter();
  const { provider, signer, savedAddress } = useWallet();
  const account = signer?.getAddress() ?? savedAddress ?? null;
  const [pools, setPools] = useState<Pool[]>([]);
  const [networkApy, setNetworkApy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [poolImage, setPoolImage] = useState("");
  const [poolDescription, setPoolDescription] = useState("");
  const [reburnPeriodDays, setReburnPeriodDays] = useState("4");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);

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

    setCreating(true);
    let activeToast = toast.loading("Preparing pool deployment...");
    try {
      const bytecodeResponse = await fetch(
        "/api/fogata/miningpool-bytecode"
      );
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

      const [
        { operation: setOwnerOperation },
        { operation: setParamsOperation },
        { operation: startOperation },
        { operation: submitOperation },
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
          setOwnerOperation,
          setParamsOperation,
          submitOperation,
          startOperation,
        ],
        beforeSend: async (transactionToSign) => {
          await signer.signTransaction(transactionToSign, {
            [poolAddress]: abiFogata2Pool,
            [FOGATA2_LIST_POOLS_CONTRACT_ID]: abiFogata2ListPools,
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

        const multicall = new Multicall({
          provider,
          contracts: listPoolsResult?.value.map((pool: { account: string }) => new Contract({
            id: pool.account,
            provider,
            abi: abiFogata2Pool,
          })),
        });
        for (const contract of multicall.contracts) {
          await multicall.add(contract.functions.get_pool_params, {});
        }
        const poolParams = (await multicall.call()).map((result, i) => {
          return {
            ...result,
            ...listPoolsResult?.value[i],
          } as Pool;
        });
        const apy = await getNetworkApy(provider);
        setNetworkApy(apy);
        setPools(poolParams);
      } catch (err) {
        console.error("Error fetching pools:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch pools");
      } finally {
        setLoading(false);
      }
    };

    fetchPools();
  }, [provider]);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Fogata 2 Mining Pools</h1>
        <p className="mt-4 text-muted-foreground">
          Fogata 2 empowers the Koinos community with decentralized mining pools. Choose a pool to join, contribute your resources, and earn rewards for helping secure the network.
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Create a mining pool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create a Fogata mining pool</DialogTitle>
              <DialogDescription>
                Deploy a new pool contract, configure it, start its first
                snapshot, and submit it to the Fogata list in one transaction.
                The connected account becomes the pool owner.
              </DialogDescription>
            </DialogHeader>

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
                  type="number"
                  min="0"
                  step="0.01"
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

      {loading && (
        <div className="mt-10 text-center text-muted-foreground">
          Loading pools...
        </div>
      )}

      {error && (
        <div className="mt-10 text-center text-destructive">
          Error: {error}
        </div>
      )}

      {!loading && !error && pools.length === 0 && (
        <div className="mt-10 text-center text-muted-foreground">
          No pools found.
        </div>
      )}

      {!loading && !error && pools.length > 0 && (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {pools.map((pool, index) => {
            const address = pool.account;
            const submissionDate = pool.submission_time
              ? new Date(Number(pool.submission_time)).toLocaleDateString()
              : "N/A";
            const paymentPeriod = pool.payment_period
              ? `${Number(pool.payment_period) / 1000 / 86400} days`
              : "N/A";
            const poolApy =
              networkApy !== null
                ? computePoolApy(networkApy, pool.beneficiaries ?? [])
                : null;

            return (
              <Card key={`${address}-${index}`} className="border border-border/60 overflow-hidden">
                {/* Pool Image */}
                {pool.image && (
                  <div className="relative h-48 w-full overflow-hidden bg-muted">
                    {/* Plain <img>: pool image hosts are arbitrary on-chain URLs */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pool.image}
                      alt={pool.name || "Pool image"}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-xl font-semibold">
                      {pool.name || "Unnamed Pool"}
                    </CardTitle>
                    {poolApy !== null && (
                      <Badge variant="default" className="flex-shrink-0">
                        {poolApy.toFixed(2)}% APY
                      </Badge>
                    )}
                  </div>
                  {pool.description && (
                    <CardDescription className="line-clamp-2">
                      {pool.description}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Pool Address */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Pool Address
                    </div>
                    <div className="break-all font-mono text-sm">
                      {address}
                    </div>
                  </div>

                  {/* Payment Period */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Payment Period
                    </div>
                    <div className="text-sm">
                      {paymentPeriod}
                    </div>
                  </div>

                  {/* Beneficiaries */}
                  {pool.beneficiaries && pool.beneficiaries.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Beneficiaries
                      </div>
                      <div className="space-y-2">
                        {pool.beneficiaries.map((beneficiary, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                          >
                            <span className="font-mono text-xs break-all flex-1 mr-2">
                              {beneficiary.address}
                            </span>
                            <Badge variant="secondary" className="flex-shrink-0">
                              {beneficiary.percentage / 1000}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="space-y-1 text-sm text-muted-foreground border-t pt-3">
                    <div className="flex justify-between">
                      <span>Submitted:</span>
                      <span>{submissionDate}</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/dapps/fogata/${address}`}>Manage pool</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

