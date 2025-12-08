"use client";

import { SignerInterface, ProviderInterface, Provider } from "koilib";
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import * as kondor from "kondor-js";
import { 
  WalletName, 
  connectWallet, 
  disconnectWallet, 
  getWalletSigner, 
  getStoredKondorAccounts,
  KONDOR_ACCOUNTS_KEY,
  WALLET_CONNECT_SESSION_KEY
} from "@/koinos/wallets";
import { saveBetaAccess, clearBetaAccess } from "@/lib/beta-access";

// Local storage keys
const ADDRESS_STORAGE_KEY = "koinos-explorer-address";
const WALLET_TYPE_STORAGE_KEY = "koinos-explorer-wallet-type";
export const RPC_NODE_STORAGE_KEY = "rpc-node";
export const REST_NODE_STORAGE_KEY = "rest-node";

// Default endpoints
const DEFAULT_RPC_NODE = "https://api.koinos.io"; // JSON-RPC for koilib Provider
const DEFAULT_REST_NODE = "https://rest.koinos.io"; // REST API for account history, balances

// Add kondor type declaration to make TypeScript happy
declare global {
  interface Window {
    kondor?: any;
    ethereum?: any;
  }
}

interface ExtendedSigner extends SignerInterface {
  name?: WalletName;
}

interface WalletContextType {
  signer: ExtendedSigner | undefined;
  setSigner: (signer: ExtendedSigner | undefined) => void;
  savedAddress: string | null;
  savedWalletType: WalletName | null;
  forgetAddress: () => void;
  isReconnecting: boolean;
  kondorAccounts: any[];
  provider: ProviderInterface | undefined;
  setProvider: (provider: ProviderInterface) => void;
  rpcNode: string; // REST API endpoint for account history, balances
  setRpcNode: (node: string) => void;
  jsonRpcNode: string; // JSON-RPC endpoint for koilib Provider
  setJsonRpcNode: (node: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [signer, setSigner] = useState<ExtendedSigner | undefined>(undefined);
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [savedWalletType, setSavedWalletType] = useState<WalletName | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [kondorAccounts, setKondorAccounts] = useState<any[]>([]);
  const [provider, setProvider] = useState<ProviderInterface>();
  const [rpcNode, setRpcNode] = useState<string>(""); // REST API endpoint
  const [jsonRpcNode, setJsonRpcNode] = useState<string>(""); // JSON-RPC endpoint for koilib

  // Load saved wallets on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for stored Kondor accounts
      const storedKondorAccounts = getStoredKondorAccounts();
      if (storedKondorAccounts && storedKondorAccounts.length > 0) {
        setKondorAccounts(storedKondorAccounts);
        
        // Create a signer for the first account
        const account = storedKondorAccounts[0];
        const newSigner = getWalletSigner("kondor", account.address);
        (newSigner as ExtendedSigner).name = "kondor";
        setSigner(newSigner as ExtendedSigner);
        setSavedAddress(account.address);
        setSavedWalletType("kondor");
        
        // Also update beta access with this wallet
        saveBetaAccess(account.address);
        return;
      }
      
      // Check for stored WalletConnect session
      const wcSessionJson = localStorage.getItem(WALLET_CONNECT_SESSION_KEY);
      if (wcSessionJson) {
        try {
          const wcSession = JSON.parse(wcSessionJson);
          if (wcSession && wcSession.connected && wcSession.address) {
            // Create a signer for the WalletConnect address
            const newSigner = getWalletSigner("walletConnect", wcSession.address);
            (newSigner as ExtendedSigner).name = "walletConnect";
            setSigner(newSigner as ExtendedSigner);
            setSavedAddress(wcSession.address);
            setSavedWalletType("walletConnect");
            
            // Also update beta access with this wallet
            saveBetaAccess(wcSession.address);
            return;
          }
        } catch (error) {
          console.warn("Failed to parse WalletConnect session", error);
        }
      }
      
      // Fallback to the legacy method
      const storedAddress = localStorage.getItem(ADDRESS_STORAGE_KEY);
      const storedWalletType = localStorage.getItem(WALLET_TYPE_STORAGE_KEY) as WalletName | null;
      
      if (storedAddress) {
        setSavedAddress(storedAddress);
        
        // If we have a stored address, try to update beta access
        saveBetaAccess(storedAddress);
      }
      
      if (storedWalletType) {
        setSavedWalletType(storedWalletType);
      }
    }
  }, []);

  // Load provider from localStorage on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // REST API endpoint for account history, balances, etc.
      let storedRestNode = localStorage.getItem(REST_NODE_STORAGE_KEY);
      if (!storedRestNode) {
        storedRestNode = DEFAULT_REST_NODE;
        localStorage.setItem(REST_NODE_STORAGE_KEY, storedRestNode);
      }
      setRpcNode(storedRestNode);

      // JSON-RPC endpoint for koilib Provider (network page, contract calls)
      let storedRpcNode = localStorage.getItem(RPC_NODE_STORAGE_KEY);
      // Migrate old values that were incorrectly set to rest.koinos.io
      if (!storedRpcNode || storedRpcNode === "https://rest.koinos.io") {
        storedRpcNode = DEFAULT_RPC_NODE;
        localStorage.setItem(RPC_NODE_STORAGE_KEY, storedRpcNode);
      }
      setJsonRpcNode(storedRpcNode);

      // Create provider with JSON-RPC endpoint
      const newProvider = new Provider([storedRpcNode]);
      setProvider(newProvider);
    }
  }, []);

  // Update provider when jsonRpcNode changes
  useEffect(() => {
    if (jsonRpcNode) {
      const newProvider = new Provider([jsonRpcNode]);
      setProvider(newProvider);
      localStorage.setItem(RPC_NODE_STORAGE_KEY, jsonRpcNode);
    }
  }, [jsonRpcNode]);

  // Update REST node storage when rpcNode changes
  useEffect(() => {
    if (rpcNode) {
      localStorage.setItem(REST_NODE_STORAGE_KEY, rpcNode);
    }
  }, [rpcNode]);

  // Handle Kondor account changes
  useEffect(() => {
    const handleAccountsChanged = async () => {
      try {
        const accounts = await kondor.getAccounts();
        
        if (!accounts || accounts.length === 0) {
          // Disconnect if no accounts available
          setSigner(undefined);
          localStorage.removeItem(KONDOR_ACCOUNTS_KEY);
          setKondorAccounts([]);
          
          // Clear beta access when disconnecting
          clearBetaAccess();
          return;
        }
        
        // Update stored accounts
        localStorage.setItem(KONDOR_ACCOUNTS_KEY, JSON.stringify(accounts));
        setKondorAccounts(accounts);
        
        // Update signer with new account
        const newSigner = getWalletSigner("kondor", accounts[0].address);
        (newSigner as ExtendedSigner).name = "kondor";
        setSigner(newSigner as ExtendedSigner);
        
        // Update beta access with the new wallet
        saveBetaAccess(accounts[0].address);
      } catch (error) {
        console.error("Error handling account change", error);
      }
    };

    // Subscribe to Kondor account changes
    if (typeof window !== 'undefined') {
      window.addEventListener("kondor_accountsChanged", handleAccountsChanged);
      
      return () => {
        // Cleanup subscription
        window.removeEventListener("kondor_accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

  // Function to forget the saved address and wallet type
  const forgetAddress = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADDRESS_STORAGE_KEY);
      localStorage.removeItem(WALLET_TYPE_STORAGE_KEY);
      localStorage.removeItem(KONDOR_ACCOUNTS_KEY);
      localStorage.removeItem(WALLET_CONNECT_SESSION_KEY);
      setSavedAddress(null);
      setSavedWalletType(null);
      setKondorAccounts([]);
      
      // Also clear beta access
      clearBetaAccess();
    }
  };

  return (
    <WalletContext.Provider value={{
      signer,
      setSigner,
      savedAddress,
      savedWalletType,
      forgetAddress,
      isReconnecting,
      kondorAccounts,
      provider,
      setProvider,
      rpcNode,
      setRpcNode,
      jsonRpcNode,
      setJsonRpcNode
    }}>
      {children}
    </WalletContext.Provider>
  );
}

// This is the hook that components will use to access the wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
} 