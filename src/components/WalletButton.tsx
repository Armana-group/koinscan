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
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import * as toast from "@/lib/toast";
import { useWallet } from "@/contexts/WalletContext";
import { useEffect, useState } from "react";
import * as kondor from "kondor-js";
import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface ExtendedSigner extends SignerInterface {
  name?: "kondor" | "walletConnect";
}

interface KondorAccount {
  address: string;
  name?: string;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(address.length - 4)}`;
}

export function WalletButton() {
  const { signer, setSigner, savedAddress, forgetAddress } = useWallet();
  const addr = (signer as ExtendedSigner)?.getAddress();
  const walletName = (signer as ExtendedSigner)?.name;
  const [kondorAccounts, setKondorAccounts] = useState<KondorAccount[]>([]);
  const router = useRouter();

  // Fetch Kondor accounts function (extracted from the commented useEffect)
  const fetchKondorAccounts = async () => {
    if (walletName === "kondor") {
      try {
        const accounts = await kondor.getAccounts();
        setKondorAccounts(accounts || []);
      } catch (error) {
        console.error("Failed to fetch Kondor accounts:", error);
        toast.error("Failed to fetch accounts");
      }
    }
  };

  // Fetch Kondor accounts
  /*
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
  */

  const handleWalletAction = async (action: WalletName | "disconnect" | "forget") => {
    try {
      if (action === "disconnect") {
        if (walletName) {
          await disconnectWallet(walletName);
        }
        setSigner(undefined);
        return;
      }

      if (action === "forget") {
        if (walletName) {
          await disconnectWallet(walletName);
        }
        setSigner(undefined);
        forgetAddress();
        toast.success("Address forgotten");
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

  // Show connected state if we have a signer or a saved address
  const isConnected = !!addr;
  const displayAddress = addr || savedAddress;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative flex items-center justify-center gap-2 transition-all w-auto px-3 h-10 rounded-lg focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-background/60 hover:shadow-sm bg-background/40 backdrop-blur-sm border border-border/40"
        >
          {displayAddress ? (
            <>
              <div className="flex items-center gap-2 max-w-[160px]">
                <div className="flex-shrink-0 w-5 h-5 rounded-full p-0.5 bg-background">
                  <Image
                    src={
                      walletName === "kondor"
                        ? kondorLogo
                        : walletName === "walletConnect"
                        ? walletConnectLogo
                        : kondorLogo
                    }
                    alt="wallet"
                    width={16}
                    height={16}
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                  <span className="text-sm font-medium truncate">{shortAddress(displayAddress)}</span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 ml-1 text-muted-foreground flex-shrink-0" />
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
        className="w-72 p-3 bg-background/95 backdrop-blur-sm border border-border/80 shadow-lg rounded-xl"
        sideOffset={8}
      >
        {!displayAddress ? (
          <>
            <div className="px-3 py-2 mb-1 text-sm font-medium text-muted-foreground">
              Connect Wallet
            </div>
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
            {/* Address card at the top */}
            <div className="px-4 py-3 mb-3 bg-muted/40 rounded-lg border border-border/60">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {isConnected ? 'Wallet Connected' : 'Remembered Address'}
                  </span>
                </div>
                <div className="text-sm font-medium">
                  {shortAddress(displayAddress)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors" 
                  onClick={() => {
                    navigator.clipboard.writeText(displayAddress);
                    toast.success("Address copied to clipboard");
                  }}>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-3 h-3"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Copy full address</span>
                </div>
              </div>
            </div>
            
            {/* New "View My Transactions" button */}
            <DropdownMenuItem 
              onClick={() => router.push(`/address/${displayAddress}`)}
              className="flex items-center px-4 py-3 my-1 rounded-lg cursor-pointer focus:bg-muted/80 hover:bg-muted/80"
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
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                View My Transactions
              </div>
            </DropdownMenuItem>
            
            {/* New "Search With My Address" button */}
            <DropdownMenuItem 
              onClick={() => {
                // Navigate to home page
                router.push('/');
                // Use setTimeout to ensure navigation completes before trying to access DOM elements
                setTimeout(() => {
                  // Find the search input and set its value to the user's address
                  const searchInput = document.querySelector('input[placeholder*="Search by address"]') as HTMLInputElement;
                  if (searchInput) {
                    searchInput.value = displayAddress;
                    searchInput.focus();
                    // Dispatch an input event to trigger any listeners
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }, 100);
              }}
              className="flex items-center px-4 py-3 my-1 rounded-lg cursor-pointer focus:bg-muted/80 hover:bg-muted/80"
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
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                Search With My Address
              </div>
            </DropdownMenuItem>
            
            {/* Add Manage Accounts button when connected to Kondor */}
            {isConnected && walletName === "kondor" && kondorAccounts.length === 0 && (
              <DropdownMenuItem 
                onClick={fetchKondorAccounts}
                className="flex items-center px-4 py-3 my-1 rounded-lg cursor-pointer focus:bg-muted/80 hover:bg-muted/80"
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
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Add Accounts
                </div>
              </DropdownMenuItem>
            )}
            
            {/* Show Kondor accounts if actively connected with Kondor */}
            {isConnected && walletName === "kondor" && kondorAccounts.length > 0 && (
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
            
            {/* Connect/Disconnect Options */}
            <div className="space-y-1">
              {!isConnected && (
                <>
                  <div className="px-3 py-2 mb-1 text-sm font-medium text-muted-foreground">
                    Connect Wallet
                  </div>
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
              )}
              
              {isConnected && (
                <DropdownMenuItem 
                  onClick={() => handleWalletAction("disconnect")}
                  className="flex items-center px-4 py-3 my-1 rounded-lg cursor-pointer text-amber-600 dark:text-amber-400 focus:bg-amber-50 dark:focus:bg-amber-950/50 hover:bg-amber-50 dark:hover:bg-amber-950/50"
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
                    Disconnect Wallet
                  </div>
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={() => handleWalletAction("forget")}
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
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Forget Address
                </div>
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 