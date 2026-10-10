"use client";

import { DEFAULT_JSON_RPC_NODE, DEFAULT_REST_NODE as KNOWN_DEFAULT_REST_NODE, KNOWN_REST_ORIGINS, normalizeRpcOrigin } from "@/koinos/known-nodes";
import { SignerInterface, ProviderInterface, Provider } from "koilib";
import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from "react";
import * as kondor from "kondor-js";
import { 
  WalletName, 
  connectWallet,
  refreshKondorAccounts,
  getWalletSigner, 
  getStoredKondorAccounts,
  getChosenAddress,
  pickKondorAccount,
  rememberChosenAddress,
  KONDOR_ACCOUNTS_KEY,
  WALLET_CONNECT_SESSION_KEY,
  type KondorAccount,
} from "@/koinos/wallets";
import { saveBetaAccess, clearBetaAccess } from "@/lib/beta-access";

// Local storage keys
const ADDRESS_STORAGE_KEY = "koinos-explorer-address";
const WALLET_TYPE_STORAGE_KEY = "koinos-explorer-wallet-type";
export const RPC_NODE_STORAGE_KEY = "rpc-node";
export const REST_NODE_STORAGE_KEY = "rest-node";

// Default endpoints
const DEFAULT_RPC_NODE = DEFAULT_JSON_RPC_NODE; // JSON-RPC for koilib Provider
const DEFAULT_REST_NODE = KNOWN_DEFAULT_REST_NODE; // REST API for account history, balances

// Add kondor type declaration to make TypeScript happy
declare global {
  interface Window {
    kondor?: { enable: () => Promise<unknown> };
    ethereum?: unknown;
  }
}

interface ExtendedSigner extends SignerInterface {
  name?: WalletName;
}

interface WalletContextType {
  signer: ExtendedSigner | undefined;
  setSigner: (signer: ExtendedSigner | undefined) => void;
  connect: (wallet: WalletName) => Promise<"connected" | "choose-account" | "cancelled">;
  pickDifferentKondorAccount: () => Promise<{
    accounts: KondorAccount[];
    selected?: KondorAccount;
  } | undefined>;
  savedAddress: string | null;
  savedWalletType: WalletName | null;
  forgetAddress: () => void;
  /** Use one of the accounts Kondor shares, and keep using it after a reload. */
  chooseKondorAccount: (account: KondorAccount) => void;
  isReconnecting: boolean;
  kondorAccounts: KondorAccount[];
  provider: ProviderInterface | undefined;
  setProvider: (provider: ProviderInterface) => void;
  rpcNode: string; // REST API endpoint for account history, balances
  setRpcNode: (node: string) => void;
  jsonRpcNode: string; // JSON-RPC endpoint for koilib Provider
  setJsonRpcNode: (node: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [signer, setSignerState] = useState<ExtendedSigner | undefined>(undefined);
  const signerRef = useRef<ExtendedSigner | undefined>(undefined);
  const walletRevision = useRef(0);
  const pendingWalletAction = useRef(false);
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [savedWalletType, setSavedWalletType] = useState<WalletName | null>(null);
  const isReconnecting = false;
  const [kondorAccounts, setKondorAccountsState] = useState<KondorAccount[]>([]);
  const [provider, setProviderState] = useState<ProviderInterface>();
  const providerRef = useRef<ProviderInterface | undefined>(undefined);
  const [rpcNode, setRpcNode] = useState<string>(""); // REST API endpoint
  const [jsonRpcNode, setJsonRpcNode] = useState<string>(""); // JSON-RPC endpoint for koilib

  const setProvider = useCallback((nextProvider: ProviderInterface) => {
    providerRef.current = nextProvider;
    if (signerRef.current) signerRef.current.provider = nextProvider;
    setProviderState(nextProvider);
  }, []);

  // Every wallet selection owns one revision. Extension replies from an older
  // revision must not undo an explicit switch or disconnect.
  const setSigner = useCallback((nextSigner: ExtendedSigner | undefined, accounts?: KondorAccount[]) => {
    walletRevision.current += 1;
    pendingWalletAction.current = false;
    signerRef.current = nextSigner;
    if (nextSigner) {
      nextSigner.provider = providerRef.current;
      const address = nextSigner.getAddress();
      setSavedAddress(address);
      setSavedWalletType(nextSigner.name ?? null);
      rememberChosenAddress(address);
      if (nextSigner.name) localStorage.setItem(WALLET_TYPE_STORAGE_KEY, nextSigner.name);
      if (nextSigner.name === "kondor") {
        const sharedAccounts = accounts ?? getStoredKondorAccounts() ?? [];
        localStorage.setItem(KONDOR_ACCOUNTS_KEY, JSON.stringify(sharedAccounts));
        localStorage.removeItem(WALLET_CONNECT_SESSION_KEY);
        setKondorAccountsState(sharedAccounts);
      } else {
        localStorage.removeItem(KONDOR_ACCOUNTS_KEY);
        setKondorAccountsState([]);
        localStorage.setItem(WALLET_CONNECT_SESSION_KEY, JSON.stringify({ connected: true, address }));
      }
      clearBetaAccess();
      saveBetaAccess(address);
    } else {
      setKondorAccountsState([]);
      localStorage.removeItem(KONDOR_ACCOUNTS_KEY);
      localStorage.removeItem(WALLET_CONNECT_SESSION_KEY);
      clearBetaAccess();
    }
    setSignerState(nextSigner);
  }, []);

  const connect = async (wallet: WalletName) => {
    const revision = ++walletRevision.current;
    const chosenAddress = getChosenAddress();
    pendingWalletAction.current = true;
    try {
      const connection = await connectWallet(wallet);
      if (revision !== walletRevision.current) return "cancelled" as const;
      if (wallet === "kondor" && connection.accounts
        && !connection.accounts.some((account) => account.address === chosenAddress)) {
        // A fresh connection (including after Forget) requires an explicit
        // account choice. Kondor's site permission may still return old accounts.
        setKondorAccountsState(connection.accounts);
        return "choose-account" as const;
      }
      const nextSigner = getWalletSigner(wallet, connection.address) as ExtendedSigner;
      nextSigner.name = wallet;
      setSigner(nextSigner, connection.accounts);
      return "connected" as const;
    } finally {
      if (revision === walletRevision.current) pendingWalletAction.current = false;
    }
  };

  const pickDifferentKondorAccount = async () => {
    const currentSigner = signerRef.current;
    if (currentSigner?.name !== "kondor") return;
    const address = currentSigner.getAddress();
    const known = new Set((getStoredKondorAccounts() ?? []).map((account: KondorAccount) => account.address));
    const revision = ++walletRevision.current;
    pendingWalletAction.current = true;
    try {
      const accounts = await refreshKondorAccounts();
      if (revision !== walletRevision.current) return;
      if (!accounts.length) {
        setSigner(undefined);
        return { accounts };
      }
      const account = accounts.find((account) => !known.has(account.address))
        ?? pickKondorAccount(accounts, address)!;
      const nextSigner = getWalletSigner("kondor", account.address) as ExtendedSigner;
      nextSigner.name = "kondor";
      setSigner(nextSigner, accounts);
      return { accounts, selected: account.address !== address ? account : undefined };
    } finally {
      if (revision === walletRevision.current) pendingWalletAction.current = false;
    }
  };

  // Load saved wallets on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for stored Kondor accounts
      const storedKondorAccounts = getStoredKondorAccounts();
      if (storedKondorAccounts && storedKondorAccounts.length > 0) {
        // Reconnect to the account chosen here before, if Kondor still shares it
        const account = pickKondorAccount<KondorAccount>(storedKondorAccounts, getChosenAddress())!;
        const newSigner = getWalletSigner("kondor", account.address);
        (newSigner as ExtendedSigner).name = "kondor";
        setSigner(newSigner as ExtendedSigner);
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
  }, [setSigner]);

  // Load provider from localStorage on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // REST API endpoint for account history, balances, etc.
      let storedRestNode = localStorage.getItem(REST_NODE_STORAGE_KEY);
      // The server proxy only relays to trusted REST hosts; anything else
      // left over from an older version falls back to the default.
      const storedRestOrigin = normalizeRpcOrigin(storedRestNode);
      if (!storedRestNode || !storedRestOrigin || !KNOWN_REST_ORIGINS.has(storedRestOrigin)) {
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
  }, [setProvider]);

  // Update provider when jsonRpcNode changes
  useEffect(() => {
    if (jsonRpcNode) {
      const newProvider = new Provider([jsonRpcNode]);
      setProvider(newProvider);
      localStorage.setItem(RPC_NODE_STORAGE_KEY, jsonRpcNode);
    }
  }, [jsonRpcNode, setProvider]);

  // Update REST node storage when rpcNode changes
  useEffect(() => {
    if (rpcNode) {
      localStorage.setItem(REST_NODE_STORAGE_KEY, rpcNode);
    }
  }, [rpcNode]);

  // Handle Kondor account changes
  useEffect(() => {
    let mounted = true;
    const handleAccountsChanged = async () => {
      if (pendingWalletAction.current || signerRef.current?.name !== "kondor") return;
      const revision = ++walletRevision.current;
      try {
        const accounts = await kondor.getAccounts();
        if (!mounted || revision !== walletRevision.current) return;
        
        if (!accounts || accounts.length === 0) {
          // Disconnect if no accounts available
          setSigner(undefined);
          return;
        }
        
        // Keep the account chosen here if Kondor still shares it
        const account = pickKondorAccount<KondorAccount>(accounts, getChosenAddress())!;
        const newSigner = getWalletSigner("kondor", account.address);
        (newSigner as ExtendedSigner).name = "kondor";
        setSigner(newSigner as ExtendedSigner, accounts);
      } catch (error) {
        console.error("Error handling account change", error);
      }
    };

    // Subscribe to Kondor account changes
    if (typeof window !== 'undefined') {
      window.addEventListener("kondor_accountsChanged", handleAccountsChanged);
      
      return () => {
        mounted = false;
        walletRevision.current += 1;
        // Cleanup subscription
        window.removeEventListener("kondor_accountsChanged", handleAccountsChanged);
      };
    }
  }, [setSigner]);

  // Function to forget the saved address and wallet type
  const forgetAddress = () => {
    setSigner(undefined);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADDRESS_STORAGE_KEY);
      localStorage.removeItem(WALLET_TYPE_STORAGE_KEY);
      setSavedAddress(null);
      setSavedWalletType(null);
    }
  };

  const chooseKondorAccount = (account: KondorAccount) => {
    if (!kondorAccounts.some((shared) => shared.address === account.address)) return;
    const newSigner = getWalletSigner("kondor", account.address);
    (newSigner as ExtendedSigner).name = "kondor";
    setSigner(newSigner as ExtendedSigner, kondorAccounts);
  };

  return (
    <WalletContext.Provider value={{
      signer,
      setSigner,
      connect,
      pickDifferentKondorAccount,
      savedAddress,
      savedWalletType,
      forgetAddress,
      chooseKondorAccount,
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
