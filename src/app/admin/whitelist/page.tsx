"use client";

import { useState } from "react";
import { Field } from "@/components/ks/Controls";
import { Empty, Lede, Page, Section, H2, Title } from "@/components/ks/Page";
import { Row } from "@/components/ks/Row";

interface WhitelistData {
  whitelisted: string[];
  dev: string[];
}

export default function WhitelistAdmin() {
  const [data, setData] = useState<WhitelistData>({ whitelisted: [], dev: [] });
  const [loaded, setLoaded] = useState(false);
  const [newWallet, setNewWallet] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` });

  const call = async (init?: RequestInit) => {
    if (!adminToken) {
      setError("Enter the admin token first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/whitelist", { headers: headers(), ...init });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Request failed");
      setData(body);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Title>Whitelist</Title>
      <Lede>Wallets allowed into the closed beta. Needs the server admin token.</Lede>
      <Field id="admin-token" label="Admin token">
        <input id="admin-token" type="password" className="ks-input" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} disabled={busy} />
      </Field>
      <div className="ks-actions" style={{ marginTop: 14 }}>
        <button type="button" className="ks-btn ghost md" onClick={() => call()} disabled={busy || !adminToken}>
          {busy ? "Loading…" : "Load whitelist"}
        </button>
      </div>
      {error && <p className="ks-foot text-bad">{error}</p>}

      <Section label="Add">
        <H2>Add a wallet</H2>
        <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
          <input className="ks-input" placeholder="Wallet address" value={newWallet} onChange={(e) => setNewWallet(e.target.value)} disabled={busy || !adminToken} aria-label="Wallet address" />
          <button
            type="button"
            className="ks-btn md"
            onClick={async () => {
              await call({ method: "POST", body: JSON.stringify({ wallet: newWallet, action: "add" }) });
              setNewWallet("");
            }}
            disabled={busy || !adminToken || !newWallet}
          >
            Add
          </button>
        </div>
      </Section>

      <Section label="Whitelisted" className="ks-list">
        <H2 count={loaded ? data.whitelisted.length : undefined}>Whitelisted wallets</H2>
        {!loaded && <Empty>Load the whitelist to see it.</Empty>}
        {loaded && data.whitelisted.length === 0 && <Empty>No wallets whitelisted yet.</Empty>}
        {data.whitelisted.map((wallet) => (
          <Row
            key={wallet}
            title={<span className="ks-mono">{wallet}</span>}
            right={
              confirming === wallet ? (
                <span className="flex items-center gap-2">
                  <button type="button" className="ks-btn danger md" onClick={() => call({ method: "POST", body: JSON.stringify({ wallet, action: "remove" }) }).then(() => setConfirming(null))} disabled={busy}>
                    Confirm remove
                  </button>
                  <button type="button" className="ks-btn ghost md" onClick={() => setConfirming(null)} disabled={busy}>
                    Keep
                  </button>
                </span>
              ) : (
                <button type="button" className="ks-btn ghost md" onClick={() => setConfirming(wallet)} disabled={busy || !adminToken}>
                  Remove
                </button>
              )
            }
            flat
          />
        ))}
      </Section>
    </Page>
  );
}
