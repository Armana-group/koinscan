"use client";

import { useState, useEffect } from 'react';
import { getKoinPrice, formatUsdValue } from '@/lib/price';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import {
  type TokenBalance,
  type TokenBalanceFailure,
  type WalletBalanceLoadResult,
} from '@/lib/wallet-balances';

interface WalletBalancesProps {
  address: string;
}

export function WalletBalances({ address }: WalletBalancesProps) {
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [balanceFailures, setBalanceFailures] = useState<TokenBalanceFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [koinPrice, setKoinPrice] = useState<number | null>(null);
  const { jsonRpcNode } = useWallet();

  // Fetch KOIN price
  useEffect(() => {
    async function fetchPrice() {
      const price = await getKoinPrice();
      setKoinPrice(price);
    }
    fetchPrice();

    // Refresh price every 60 seconds
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchBalances() {
      if (!address || !jsonRpcNode) return;

      try {
        setLoading(true);
        setError(null);
        setBalanceFailures([]);

        const searchParams = new URLSearchParams({
          address,
          rpcNode: jsonRpcNode,
        });
        const response = await fetch(`/api/account-balances?${searchParams.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Balance request failed with status ${response.status}`);
        }

        const { balances, failures } = await response.json() as WalletBalanceLoadResult;

        if (controller.signal.aborted) return;

        setTokenBalances(balances);
        setBalanceFailures(failures);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Error fetching wallet balances:', err);
        setTokenBalances([]);
        setBalanceFailures([]);
        setError('Failed to load balances');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchBalances();
    return () => controller.abort();
  }, [address, jsonRpcNode]);

  return (
    <Card className="bg-gradient-to-br from-[hsl(var(--logo-color-2))]/5 via-[hsl(var(--logo-color-2))]/3 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[hsl(var(--logo-color-2))]/10">
            <svg className="h-4 w-4 text-[hsl(var(--logo-color-2))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            </svg>
          </div>
          Token Balances
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                Showing tokens with non-zero balances from the official Koinos token list
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <div className="space-y-3">
            {balanceFailures.length > 0 && (
              <div
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
                role="status"
              >
                {balanceFailures.length} token balance{balanceFailures.length === 1 ? '' : 's'} could not be verified: {' '}
                {balanceFailures.map(({ token }) => token.symbol).join(', ')}
              </div>
            )}
            {tokenBalances.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tokenBalances.map(({ token, formattedBalance, numericValue }) => {
                  // Calculate USD value for KOIN only
                  const isKoin = token.symbol.toUpperCase() === 'KOIN';
                  const usdValue = isKoin && koinPrice ? numericValue * koinPrice : null;

                  return (
                    <div
                      key={token.symbol}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/40 hover:border-border/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden ring-2 ring-border/20">
                          {token.logoURI ? (
                            <Image
                              src={token.logoURI}
                              alt={token.symbol}
                              width={32}
                              height={32}
                              className="object-contain"
                            />
                          ) : (
                            <span className="text-sm font-bold text-muted-foreground">
                              {token.symbol.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-lg">
                            {formattedBalance}
                            {usdValue !== null && (
                              <span className="text-sm font-normal text-muted-foreground ml-2">
                                (~{formatUsdValue(usdValue)})
                              </span>
                            )}
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-xs text-muted-foreground cursor-help">{token.symbol}</div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-normal">{token.name}</p>
                                {token.description && <p className="text-xs text-muted-foreground max-w-xs">{token.description}</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-6 bg-muted/20 rounded-lg">
                No verified token balances found
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
