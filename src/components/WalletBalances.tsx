"use client";

import { useState, useEffect } from 'react';
import { getAllTokens, KoinosToken, formatTokenAmount } from '@/lib/tokens';
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
  const { rpcNode } = useWallet();

  useEffect(() => {
    async function fetchBalances() {
      if (!address) return;

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
            
            // Calculate numeric value for sorting
            const decimals = parseInt(token.decimals);
            let numericValue = 0;
            
            try {
              if (balance.includes('.')) {
                numericValue = parseFloat(balance);
              } else {
                const rawNum = BigInt(balance);
                const divisor = BigInt(10 ** decimals);
                numericValue = Number(rawNum) / (10 ** decimals);
              }
            } catch (e) {
              console.error(`Error calculating numeric value for ${token.symbol}:`, e);
            }
            
            return {
              token,
              balance,
              formattedBalance: formatTokenAmount(balance, decimals),
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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          Wallet Details
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="ml-2 h-4 w-4 text-muted-foreground cursor-help" />
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
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : tokenBalances.length > 0 ? (
          <div className="font-mono text-base space-y-3">
            {tokenBalances.map(({ token, formattedBalance }) => (
              <div key={token.symbol} className="flex justify-between items-center">
                <div className="flex items-center">
                  {token.logoURI && (
                    <div className="rounded-full overflow-hidden h-5 w-5 mr-2">
                      <Image 
                        src={token.logoURI}
                        alt={token.symbol}
                        width={20}
                        height={20}
                      />
                    </div>
                  )}
                  <span className="font-bold">{formattedBalance}</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground cursor-help">{token.symbol}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-normal">{token.name}</p>
                      {token.description && <p className="text-xs text-muted-foreground">{token.description}</p>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-2">No token balances found</div>
        )}
      </CardContent>
    </Card>
  );
} 