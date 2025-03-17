"use client";

import { useRef, useState, Suspense, useEffect } from "react";
import { Search, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { AuroraText } from "@/components/magicui/aurora-text";
import { motion } from "framer-motion";
import dynamic from 'next/dynamic';
import type { TransactionHistory as TransactionHistoryType } from '@/components/TransactionHistory';
import { Contract, Provider } from 'koilib';
import { RPC_NODE, NICKNAMES_CONTRACT_ID } from "@/koinos/constants"; 
import * as toast from "@/lib/toast";
import { resolveNickname } from "@/koinos/utils";
import { useSearch } from "@/components/SearchProvider";

// Dynamically import the TransactionHistory component
const TransactionHistory = dynamic(
  () => import('@/components/TransactionHistory').then(mod => mod.TransactionHistory),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full p-8 rounded-lg border border-border">
        <div className="h-8 w-32 bg-muted rounded-md animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    )
  }
);

// Standard KRC20 ABI with just the decimals function
const minimalKRC20Abi = {
  methods: {
    decimals: {
      entry_point: 0x9a3b2b2f, // This is the entry point ID for the decimals function
      argument: undefined,
      return: "uint32",
      read_only: true
    }
  }
};

// Known token addresses from the token list
const KNOWN_TOKEN_ADDRESSES = [
  '1DdERbxQte8XCwLQT8KVDyq1NJo5EGhpdg', // KOINDX
  '15twURbNdh6S7GVXhqVs6MoZAhCfDSdoyd', // ETH
  '14MjxccMUZrtBPXnNkuAC5MLtPev2Zsk3N', // USDT
  '15zQzktjXHPRstPYB9dqs6jUuCUCVvMGB9', // BTC
  '1Htbqhoi9ixk1VvvKDhSinD5PcnJvzDSjH', // KAS
  '1NHReq2apWsQ6UPBjNqcV3ABsj88Ncimiy', // pVHP
  '1LeWGhDVD8g5rGCL4aDegEf9fKyTL1KhsS', // KAN (Kanvas)
  '1F81UPvBW4g2jFLU5VuBvoPeZFFHL5fPqQ', // BTK
  '1BTQCpospHJRA7VAtZ4wvitdcqYCvkwBCD', // KCT
  '1A7ix1dr77wUVD3XtCwbthbysT5LeB1CeG', // DRUGS
  '18JRrBdnNqQ99faV6sn6Un1MbvU5sZWgzf', // RUN
  '16aD3Ax1kC8WKAsNevAfwyEAzoYL9T7AYs', // BALD
  '1KqhJUNdv3pTwVomjkCPh95Bx1w7WaUHU7', // KINU
  '1CXt6cUVQ26gRWdXLFPDhL1TvUNR5vp2JB', // TITCOIN
  '19AXVkzeetLUgQx7xoZnoJoZ4JnezDeT3q', // QUACK
  '169UynEtFWxuvk2EX6mPphZutYDxy1NAjV', // 52KPH
  '14Dj8RjYqy8hQ1GarrJGGeaGu6AuCwxcgy', // FAITH
  '1A4Nv58odXgVK91bFHgCFWPgiu7kfsxdVY', // PACKS
  '1HpqHhCQPqeJf15MwAGF6RmhJ9aet8Hd5k', // Kat
  '1MKWW9dJXVUcJU9PHF1zDnzRTFQJ6q4NKy', // Snake
  '1C4pGZS9oBBLs4vCTehGNBa7StXqYFRc16'  // FR
];

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchContext = useSearch();
  const [searchAddress, setSearchAddress] = useState<string>("");
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

  // Function to check if an address is a token contract by calling its decimals function
  async function isTokenContract(addressOrName: string) {
    console.log(`[isTokenContract] Checking if ${addressOrName} is a token contract`);
    
    // First check against our known token list for instant results
    if (isKnownTokenAddress(addressOrName)) {
      console.log(`[isTokenContract] ${addressOrName} is a known token address!`);
      return true;
    }
    
    // List of RPC nodes to try in case the first one fails
    const rpcNodes = [
      RPC_NODE,
      'https://api.koinos.io',
      'https://api.koinosblocks.com'
    ];
    
    // Try each RPC node until one works
    for (const rpcNode of rpcNodes) {
      console.log(`[isTokenContract] Trying RPC node: ${rpcNode}`);
      const provider = new Provider([rpcNode]);
      
      try {
        // Create a minimal contract instance to check the decimals function
        const contract = new Contract({
          id: addressOrName,
          provider,
          abi: minimalKRC20Abi
        });
        
        // Set a timeout for the API call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        // Try to call the decimals function
        console.log(`[isTokenContract] Calling decimals function for ${addressOrName}`);
        const { result } = await contract.functions.decimals();
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        console.log(`[isTokenContract] Decimals call succeeded:`, result);
        // If we get a result (even if it's 0), it's a token contract
        return result !== undefined;
      } catch (error) {
        console.error(`[isTokenContract] Error with RPC ${rpcNode}:`, error);
        // Try the next RPC node
        continue;
      }
    }
    
    console.log(`[isTokenContract] All RPC attempts failed for ${addressOrName}`);
    return false;
  }

  // Handle search submit
  const handleSearch = async () => {
    if (!inputRef.current?.value.trim()) return;

    const value = inputRef.current.value.trim();
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="container mx-auto px-4">
          <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center">
            <motion.div 
              className="max-w-5xl w-full space-y-12 text-center -mt-48"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="space-y-4" variants={itemVariants}>
                <h1 className="text-5xl font-bold tracking-tight text-foreground">
                  <AuroraText>Explore the Koinos blockchain</AuroraText>
                </h1>
                <p className="text-xl text-muted-foreground">
                  Search for transactions, blocks, accounts, and smart contracts
                </p>

              </motion.div>

              <motion.div className="relative group" variants={itemVariants}>
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search by address, transaction ID (0x1220...), block number, or @nickname"
                    className="pl-12 pr-14 h-14 text-lg bg-background border-2 border-border/50 rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.02)] hover:border-border focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10 transition-all"
                    ref={inputRef}
                    disabled={isSearching}
                    onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSearch();
                      }
                    }}
                  />
                  {isSearching ? (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="h-5 w-5 border-t-2 border-r-2 border-primary rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <button 
                      type="submit" 
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-muted h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                      aria-label="Search"
                    >
                      <ArrowUp className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )}
                </form>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
