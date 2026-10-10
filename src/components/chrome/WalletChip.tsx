"use client";

// The address chip in the header and the wallet card that drops from it:
// who you are, what you hold, and the account actions. The connect flow
// stays in the sheet; this only exists once an address is known.
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ProviderInterface } from "koilib";
import { useWallet } from "@/contexts/WalletContext";
import { useKoinPrice } from "@/hooks/useKoinPrice";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { disconnectWallet, type KondorAccount } from "@/koinos/wallets";
import { fmt, short } from "@/lib/format";
import { manaSummary } from "@/lib/mana";
import * as toast from "@/lib/toast";
import kondorLogo from "../images/kondor-logo.png";
import { useChrome } from "./ChromeProvider";
import { useNameOf } from "../ks/Named";
import { AccountBalance } from "./WalletSheet";

const WALLET_LABEL: Record<string, string> = { kondor: "Kondor", walletConnect: "WalletConnect" };

interface Rc {
  provider: ProviderInterface;
  address: string;
  value: string | null;
}

/** Resource credits (mana) for an address, keyed so a stale read never shows. */
function useMana(address: string | null): string | null | undefined {
  const { provider } = useWallet();
  const [loaded, setLoaded] = useState<Rc>();
  useEffect(() => {
    if (!provider || !address) return;
    let active = true;
    provider.getAccountRc(address).then(
      (value) => active && setLoaded({ provider, address, value }),
      () => active && setLoaded({ provider, address, value: null }),
    );
    return () => {
      active = false;
    };
  }, [provider, address]);
  return loaded?.provider === provider && loaded?.address === address ? loaded.value : undefined;
}

export function WalletChip() {
  const { walletCardOpen, toggleWalletCard, closeWalletCard, openConnect } = useChrome();
  const router = useRouter();
  const nameOf = useNameOf();
  const { signer, setSigner, savedAddress, savedWalletType, forgetAddress, chooseKondorAccount, pickDifferentKondorAccount, kondorAccounts } = useWallet();
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const address = signer?.getAddress() ?? savedAddress ?? null;
  const walletName = signer?.name ?? savedWalletType;
  const connected = Boolean(signer);

  const { balances, loading } = useWalletBalances(walletCardOpen ? address : null);
  const price = useKoinPrice();
  const rc = useMana(walletCardOpen ? address : null);

  // Click outside closes the card.
  useEffect(() => {
    if (!walletCardOpen) return;
    const onDown = (event: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) closeWalletCard();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [walletCardOpen, closeWalletCard]);

  if (!address) return null;

  const account = kondorAccounts.find((item) => item.address === address);
  const title = account?.name || nameOf(address, "Wallet");
  const koin = balances.find((item) => item.token.address === "koin");
  const vhp = balances.find((item) => item.token.address === "vhp");
  const others = balances.filter((item) => item.token.address !== "koin" && item.token.address !== "vhp" && item.numericValue > 0).length;
  const mana = manaSummary(rc ?? null, koin?.balance ?? null);
  const usd = koin && price !== null ? koin.numericValue * price : null;

  const copy = () => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied");
  };
  const go = (href: string) => {
    closeWalletCard();
    router.push(href);
  };
  const choose = (item: KondorAccount) => {
    chooseKondorAccount(item);
    toast.success(`Using ${item.name || short(item.address)}`);
    closeWalletCard();
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
    closeWalletCard();
  };
  const forget = async () => {
    forgetAddress();
    if (walletName) await disconnectWallet(walletName).catch(() => undefined);
    toast.success("Address forgotten.");
    closeWalletCard();
  };

  return (
    <div ref={wrap} className="ks-chipwrap">
      <button
        type="button"
        className={`ks-chip${connected ? "" : " remembered"}${walletCardOpen ? " open" : ""}`}
        onClick={toggleWalletCard}
        aria-expanded={walletCardOpen}
        aria-label="Wallet"
      >
        <span className="ks-dot" />
        <span className="full">{short(address, 4, 4)}</span>
        <span className="mini">{address.slice(0, 4)}…</span>
      </button>

      <div className="ks-wallet" role="dialog" aria-label="Wallet" aria-hidden={!walletCardOpen}>
        <div className="head">
          <b>{title}</b>
          <button type="button" className="addr" onClick={copy} title="Copy address" tabIndex={walletCardOpen ? 0 : -1}>
            {short(address, 6, 6)}
          </button>
        </div>
        <div className="via">
          <span className={`ks-dot${connected ? "" : " quiet"}`} />
          {connected ? `Connected with ${WALLET_LABEL[walletName ?? ""] ?? walletName}` : "Remembered · not connected"}
        </div>

        <div className="bal">
          <span className="big">
            {loading ? "…" : koin ? fmt(koin.numericValue, 2) : "0"}
            <small>KOIN</small>
          </span>
          {usd !== null && <span className="usd">≈ ${fmt(usd, 2)}</span>}
        </div>
        <div className="also">
          <span>
            <b>{loading ? "…" : vhp ? fmt(vhp.numericValue, 2) : "0"}</b> VHP
          </span>
          {others > 0 && (
            <span>
              <b>{others}</b> other {others === 1 ? "token" : "tokens"}
            </span>
          )}
        </div>
        {mana && (
          <div className="mana">
            <div className="lab">
              <span>Mana</span>
              <span>
                <b>{mana.percent}%</b> · {mana.fullIn}
              </span>
            </div>
            <div className="bar">
              <i style={{ width: `${mana.percent}%` }} />
            </div>
          </div>
        )}

        <div className="rows">
          <button type="button" className="row" onClick={() => go(`/address/${address}`)} tabIndex={walletCardOpen ? 0 : -1}>
            <span>
              <span className="t">My address</span>
              <span className="d">Balances and activity</span>
            </span>
            <span />
            <span className="chev">›</span>
          </button>

          {connected &&
            walletName === "kondor" &&
            kondorAccounts
              .filter((item) => item.address !== address)
              .map((item, index) => (
                <button key={item.address} type="button" className="row" onClick={() => choose(item)} tabIndex={walletCardOpen ? 0 : -1}>
                  <span className="who">
                    <span className="mark">
                      <Image src={kondorLogo} alt="" width={22} height={22} />
                    </span>
                    <span>
                      <span className="t">Switch to {item.name || `Account ${index + 1}`}</span>
                      <span className="d">{short(item.address)}</span>
                    </span>
                  </span>
                  <span className="amt">
                    <AccountBalance address={item.address} />
                  </span>
                  <span className="chev">›</span>
                </button>
              ))}

          {connected && walletName === "kondor" && (
            <button type="button" className="row" onClick={refreshAccounts} disabled={busy} tabIndex={walletCardOpen ? 0 : -1}>
              <span>
                <span className="t">Use a different account</span>
                <span className="d">Refreshes what Kondor shares</span>
              </span>
              <span />
              <span className="chev">›</span>
            </button>
          )}

          {!connected && (
            <button type="button" className="row" onClick={openConnect} tabIndex={walletCardOpen ? 0 : -1}>
              <span>
                <span className="t">Connect</span>
                <span className="d">Kondor or WalletConnect</span>
              </span>
              <span />
              <span className="chev">›</span>
            </button>
          )}

          {connected && (
            <button type="button" className="row" onClick={disconnect} tabIndex={walletCardOpen ? 0 : -1}>
              <span>
                <span className="t">Disconnect</span>
                <span className="d">Keeps the address remembered</span>
              </span>
              <span />
              <span className="chev">›</span>
            </button>
          )}

          <button type="button" className="row bad" onClick={forget} tabIndex={walletCardOpen ? 0 : -1}>
            <span>
              <span className="t">Forget this address</span>
              <span className="d">Removes it from this browser</span>
            </span>
            <span />
            <span className="chev">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
