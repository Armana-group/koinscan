// Token definitions and functionality
import { cache } from 'react';

// Define token interfaces based on the official Koinos token list
export interface KoinosToken {
  name: string;
  symbol: string;
  description: string;
  decimals: string;
  logoURI: string;
  address: string;
  allowance: boolean;
  token_website?: string;
  coingecko_id?: string;
  coinmarketcap_id?: string;
}

export interface TokenList {
  chainId: string;
  tokens: KoinosToken[];
}

// Cache the token fetch to avoid repeated network requests
export const fetchTokenList = cache(async (): Promise<TokenList> => {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/koindx/token-list/main/src/tokens/mainnet.json',
      { next: { revalidate: 3600 } } // Revalidate every hour
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.status}`);
    }
    
    const data = await response.json();
    return data as TokenList;
  } catch (error) {
    console.error('Error fetching token list:', error);
    // Return a fallback token list with essential tokens
    return {
      chainId: 'EiBZK_GGVP0H_fXVAM3j6EAuz3-B-l3ejxRSewi7qIBfSA==',
      tokens: [
        {
          name: 'Koin',
          symbol: 'KOIN',
          description: 'Native token of Koinos.',
          decimals: '8',
          logoURI: 'https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/koin.png',
          address: 'koin',
          allowance: false
        },
        {
          name: 'Virtual Hash Power',
          symbol: 'VHP',
          description: 'The fuel for producing blocks on Koinos.',
          decimals: '8',
          logoURI: 'https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/vhp.png',
          address: 'vhp',
          allowance: false
        }
      ]
    };
  }
});

// Helper functions to interact with the token list

// Get a token by its address
export async function getTokenByAddress(address: string): Promise<KoinosToken | undefined> {
  const tokenList = await fetchTokenList();
  // Normalize addresses for comparison
  const normalizedAddress = address.toLowerCase();
  return tokenList.tokens.find(
    token => token.address.toLowerCase() === normalizedAddress
  );
}

// Get a token by its symbol
export async function getTokenBySymbol(symbol: string): Promise<KoinosToken | undefined> {
  const tokenList = await fetchTokenList();
  // Normalize symbols for comparison
  const normalizedSymbol = symbol.toUpperCase();
  return tokenList.tokens.find(
    token => token.symbol.toUpperCase() === normalizedSymbol
  );
}

// Get all tokens
export async function getAllTokens(): Promise<KoinosToken[]> {
  const tokenList = await fetchTokenList();
  return tokenList.tokens;
}

// Get token decimals
export async function getTokenDecimals(symbol: string): Promise<number> {
  const token = await getTokenBySymbol(symbol);
  return token ? parseInt(token.decimals) : 8; // Default to 8 if not found
}

// Get a mapping of contract addresses to token symbols
export async function getTokenContractsMapping(): Promise<Record<string, string>> {
  const tokenList = await fetchTokenList();
  const mapping: Record<string, string> = {};
  
  tokenList.tokens.forEach(token => {
    mapping[token.address] = token.symbol;
  });
  
  return mapping;
}

// Get a mapping of token symbols to decimals
export async function getTokenDecimalsMapping(): Promise<Record<string, number>> {
  const tokenList = await fetchTokenList();
  const mapping: Record<string, number> = {};
  
  tokenList.tokens.forEach(token => {
    mapping[token.symbol] = parseInt(token.decimals);
  });
  
  return mapping;
}

// Format a token amount based on its decimals
export function formatTokenAmount(amount: string, decimals: number): string {
  try {
    if (!amount) return '0';

    // Guard against invalid decimals
    if (decimals === undefined || decimals === null || isNaN(decimals)) {
      decimals = 8; // Default to 8 decimals (common for most tokens)
    }

    // If the amount is already in decimal format
    if (amount.includes('.')) {
      return amount;
    }

    const rawNum = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    
    // Convert to standard decimal format
    const majorUnits = Number(rawNum / divisor);
    const minorPart = Number(rawNum % divisor) / Number(divisor);
    const value = majorUnits + minorPart;
    
    // Format based on size
    if (value === 0) return '0';
    if (value < 0.000001) return '< 0.000001';
    if (value < 1) return value.toFixed(6);
    if (value < 1000) return value.toFixed(4);
    if (value < 1000000) return `${(value / 1000).toFixed(2)}K`;
    return `${(value / 1000000).toFixed(2)}M`;
  } catch (err) {
    console.error('Error formatting token amount:', err);
    return amount;
  }
} 