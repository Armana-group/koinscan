import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SignerInterface } from "koilib";
import styles from "../app/page.module.css";
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
} from "./ui/dropdown-menu";
import { toast } from "sonner";

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(address.length - 4)}`;
}

export const HeaderComponent = (props: {
  onChange?: (signer: SignerInterface | undefined) => void;
}) => {
  const [addr, setAddr] = useState<string>("");
  const [walletName, setWalletName] = useState<WalletName | undefined>(undefined);
  const router = useRouter();

  const handleWalletAction = async (action: WalletName | "disconnect") => {
    try {
      if (action === "disconnect") {
        if (walletName) {
          await disconnectWallet(walletName);
          setWalletName(undefined);
        }
        setAddr("");
        if (props.onChange) props.onChange(undefined);
        return;
      }

      const wName = action;
      const address = await connectWallet(wName);
      const signer = getWalletSigner(wName, address);

      setAddr(shortAddress(address));
      setWalletName(wName);
      if (props.onChange) props.onChange(signer);
    } catch (error) {
      toast.error((error as Error).message);
      console.error(error);
    }
  };

  return (
    <nav className={styles.nav}>
      <div
        className={styles.titleHeader}
        onClick={() => {
          router.push("/");
        }}
      >
        <div className={styles.headerColor1}></div>
        <div className={styles.headerColor2}></div>
        <div className={styles.headerColor3}></div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`relative flex items-center justify-center transition-all ${
              addr ? "w-36 px-3" : "w-12"
            } h-12 rounded-full focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent`}
          >
            {addr ? (
              <>
                <span className="text-sm truncate">{addr}</span>
                <div className="w-4 h-4 flex-shrink-0 ml-2">
                  <Image
                    src={
                      walletName === "kondor"
                        ? kondorLogo
                        : walletName === "walletConnect"
                        ? walletConnectLogo
                        : mkwLogo
                    }
                    alt="wallet"
                    width={16}
                    height={16}
                  />
                </div>
              </>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                className="h-6 w-6"
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
          className="w-56 p-2 bg-background/80 backdrop-blur-sm border border-border"
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
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
};
