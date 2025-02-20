"use client";

import { SignerInterface } from "koilib";
import * as kondor from "kondor-js";
import MyKoinosWallet from "@roamin/my-koinos-wallet-sdk";
import {
  ChainIds,
  Methods,
  WebWalletConnectKoinos,
} from "@armana/walletconnect-koinos-sdk-js";
import { NETWORK_NAME, WALLET_CONNECT_MODAL_SIGN_OPTIONS } from "./constants";

export type WalletName = "kondor" | "mkw" | "walletConnect";

// Initialize wallets only in browser environment
let walletConnectKoinos: WebWalletConnectKoinos | null = null;
let mkw: MyKoinosWallet | null = null;

if (typeof window !== 'undefined') {
  walletConnectKoinos = new WebWalletConnectKoinos(
    WALLET_CONNECT_MODAL_SIGN_OPTIONS,
  );
  mkw = new MyKoinosWallet(
    "https://my-koinos-wallet.vercel.app/embed/wallet-connector",
  );
}

export async function connectWallet(walletName: WalletName) {
  if (typeof window === 'undefined') {
    throw new Error('Cannot connect wallet in server environment');
  }

  switch (walletName) {
    case "kondor": {
      const accounts = await kondor.getAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error("wallet connection failed: No accounts selected");
      }
      return accounts[0].address;
    }
    case "walletConnect": {
      if (!walletConnectKoinos) {
        throw new Error('WalletConnect not initialized');
      }
      const [address] = await walletConnectKoinos.connect(
        [
          (NETWORK_NAME as string) === "mainnet"
            ? ChainIds.Mainnet
            : ChainIds.Harbinger,
        ],
        [
          Methods.SignTransaction,
          Methods.SignAndSendTransaction,
          Methods.WaitForTransaction,
        ],
      );
      return address;
    }
    case "mkw": {
      if (!mkw) {
        throw new Error('MyKoinosWallet not initialized');
      }
      await mkw.connect();
      await mkw.requestPermissions({
        accounts: ["getAccounts"],
        provider: ["readContract", "wait"],
        signer: ["signAndSendTransaction"],
      });
      const accounts = await mkw.getAccounts();
      return accounts[0].address;
    }
    default: {
      throw new Error(`"${walletName}" not implemented`);
    }
  }
}

export async function disconnectWallet(walletName: WalletName) {
  if (typeof window === 'undefined') {
    return;
  }

  switch (walletName) {
    case "kondor": {
      return;
    }
    case "walletConnect": {
      if (walletConnectKoinos) {
        await walletConnectKoinos.disconnect();
      }
      return;
    }
    case "mkw": {
      return;
    }
    default: {
      throw new Error(`"${walletName}" not implemented`);
    }
  }
}

export function getWalletSigner(
  walletName: WalletName,
  address: string,
): SignerInterface {
  if (typeof window === 'undefined') {
    throw new Error('Cannot get wallet signer in server environment');
  }

  switch (walletName) {
    case "kondor": {
      return kondor.getSigner(address);
    }
    case "walletConnect": {
      if (!walletConnectKoinos) {
        throw new Error('WalletConnect not initialized');
      }
      return walletConnectKoinos.getSigner(address);
    }
    case "mkw": {
      if (!mkw) {
        throw new Error('MyKoinosWallet not initialized');
      }
      return mkw.getSigner(address);
    }
    default: {
      throw new Error(`"${walletName}" not implemented`);
    }
  }
}
