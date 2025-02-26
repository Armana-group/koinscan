"use client";

import { SignerInterface } from "koilib";
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import * as kondor from "kondor-js";
import { getWalletSigner } from "@/koinos/wallets";

interface ExtendedSigner extends SignerInterface {
  name?: "kondor" | "walletConnect" | "mkw";
}

interface WalletContextType {
  signer: ExtendedSigner | undefined;
  setSigner: (signer: ExtendedSigner | undefined) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [signer, setSigner] = useState<ExtendedSigner | undefined>(undefined);

  useEffect(() => {
    // Handle Kondor account changes
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
    window.addEventListener("kondor_accountsChanged", handleAccountsChanged);

    return () => {
      // Cleanup subscription
      window.removeEventListener("kondor_accountsChanged", handleAccountsChanged);
    };
  }, [signer]);

  return (
    <WalletContext.Provider value={{ signer, setSigner }}>
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