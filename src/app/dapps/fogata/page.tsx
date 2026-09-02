"use client";

import { Contract, Multicall, ProviderInterface, utils } from "koilib";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/contexts/WalletContext";
import { FOGATA2_LIST_POOLS_CONTRACT_ID, POB_CONTRACT_ID, KOIN_CONTRACT_ID, VHP_CONTRACT_ID } from "@/koinos/constants";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { useEffect, useState } from "react";
import { abiFogataPool } from "@/koinos/abis/fogataPool";
import { abiPob } from "@/koinos/abis";
import tokenAbi from "@/koinos/abi";

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

export default function FogataPage() {
  const { provider } = useWallet();
  const [pools, setPools] = useState<Pool[]>([]);
  const [networkApy, setNetworkApy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            abi: abiFogataPool,
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

