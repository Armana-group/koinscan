"use client";

// Connect a wallet or pick which Kondor account to use. Everything after
// that (balances, switching, disconnect, forget) lives in the address chip's
// card in the header. The logic is the wallet context's; this is only the
// sheet around it.
import Image from "next/image";
import { useEffect, useState } from "react";
import type { ProviderInterface } from "koilib";
import { useWallet } from "@/contexts/WalletContext";
import type { KondorAccount, WalletName } from "@/koinos/wallets";
import { readKoinBalance } from "@/lib/koin-balance";
import { short } from "@/lib/format";
import * as toast from "@/lib/toast";
import kondorLogo from "../images/kondor-logo.png";
import walletConnectLogo from "../images/wallet-connect-logo.png";
import { useChrome } from "./ChromeProvider";
import { Sheet } from "./Sheet";

const row = "ks-row no-chev";

export function AccountBalance({ address }: { address: string }) {
  const { provider } = useWallet();
  const [state, setState] = useState<{ provider: ProviderInterface; address: string; value: string | null }>();
  useEffect(() => {
    if (!provider) return;
    let active = true;
    readKoinBalance(provider, address).then(
      (value) => active && setState({ provider, address, value }),
      () => active && setState({ provider, address, value: null }),
    );
    return () => {
      active = false;
    };
  }, [provider, address]);
  const current = state?.provider === provider && state?.address === address ? state : undefined;
  return <span className="ks-amt plain">{!current ? "…" : current.value === null ? "—" : `${current.value} KOIN`}</span>;
}

export function WalletSheet() {
  const { walletOpen, closeWallet } = useChrome();
  const { signer, connect, chooseKondorAccount, kondorAccounts } = useWallet();
  const [busy, setBusy] = useState(false);

  const connected = Boolean(signer);

  const connectWith = async (wallet: WalletName) => {
    setBusy(true);
    try {
      const result = await connect(wallet);
      if (result === "connected") closeWallet();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const choose = (account: KondorAccount) => {
    chooseKondorAccount(account);
    toast.success(`Using ${account.name || short(account.address)}`);
    closeWallet();
  };

  const choosing = !connected && kondorAccounts.length > 0;

  return (
    <Sheet open={walletOpen} onOpenChange={(open) => !open && closeWallet()} title={choosing ? "Choose an account" : "Connect a wallet"}>
      <div className="ks-list mt-5">
        {choosing && (
          <>
            {kondorAccounts.map((account, index) => (
              <button key={account.address} type="button" className={row} onClick={() => choose(account)}>
                <span className="ks-mark">
                  <Image src={kondorLogo} alt="" width={24} height={24} />
                </span>
                <span className="ks-what">
                  <span className="ks-t">{account.name || `Account ${index + 1}`}</span>
                  <span className="ks-d">{short(account.address)}</span>
                </span>
                <AccountBalance address={account.address} />
              </button>
            ))}
            {kondorAccounts.length === 1 && (
              <p className="ks-foot">Kondor shares only this account. To share another, update KoinScan in Kondor’s Settings › Connected sites.</p>
            )}
          </>
        )}

        {!connected && (
          <>
            <button type="button" className={row} onClick={() => connectWith("kondor")} disabled={busy}>
              <span className="ks-mark">
                <Image src={kondorLogo} alt="" width={24} height={24} />
              </span>
              <span className="ks-what">
                <span className="ks-t">Kondor</span>
                <span className="ks-d">Browser extension</span>
              </span>
              <span />
            </button>
            <button type="button" className={row} onClick={() => connectWith("walletConnect")} disabled={busy}>
              <span className="ks-mark">
                <Image src={walletConnectLogo} alt="" width={24} height={24} />
              </span>
              <span className="ks-what">
                <span className="ks-t">WalletConnect</span>
                <span className="ks-d">Mobile wallets</span>
              </span>
              <span />
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}

/** A pill that opens the wallet sheet. Pages use it where the mockups say "Connect wallet". */
export function ConnectButton({ label = "Connect wallet", className = "" }: { label?: string; className?: string }) {
  const { openWallet } = useChrome();
  return (
    <button type="button" className={`ks-btn ${className}`} onClick={openWallet}>
      {label}
    </button>
  );
}
