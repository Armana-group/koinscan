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

// setup wallets
const walletConnectKoinos = new WebWalletConnectKoinos(
  WALLET_CONNECT_MODAL_SIGN_OPTIONS,
);
const mkw = new MyKoinosWallet(
  "https://my-koinos-wallet.vercel.app/embed/wallet-connector",
);

export async function connectWallet(walletName: WalletName) {
  switch (walletName) {
    case "kondor": {
      const accounts = await kondor.getAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error("wallet connection failed: No accounts selected");
      }
      return accounts[0].address;
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
    case "mkw": {
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
  switch (walletName) {
    case "kondor": {
      return;
    }
    case "walletConnect": {
      await walletConnectKoinos.disconnect();
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
  switch (walletName) {
    case "kondor": {
      return kondor.getSigner(address);
    }
    case "walletConnect": {
      return walletConnectKoinos.getSigner(address);
    }
    case "mkw": {
      return mkw.getSigner(address);
    }
    default: {
      throw new Error(`"${walletName}" not implemented`);
    }
  }
}
