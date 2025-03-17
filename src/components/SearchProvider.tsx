"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import * as toast from "@/lib/toast";

// Define known token addresses (this would ideally be moved to a constant file)
const KNOWN_TOKEN_ADDRESSES = [
  "15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL", // KOIN
  "18tWNU7E4yuQzz7hMVpceb9ixmaWLVyQsr", // VHP
];

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  handleSearch: () => Promise<void>;
  tokenList: string[];
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [tokenList, setTokenList] = useState<string[]>(KNOWN_TOKEN_ADDRESSES);

  // Try to fetch a more complete token list if available
  useEffect(() => {
    async function fetchTokenList() {
      try {
        const response = await fetch('https://raw.githubusercontent.com/koindx/token-list/main/src/tokens/mainnet.json');
        if (response.ok) {
          const data = await response.json();
          if (data && data.tokens && Array.isArray(data.tokens)) {
            const addresses = data.tokens
              .map((token: any) => token.address)
              .filter((address: string) => address && address.startsWith('1'));
            
            if (addresses.length > 0) {
              console.log('[TokenList] Loaded', addresses.length, 'token addresses');
              setTokenList(addresses);
            }
          }
        }
      } catch (error) {
        console.warn('[TokenList] Error fetching token list:', error);
        // Keep using the hardcoded list
      }
    }
    
    fetchTokenList();
  }, []);

  // Function to check if address is in our known token list
  function isKnownTokenAddress(address: string): boolean {
    return tokenList.includes(address) || 
           KNOWN_TOKEN_ADDRESSES.includes(address) ||
           ['koin', 'vhp'].includes(address.toLowerCase());
  }

  // Function to check if an address is a token contract (simplified for now)
  async function isTokenContract(addressOrName: string) {
    console.log(`[isTokenContract] Checking if ${addressOrName} is a token contract`);
    
    // First check against our known token list for instant results
    if (isKnownTokenAddress(addressOrName)) {
      console.log(`[isTokenContract] ${addressOrName} is a known token address!`);
      return true;
    }
    
    // For now, we'll just assume it's not a token contract in this simplified version
    // In a real implementation, you would make a call to the blockchain as in the original code
    return false;
  }

  // Function to resolve a nickname to an address (simplified for now)
  async function resolveNickname(nickname: string): Promise<string | null> {
    console.log(`[resolveNickname] Resolving nickname: ${nickname}`);
    
    // In a real implementation, you would call the Koinos Name Service
    // For now, we'll just return null to simulate a non-existent nickname
    return null;
  }

  // The main search handler function
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const value = searchQuery.trim();
    console.log(`[handleSearch] Searching for: ${value}`);
    setIsSearching(true);
    
    try {
      // Check for transaction ID (Koinos format with 0x1220 prefix or standard 64-char hex)
      if (/^0x1220[0-9a-fA-F]{64}$/.test(value) || /^[0-9a-fA-F]{64}$/.test(value) || /^0x[0-9a-fA-F]{64}$/.test(value)) {
        console.log(`[handleSearch] Detected as transaction ID`);
        router.push(`/tx/${value}`);
        return;
      }
      
      // Check for nickname (@handle format)
      if (value.startsWith('@')) {
        console.log(`[handleSearch] Detected as nickname: ${value}`);
        try {
          // First resolve the nickname to an address
          const address = await resolveNickname(value);
          
          if (!address) {
            toast.error(`Nickname ${value} not found.`);
            return;
          }
          
          // Then check if it's a contract or a regular address
          console.log(`[handleSearch] Resolved nickname to address: ${address}`);
          const isToken = await isTokenContract(address);
          
          if (isToken) {
            console.log(`[handleSearch] Address is a contract, redirecting to contract page: ${address}`);
            router.push(`/contracts/${address}`);
          } else {
            console.log(`[handleSearch] Address is a wallet, redirecting to address page: ${address}`);
            router.push(`/address/${address}`);
          }
          return;
        } catch (error) {
          console.error(`[handleSearch] Error processing nickname:`, error);
          toast.error(`Error resolving nickname ${value}.`);
          return;
        }
      }
      
      // Check for block number (numeric input)
      if (/^\d+$/.test(value)) {
        console.log(`[handleSearch] Detected as block number: ${value}`);
        router.push(`/blocks/${value}`);
        return;
      }
      
      // Check for specific cases like KOIN, VHP, etc.
      if (['koin', 'vhp'].includes(value.toLowerCase())) {
        console.log(`[handleSearch] Detected as well-known token symbol: ${value}`);
        router.push(`/contracts/${value.toLowerCase()}`);
        return;
      }
      
      // First check if it's a known token address for immediate response
      if (isKnownTokenAddress(value)) {
        console.log(`[handleSearch] Found in known token list: ${value}`);
        router.push(`/contracts/${value}`);
        return;
      }
      
      // If it starts with '1' and is around 34 chars, it could be either a token contract or address
      if (value.startsWith('1') && value.length >= 30 && value.length <= 36) {
        console.log(`[handleSearch] Has address format, checking if it's a token...`);
        
        try {
          // For potential contract addresses, try to validate as a token
          console.log(`[handleSearch] Checking if it's a token contract via API`);
          const isToken = await isTokenContract(value);
          console.log(`[handleSearch] isToken result:`, isToken);
          
          if (isToken) {
            console.log(`[handleSearch] Confirmed as token contract, redirecting to contract page: ${value}`);
            router.push(`/contracts/${value}`);
            return;
          }
          
          // If not a token, treat as a wallet address
          console.log(`[handleSearch] Not a token contract, treating as wallet address`);
          router.push(`/address/${value}`);
          return;
        } catch (error) {
          console.error(`[handleSearch] Error while validating token:`, error);
          // In case of any error in token detection, default to address page
          console.log(`[handleSearch] Defaulting to wallet address due to error`);
          router.push(`/address/${value}`);
          return;
        }
      }
      
      // If nothing else matches, show an error
      console.log(`[handleSearch] Unknown input type`);
      toast.error("Unable to determine the type of your search input.");
    } catch (error) {
      console.error("[handleSearch] Search error:", error);
      toast.error("Error processing search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const value = {
    searchQuery,
    setSearchQuery,
    isSearching,
    handleSearch,
    tokenList
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
} 