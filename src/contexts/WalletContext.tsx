"use client";

import { SignerInterface } from "koilib";
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import * as kondor from "kondor-js";
import { WalletName, connectWallet, disconnectWallet, getWalletSigner } from "@/koinos/wallets";

// Local storage keys
const ADDRESS_STORAGE_KEY = "koinos-explorer-address";

interface ExtendedSigner extends SignerInterface {
  name?: WalletName;
}

interface WalletContextType {
  signer: ExtendedSigner | undefined;
  setSigner: (signer: ExtendedSigner | undefined) => void;
  savedAddress: string | null;
  forgetAddress: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [signer, setSigner] = useState<ExtendedSigner | undefined>(undefined);
  const [savedAddress, setSavedAddress] = useState<string | null>(null);

  // Load saved address on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAddress = localStorage.getItem(ADDRESS_STORAGE_KEY);
      if (storedAddress) {
        setSavedAddress(storedAddress);
      }
    }
  }, []);

  // Save address to localStorage when connected
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (signer && signer.getAddress) {
        const address = signer.getAddress();
        localStorage.setItem(ADDRESS_STORAGE_KEY, address);
        setSavedAddress(address);
      }
    }
  }, [signer]);

  // Function to forget the saved address
  const forgetAddress = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADDRESS_STORAGE_KEY);
      setSavedAddress(null);
    }
  };

  // Handle Kondor account changes
  useEffect(() => {
    const handleAccountsChanged = async () => {
      if (!signer || signer.name !== "kondor") return;
      
      const accounts = await kondor.getAccounts();
      if (!accounts || accounts.length === 0) {
        // Disconnect if no accounts available
        setSigner(undefined);
        return;
      }

      // Update signer with new account
      const newSigner = getWalletSigner("kondor", accounts[0].address);
      (newSigner as ExtendedSigner).name = "kondor";
      setSigner(newSigner as ExtendedSigner);
    };

    // Subscribe to Kondor account changes
    if (typeof window !== 'undefined') {
      window.addEventListener("kondor_accountsChanged", handleAccountsChanged);
      
      return () => {
        // Cleanup subscription
        window.removeEventListener("kondor_accountsChanged", handleAccountsChanged);
      };
    }
  }, [signer]);

  return (
    <WalletContext.Provider value={{ signer, setSigner, savedAddress, forgetAddress }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
} 