"use client";

// Connect, pick a Kondor account, switch, disconnect or forget. The logic is
// the wallet context's; this is only the card around it.
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { disconnectWallet, type KondorAccount, type WalletName } from "@/koinos/wallets";
import { readKoinBalance } from "@/lib/koin-balance";
import { short } from "@/lib/format";
import * as toast from "@/lib/toast";
import kondorLogo from "../images/kondor-logo.png";
import walletConnectLogo from "../images/wallet-connect-logo.png";
import { useChrome } from "./ChromeProvider";
import { Sheet } from "./Sheet";
import { useEffect } from "react";
import type { ProviderInterface } from "koilib";

const row = "ks-row no-chev";

function AccountBalance({ address }: { address: string }) {
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
  const router = useRouter();
  const { signer, setSigner, connect, pickDifferentKondorAccount, savedAddress, savedWalletType, forgetAddress, chooseKondorAccount, kondorAccounts } =
    useWallet();
  const [busy, setBusy] = useState(false);

  const address = signer?.getAddress() ?? savedAddress;
  const walletName = signer?.name ?? savedWalletType;
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

  const refreshAccounts = async () => {
    setBusy(true);
    try {
      const result = await pickDifferentKondorAccount();
      if (!result) return;
      if (!result.accounts.length) toast.error("Kondor shares no accounts with KoinScan.");
      else if (result.selected) toast.success(`Switched to ${result.selected.name || short(result.selected.address)}`);
      else if (result.accounts.length === 1 && result.accounts[0].address === address)
        toast.custom("Kondor only shares this account. In Kondor, open Settings › Connected sites to change what KoinScan can see.");
      else toast.success("Accounts refreshed.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setSigner(undefined);
    if (walletName) await disconnectWallet(walletName).catch(() => undefined);
    closeWallet();
  };

  const forget = async () => {
    forgetAddress();
    if (walletName) await disconnectWallet(walletName).catch(() => undefined);
    toast.success("Address forgotten.");
    closeWallet();
  };

  const choosing = !connected && kondorAccounts.length > 0;

  return (
    <Sheet open={walletOpen} onOpenChange={(open) => !open && closeWallet()} title={address ? "Wallet" : "Connect a wallet"}>
      {address && (
        <div className="ks-hashline" style={{ marginTop: 6 }}>
          <span className={`ks-dot${connected ? "" : " pending"}`} />
          <span>{connected ? "Connected" : "Remembered"}</span>
          <span className="text-ink">{short(address, 8, 6)}</span>
          <button
            type="button"
            className="ks-copy"
            onClick={() => {
              navigator.clipboard.writeText(address);
              toast.success("Address copied");
            }}
          >
            copy
          </button>
        </div>
      )}

      <div className="ks-list mt-5">
        {choosing && (
          <>
            <p className="ks-h2">Choose an account</p>
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

        {address && (
          <button
            type="button"
            className={row}
            onClick={() => {
              closeWallet();
              router.push(`/address/${address}`);
            }}
          >
            <span className="ks-mark glyph">›</span>
            <span className="ks-what">
              <span className="ks-t">My address</span>
              <span className="ks-d">Balances and activity</span>
            </span>
            <span />
          </button>
        )}

        {connected && walletName === "kondor" && kondorAccounts.length > 1 && (
          <>
            {kondorAccounts
              .filter((account) => account.address !== address)
              .map((account, index) => (
                <button key={account.address} type="button" className={row} onClick={() => choose(account)}>
                  <span className="ks-mark">
                    <Image src={kondorLogo} alt="" width={24} height={24} />
                  </span>
                  <span className="ks-what">
                    <span className="ks-t">Switch to {account.name || `Account ${index + 1}`}</span>
                    <span className="ks-d">{short(account.address)}</span>
                  </span>
                  <AccountBalance address={account.address} />
                </button>
              ))}
          </>
        )}

        {connected && walletName === "kondor" && (
          <button type="button" className={row} onClick={refreshAccounts} disabled={busy}>
            <span className="ks-mark">
              <Image src={kondorLogo} alt="" width={24} height={24} />
            </span>
            <span className="ks-what">
              <span className="ks-t">Use a different account</span>
              <span className="ks-d">Refreshes what Kondor shares</span>
            </span>
            <span />
          </button>
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

        {connected && (
          <button type="button" className={row} onClick={disconnect}>
            <span className="ks-mark glyph">×</span>
            <span className="ks-what">
              <span className="ks-t">Disconnect</span>
              <span className="ks-d">Keeps the address remembered</span>
            </span>
            <span />
          </button>
        )}
        {address && (
          <button type="button" className={`${row} last`} onClick={forget}>
            <span className="ks-mark glyph text-bad">×</span>
            <span className="ks-what">
              <span className="ks-t text-bad">Forget this address</span>
              <span className="ks-d">Removes it from this browser</span>
            </span>
            <span />
          </button>
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
