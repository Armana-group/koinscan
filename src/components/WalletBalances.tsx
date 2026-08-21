"use client";

import { useState, useEffect } from 'react';
import { getAllTokens, KoinosToken } from '@/lib/tokens';
import { getKoinPrice, formatUsdValue } from '@/lib/price';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { Contract, Provider } from 'koilib';
import tokenAbi from '@/koinos/abi';

interface WalletBalancesProps {
  address: string;
}

interface TokenBalance {
  token: KoinosToken;
  balance: string;
  formattedBalance: string;
  numericValue: number;
}

// Map short names to actual contract addresses
const SHORT_NAME_TO_CONTRACT: Record<string, string> = {
  'koin': '15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL',
  'vhp': '1AdzuXSpC6K9qtXdCBgcTLYGYyPaUfEvNm',
};

// Get the actual contract address for a token
function getContractAddress(token: KoinosToken): string {
  const lowerAddress = token.address.toLowerCase();
  return SHORT_NAME_TO_CONTRACT[lowerAddress] || token.address;
}

// Helper to process tokens in batches
async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

export function WalletBalances({ address }: WalletBalancesProps) {
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
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
    async function fetchBalances() {
      if (!address || !jsonRpcNode) return;

      try {
        setLoading(true);

        // Create provider for RPC calls
        const provider = new Provider(jsonRpcNode);

        // Get all tokens from the official list
        const tokens = await getAllTokens();

        // Process tokens in batches of 10
        const results = await processBatches(tokens, 10, async (token) => {
          try {
            const contractAddress = getContractAddress(token);

            // Create contract instance
            const contract = new Contract({
              id: contractAddress,
              provider,
              abi: tokenAbi
            });

            // Call balanceOf
            const { result } = await contract.functions.balanceOf({
              owner: address
            });

            // Get balance value (in satoshis)
            const balanceRaw = result?.value || '0';

            // Skip tokens with zero balance
            if (balanceRaw === '0') return null;

            // Convert from satoshis to whole units
            const decimals = parseInt(token.decimals) || 8;
            const numericValue = parseInt(balanceRaw) / Math.pow(10, decimals);

            // Skip if effectively zero after conversion
            if (numericValue === 0) return null;

            // Format the balance for display
            const formatBalance = (value: number): string => {
              if (value === 0) return '0';
              if (value < 0.000001) return '< 0.000001';
              if (value < 1) return value.toFixed(6);
              if (value < 1000) return value.toFixed(4);
              if (value < 1000000) return `${(value / 1000).toFixed(2)}K`;
              return `${(value / 1000000).toFixed(2)}M`;
            };

            return {
              token,
              balance: balanceRaw,
              formattedBalance: formatBalance(numericValue),
              numericValue
            };
          } catch (err) {
            // Silently skip tokens that fail
            return null;
          }
        });

        // Filter out null results and sort by value
        const validBalances = results
          .filter((item): item is TokenBalance => !!item)
          .sort((a, b) => b.numericValue - a.numericValue);

        setTokenBalances(validBalances);
        setError(null);
      } catch (err) {
        console.error('Error fetching wallet balances:', err);
        setError('Failed to load balances');
      } finally {
        setLoading(false);
      }
    }

    fetchBalances();
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
        ) : tokenBalances.length > 0 ? (
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
            No token balances found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
