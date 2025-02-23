import Image from "next/image";
import { SignerInterface } from "koilib";
import {
  WalletName,
  connectWallet,
  disconnectWallet,
  getWalletSigner,
} from "../koinos/wallets";
import kondorLogo from "./images/kondor-logo.png";
import walletConnectLogo from "./images/wallet-connect-logo.png";
import mkwLogo from "./images/mkw-logo.png";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import { useWallet } from "@/contexts/WalletContext";
import { useEffect, useState } from "react";
import * as kondor from "kondor-js";
import { Check, ChevronDown } from "lucide-react";

interface ExtendedSigner extends SignerInterface {
  name?: "kondor" | "walletConnect" | "mkw";
}

interface KondorAccount {
  address: string;
  name?: string;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(address.length - 4)}`;
}

export function WalletButton() {
  const { signer, setSigner } = useWallet();
  const addr = (signer as ExtendedSigner)?.getAddress();
  const walletName = (signer as ExtendedSigner)?.name;
  const [kondorAccounts, setKondorAccounts] = useState<KondorAccount[]>([]);

  // Fetch Kondor accounts
  useEffect(() => {
    const fetchKondorAccounts = async () => {
      if (walletName === "kondor") {
        try {
          const accounts = await kondor.getAccounts();
          setKondorAccounts(accounts || []);
        } catch (error) {
          console.error("Failed to fetch Kondor accounts:", error);
        }
      }
    };

    fetchKondorAccounts();

    // Listen for account changes
    const handleAccountsChanged = () => {
      fetchKondorAccounts();
    };

    window.addEventListener("kondor_accountsChanged", handleAccountsChanged);
    return () => {
      window.removeEventListener("kondor_accountsChanged", handleAccountsChanged);
    };
  }, [walletName]);

  const handleWalletAction = async (action: WalletName | "disconnect") => {
    try {
      if (action === "disconnect") {
        if (walletName) {
          await disconnectWallet(walletName);
        }
        setSigner(undefined);
        return;
      }

      const wName = action;
      const address = await connectWallet(wName);
      const signer = getWalletSigner(wName, address);
      (signer as ExtendedSigner).name = wName;
      setSigner(signer as ExtendedSigner);
    } catch (error) {
      toast.error((error as Error).message);
      console.error(error);
    }
  };

  const switchKondorAccount = async (account: KondorAccount) => {
    try {
      const newSigner = getWalletSigner("kondor", account.address);
      (newSigner as ExtendedSigner).name = "kondor";
      setSigner(newSigner as ExtendedSigner);
    } catch (error) {
      toast.error((error as Error).message);
      console.error(error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`relative flex items-center justify-center gap-2 transition-all ${
            addr ? "w-auto px-3" : "w-10"
          } h-10 rounded-full focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent`}
        >
          {addr ? (
            <>
              <div className="w-5 h-5 flex-shrink-0 rounded-full bg-background/80 p-0.5">
                <Image
                  src={
                    walletName === "kondor"
                      ? kondorLogo
                      : walletName === "walletConnect"
                      ? walletConnectLogo
                      : walletName === "mkw"
                      ? mkwLogo
                      : mkwLogo
                  }
                  alt="wallet"
                  width={16}
                  height={16}
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <span className="text-sm">{shortAddress(addr)}</span>
              <ChevronDown className="w-4 h-4 ml-1 text-muted-foreground" />
            </>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              className="h-5 w-5"
            >
              <path
                fill="currentColor"
                d="M24 32L0 32 0 56 0 456l0 24 24 0 464 0 24 0 0-24 0-304 0-24-24 0-368 0-24 0 0 48 24 0 344 0 0 256L48 432 48 80l408 0 24 0 0-48-24 0L24 32zM384 336a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"
              />
            </svg>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-64 p-2 bg-background/80 backdrop-blur-sm border border-border shadow-lg"
        sideOffset={8}
      >
        {!addr ? (
          <>
            <DropdownMenuItem 
              onClick={() => handleWalletAction("kondor")}
              className="flex items-center px-4 py-3 my-1 rounded-lg cursor-pointer focus:bg-muted/80 hover:bg-muted/80"
            >
              <div className="flex items-center gap-3 text-sm font-medium">
                <div className="w-6 h-6 p-1 rounded-full bg-violet-100 dark:bg-violet-950/50">
                  <Image
                    src={kondorLogo}
                    alt="kondor"
                    width={20}
                    height={20}
                    className="w-full h-full object-contain"
                  />
                </div>
                Kondor
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleWalletAction("walletConnect")}
              className="flex items-center px-4 py-3 my-1 rounded-lg cursor-pointer focus:bg-muted/80 hover:bg-muted/80"
            >
              <div className="flex items-center gap-3 text-sm font-medium">
                <div className="w-6 h-6 p-1 rounded-full bg-blue-100 dark:bg-blue-950/50">
                  <Image
                    src={walletConnectLogo}
                    alt="wallet-connect"
                    width={20}
                    height={20}
                    className="w-full h-full object-contain"
                  />
                </div>
                Wallet Connect
              </div>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            {/* Show Kondor accounts if using Kondor */}
            {walletName === "kondor" && kondorAccounts.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Switch Account
                </div>
                {kondorAccounts.map((account) => (
                  <DropdownMenuItem
                    key={account.address}
                    onClick={() => switchKondorAccount(account)}
                    className="flex items-center justify-between px-4 py-3 my-1 rounded-lg cursor-pointer focus:bg-muted/80 hover:bg-muted/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 p-1 rounded-full bg-violet-100 dark:bg-violet-950/50">
                        <Image
                          src={kondorLogo}
                          alt="kondor"
                          width={20}
                          height={20}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {account.name || shortAddress(account.address)}
                        </span>
                        {account.name && (
                          <span className="text-xs text-muted-foreground">
                            {shortAddress(account.address)}
                          </span>
                        )}
                      </div>
                    </div>
                    {account.address === addr && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="my-2" />
              </>
            )}
            <DropdownMenuItem 
              onClick={() => handleWalletAction("disconnect")}
              className="flex items-center px-4 py-3 my-1 rounded-lg cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/50 hover:bg-red-50 dark:hover:bg-red-950/50"
            >
              <div className="flex items-center gap-3 text-sm font-medium">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-5 h-5"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Disconnect
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 