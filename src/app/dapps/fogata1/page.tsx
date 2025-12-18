"use client";

import {
  Contract,
  Provider,
  SignerInterface,
  Transaction,
  TransactionReceipt,
  utils,
} from "koilib";
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
import { FOGATA1_LIST_POOLS_CONTRACT_ID, MULTICALL_CONTRACT_ID } from "@/koinos/constants";
import { abiFogata1ListPools } from "@/koinos/abis/fogata1ListPools";
import { useEffect, useState } from "react";
import { abiFogataPool } from "@/koinos/abis/fogataPool";
import { abiMulticall } from "@/koinos/abis/multicall";
import Image from "next/image";

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

export default function Fogata1Page() {
  const { signer, provider } = useWallet();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPools = async () => {
      if (!provider) return;

      setLoading(true);
      setError(null);

      try {
        const listPoolsContract = new Contract({
          id: FOGATA1_LIST_POOLS_CONTRACT_ID,
          provider,
          abi: abiFogata1ListPools,
        });

        const { result: listPoolsResult } = await listPoolsContract.functions.get_approved_pools({
          start: "", // Empty to start from beginning
          limit: 100, // Get up to 100 pools
          direction: 0, // ascending
        });

        const transaction = new Transaction({ provider });
        const fogataPoolContract = new Contract({
          id: listPoolsResult?.value[0]?.account as string,
          provider,
          abi: abiFogataPool,
        });

        for (const pool of listPoolsResult?.value) {
          fogataPoolContract.id = utils.decodeBase58(pool.account as string);
          await transaction.pushOperation(fogataPoolContract.functions.get_pool_params, {});
        }

        const multicallContract = new Contract({
          id: MULTICALL_CONTRACT_ID,
          provider,
          abi: abiMulticall,
        });
        const { result: multicallResult } = await multicallContract.functions.get({
          calls: transaction.transaction.operations!.map((op) => op.call_contract),
        });
        
        const poolParams = await Promise.all(multicallResult!.results.map(async (result: any, index: number) => {
          const decoded = await fogataPoolContract.serializer!.deserialize(result.res.object, "fogata.pool_params");
          return {
            ...decoded,
            ...listPoolsResult!.value[index]!,
          };
        }));
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
              ? new Date(Number(pool.submission_time) / 1000).toLocaleDateString()
              : "N/A";
            const approvalDate = pool.approval_time && pool.approval_time !== "0"
              ? new Date(Number(pool.approval_time) / 1000).toLocaleDateString()
              : "Pending approval";
            const paymentPeriod = pool.payment_period
              ? `${Number(pool.payment_period) / 1000 / 86400} days`
              : "N/A";

            return (
              <Card key={`${address}-${index}`} className="border border-border/60 overflow-hidden">
                {/* Pool Image */}
                {pool.image && (
                  <div className="relative h-48 w-full overflow-hidden bg-muted">
                    <Image
                      src={pool.image}
                      alt={pool.name || "Pool image"}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">
                    {pool.name || "Unnamed Pool"}
                  </CardTitle>
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
                              {beneficiary.percentage}%
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
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span>{approvalDate}</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" disabled>
                    Join pool (coming soon)
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

