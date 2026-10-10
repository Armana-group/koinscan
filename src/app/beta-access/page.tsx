"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@/components/chrome/WalletSheet";
import { useWallet } from "@/contexts/WalletContext";
import { getNicknameForWallet } from "@/config/beta-access";
import { hasWalletAccess, saveBetaAccess } from "@/lib/beta-access";
import { short } from "@/lib/format";
import * as toast from "@/lib/toast";
import { Lede, Page, Status, Title } from "@/components/ks/Page";

export default function BetaAccess() {
  const router = useRouter();
  const { signer } = useWallet();
  const [checking, setChecking] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const walletAddress = signer?.getAddress();

  useEffect(() => {
    if (!walletAddress) {
      setHasAccess(null);
      return;
    }
    const allowed = hasWalletAccess(walletAddress);
    setHasAccess(allowed);
    if (allowed) saveBetaAccess(walletAddress);
  }, [walletAddress]);

  useEffect(() => {
    if (hasAccess) router.push("/");
  }, [hasAccess, router]);

  const checkAccess = () => {
    setChecking(true);
    try {
      if (!walletAddress) {
        toast.error("Connect your wallet first");
        return;
      }
      if (hasWalletAccess(walletAddress)) {
        toast.success("Your wallet has beta access");
        saveBetaAccess(walletAddress);
        setHasAccess(true);
        setTimeout(() => router.push("/"), 1200);
      } else {
        toast.error("Your wallet is not on the beta list");
        setHasAccess(false);
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <Page>
      <Title>Early access</Title>
      <Lede>KoinScan is in closed beta. Connect a wallet that was invited and you are in.</Lede>
      {walletAddress ? (
        <Status tone={hasAccess === false ? "failed" : hasAccess ? "ok" : "quiet"}>
          Connected as <b>{getNicknameForWallet(walletAddress) ?? short(walletAddress)}</b>
          {hasAccess === false && ". This wallet is not on the list yet."}
        </Status>
      ) : (
        <Status tone="quiet">No wallet connected.</Status>
      )}
      <div className="ks-actions">
        {walletAddress ? (
          <button type="button" className="ks-btn" onClick={checkAccess} disabled={checking || hasAccess === true}>
            {checking ? "Checking…" : hasAccess ? "Access granted" : "Check access"}
          </button>
        ) : (
          <ConnectButton />
        )}
      </div>
      <p className="ks-foot">Public beta coming soon.</p>
    </Page>
  );
}
