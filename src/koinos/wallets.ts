import { SignerInterface } from "koilib";
import * as kondor from "kondor-js";
import {
  ChainIds,
  Methods,
  WebWalletConnectKoinos,
} from "@armana/walletconnect-koinos-sdk-js";
import { NETWORK_NAME, WALLET_CONNECT_MODAL_SIGN_OPTIONS } from "./constants";

export type WalletName = "kondor" | "walletConnect";

// setup wallets
const walletConnectKoinos = new WebWalletConnectKoinos(
  WALLET_CONNECT_MODAL_SIGN_OPTIONS,
);

// Track Kondor connection state
let isKondorConnecting = false;
let kondorConnectionPromise: Promise<void> | null = null;

async function ensureKondorConnection() {
  // If already connecting, wait for the existing connection attempt
  if (isKondorConnecting && kondorConnectionPromise) {
    return kondorConnectionPromise;
  }

  isKondorConnecting = true;
  kondorConnectionPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      isKondorConnecting = false;
      kondorConnectionPromise = null;
      reject(new Error("Kondor connection timeout"));
    }, 30000); // 30 second timeout

    (window as any).kondor?.enable()
      .then(() => {
        clearTimeout(timeout);
        isKondorConnecting = false;
        kondorConnectionPromise = null;
        resolve();
      })
      .catch((error: any) => {
        clearTimeout(timeout);
        isKondorConnecting = false;
        kondorConnectionPromise = null;
        reject(error);
      });
  });

  return kondorConnectionPromise;
}

export async function connectWallet(walletName: WalletName) {
  switch (walletName) {
    case "kondor": {
      try {
        // First check if Kondor is already connected
        let accounts = await kondor.getAccounts();
        
        // If no accounts, request connection once
        if (!accounts || accounts.length === 0) {
          await ensureKondorConnection();
          accounts = await kondor.getAccounts();
        }
        
        // Verify we have accounts after connection
        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts selected in Kondor");
        }

        return accounts[0].address;
      } catch (error) {
        isKondorConnecting = false;
        kondorConnectionPromise = null;
        throw new Error("Failed to connect to Kondor");
      }
    }
    case "walletConnect": {
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
    default: {
      throw new Error(`"${walletName}" not implemented`);
    }
  }
}

export async function disconnectWallet(walletName: WalletName) {
  switch (walletName) {
    case "kondor": {
      isKondorConnecting = false;
      kondorConnectionPromise = null;
      return;
    }
    case "walletConnect": {
      await walletConnectKoinos.disconnect();
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
  switch (walletName) {
    case "kondor": {
      return kondor.getSigner(address) as any as SignerInterface;
    }
    case "walletConnect": {
      return walletConnectKoinos.getSigner(address);
    }
    default: {
      throw new Error(`"${walletName}" not implemented`);
    }
  }
}
