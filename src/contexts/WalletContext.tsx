"use client";

import { SignerInterface } from "koilib";
import { createContext, useContext, useState, ReactNode } from "react";

interface ExtendedSigner extends SignerInterface {
  name?: "kondor" | "walletConnect";
}

interface WalletContextType {
  signer: ExtendedSigner | undefined;
  setSigner: (signer: ExtendedSigner | undefined) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [signer, setSigner] = useState<ExtendedSigner | undefined>(undefined);

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