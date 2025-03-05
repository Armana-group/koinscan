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

// Add new storage key for accounts
export const KONDOR_ACCOUNTS_KEY = "koinos-explorer-kondor-accounts";
export const WALLET_CONNECT_SESSION_KEY = "koinos-explorer-wc-session";

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

// Add a function to request Kondor accounts
async function requestKondorAccounts() {
  // First check if Kondor is already connected
  let accounts = await kondor.getAccounts();
  
  // If no accounts, request connection once
  if (!accounts || accounts.length === 0) {
    await ensureKondorConnection();
    accounts = await kondor.getAccounts();
  }
  
  return accounts;
}

// Store Kondor accounts in localStorage
export async function storeKondorAccounts() {
  try {
    const accounts = await kondor.getAccounts();
    if (accounts && accounts.length > 0) {
      localStorage.setItem(KONDOR_ACCOUNTS_KEY, JSON.stringify(accounts));
      return accounts;
    }
  } catch (error) {
    console.error("Failed to store Kondor accounts:", error);
  }
  return null;
}

// Get stored Kondor accounts
export function getStoredKondorAccounts() {
  try {
    const accountsJson = localStorage.getItem(KONDOR_ACCOUNTS_KEY);
    if (accountsJson) {
      const accounts = JSON.parse(accountsJson);
      return accounts;
    }
  } catch (error) {
    console.error("Failed to parse stored Kondor accounts:", error);
  }
  return null;
}

// Update connectWallet function to store accounts
export async function connectWallet(walletName: WalletName): Promise<string> {
  switch (walletName) {
    case "kondor": {
      isKondorConnecting = true;
      try {
        const accounts = await requestKondorAccounts();
        if (!accounts || accounts.length === 0) {
          throw new Error("Please connect at least one account in Kondor");
        }
        
        // Store accounts in localStorage
        localStorage.setItem(KONDOR_ACCOUNTS_KEY, JSON.stringify(accounts));
        
        isKondorConnecting = false;
        kondorConnectionPromise = null;
        return accounts[0].address;
      } catch (e) {
        isKondorConnecting = false;
        kondorConnectionPromise = null;
        throw e;
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
      
      // Store wallet connect info
      localStorage.setItem(WALLET_CONNECT_SESSION_KEY, JSON.stringify({
        connected: true,
        address: address
      }));
      
      return address;
    }
    default: {
      throw new Error(`"${walletName}" not implemented`);
    }
  }
}

// Update disconnect function to clear stored accounts
export async function disconnectWallet(walletName: WalletName): Promise<void> {
  switch (walletName) {
    case "kondor": {
      isKondorConnecting = false;
      kondorConnectionPromise = null;
      localStorage.removeItem(KONDOR_ACCOUNTS_KEY);
      return;
    }
    case "walletConnect": {
      await walletConnectKoinos.disconnect();
      localStorage.removeItem(WALLET_CONNECT_SESSION_KEY);
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
