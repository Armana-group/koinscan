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

interface WalletBalancesProps {
  address: string;
}

interface TokenBalance {
  token: KoinosToken;
  balance: string;
  formattedBalance: string;
  numericValue: number;
}

export function WalletBalances({ address }: WalletBalancesProps) {
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [koinPrice, setKoinPrice] = useState<number | null>(null);
  const { rpcNode } = useWallet();

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
      if (!address || !rpcNode) return;

      try {
        setLoading(true);
        
        // 1. Get all tokens from the official list
        const tokens = await getAllTokens();
        
        // 2. Fetch balances for each token
        const balancePromises = tokens.map(async (token) => {
          try {
            // Fetch the token balance
            const response = await fetch(
              `${rpcNode}/v1/account/${address}/balance/${token.address.toLowerCase()}`
            );
            
            if (!response.ok) {
              return null; // Skip this token if there's an error
            }
            
            const data = await response.json();
            const balance = data.value || '0';
            
            // Skip tokens with zero balance
            if (balance === '0') return null;
            
            // The REST API returns balance in whole token units (not satoshis)
            // So we just need to parse it as a number, no decimal division needed
            let numericValue = 0;

            try {
              numericValue = parseFloat(balance);
            } catch (e) {
              console.error(`Error calculating numeric value for ${token.symbol}:`, e);
            }

            // Format the balance for display (it's already in whole units)
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
              balance,
              formattedBalance: formatBalance(numericValue),
              numericValue
            };
          } catch (err) {
            console.error(`Error fetching balance for ${token.symbol}:`, err);
            return null;
          }
        });
        
        // 3. Wait for all balance fetches to complete
        const results = await Promise.all(balancePromises);
        
        // 4. Filter out null results (skipped tokens) and sort by value
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
  }, [address, rpcNode]);

  return (
    <Card className="bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-500/10">
            <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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