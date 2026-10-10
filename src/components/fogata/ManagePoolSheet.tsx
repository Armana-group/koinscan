"use client";

// Owner-only settings for a pool: parameters, reserved KOIN, the node's
// public key, and delisting. Same chain calls as before.
import { Contract, utils } from "koilib";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/chrome/Sheet";
import { Field } from "@/components/ks/Controls";
import { useWallet } from "@/contexts/WalletContext";
import { abiPob } from "@/koinos/abis";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import { FOGATA2_LIST_POOLS_CONTRACT_ID, KOIN_CONTRACT_ID, POB_CONTRACT_ID } from "@/koinos/constants";
import { fmtRaw } from "@/lib/format";
import * as toast from "@/lib/toast";
import { BeneficiariesEditor, toBaseUnits, validatePoolParams, type Beneficiary } from "./pool-form";

export interface ManagePoolProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolId: string;
  poolOwner: string | null;
  initial: { name: string; image: string; description: string; beneficiaries: Beneficiary[]; paymentPeriod: string };
  reservedKoin: string | null;
  registeredPublicKey: string;
  onChanged: () => Promise<void>;
}

export function ManagePoolSheet({ open, onOpenChange, poolId, poolOwner, initial, reservedKoin, registeredPublicKey, onChanged }: ManagePoolProps) {
  const router = useRouter();
  const { provider, signer, savedAddress } = useWallet();
  const account = signer?.getAddress() ?? savedAddress ?? null;
  const [submitting, setSubmitting] = useState(false);
  const [poolName, setPoolName] = useState(initial.name);
  const [poolImage, setPoolImage] = useState(initial.image);
  const [poolDescription, setPoolDescription] = useState(initial.description);
  const [reburnPeriodDays, setReburnPeriodDays] = useState(initial.paymentPeriod ? String(Number(initial.paymentPeriod) / 1000 / 86400) : "");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(initial.beneficiaries);
  const [reservedKoinAmount, setReservedKoinAmount] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [dangerOpen, setDangerOpen] = useState(false);

  const requireOwner = (): string | null => {
    if (!account || !signer) {
      toast.error("Connect your wallet to continue");
      return null;
    }
    if (account !== poolOwner) {
      toast.error("Only the pool owner can do this");
      return null;
    }
    return account;
  };

  const run = async (label: string, success: string, action: () => Promise<{ transaction?: { wait: () => Promise<unknown> }; receipt?: { reverted?: boolean } }>) => {
    setSubmitting(true);
    const loadingToast = toast.loading(label);
    try {
      const { transaction, receipt } = await action();
      if (receipt?.reverted) throw new Error("Transaction reverted");
      await transaction?.wait();
      toast.dismiss(loadingToast);
      toast.success(success);
      await onChanged();
      return true;
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err instanceof Error ? err.message : `${label.replace(/…$/, "")} failed`);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const saveParams = async () => {
    if (!requireOwner() || !provider) return;
    const problem = validatePoolParams({ name: poolName, days: reburnPeriodDays, beneficiaries });
    if (problem) {
      toast.error(problem);
      return;
    }
    const pool = new Contract({ id: poolId, signer, provider, abi: abiFogata2Pool });
    await run("Updating pool…", "Pool updated", () =>
      pool.functions.set_pool_params({
        name: poolName.trim(),
        image: poolImage.trim(),
        description: poolDescription.trim(),
        beneficiaries: beneficiaries.map((b) => ({ address: b.address.trim(), percentage: b.percentage })),
        payment_period: String(Math.round(Number(reburnPeriodDays) * 86_400_000)),
      }),
    );
  };

  const reserved = async (action: "add" | "remove") => {
    const owner = requireOwner();
    if (!owner || !provider) return;
    const amount = toBaseUnits(reservedKoinAmount);
    if (amount === "0") {
      toast.error("Enter a KOIN amount");
      return;
    }
    if (action === "remove" && (reservedKoin === null || BigInt(amount) > BigInt(reservedKoin))) {
      toast.error(reservedKoin === null ? "Could not read the pool's reserved KOIN. Reload and try again." : "Amount exceeds the pool's reserved KOIN");
      return;
    }
    const pool = new Contract({ id: poolId, signer, provider, abi: abiFogata2Pool });
    const ok = await run(action === "add" ? "Adding reserved KOIN…" : "Removing reserved KOIN…", action === "add" ? "Reserved KOIN added" : "Reserved KOIN removed", async () => {
      if (action === "add") {
        const koin = new Contract({ id: KOIN_CONTRACT_ID, signer, provider, abi: utils.tokenAbi });
        const { operation } = await koin.functions.approve({ owner, spender: poolId, value: amount }, { onlyOperation: true });
        return pool.functions.add_reserved_koin({ account: owner, koin_amount: amount }, { previousOperations: [operation] });
      }
      return pool.functions.remove_reserved_koin({ account: owner, koin_amount: amount });
    });
    if (ok) setReservedKoinAmount("");
  };

  const registerKey = async () => {
    if (!requireOwner() || !provider) return;
    const key = publicKey.trim();
    if (!key) {
      toast.error("Enter the node operator public key");
      return;
    }
    const pob = new Contract({ id: POB_CONTRACT_ID, signer, provider, abi: abiPob });
    const ok = await run("Registering public key…", "Public key registered", () => pob.functions.register_public_key({ producer: poolId, public_key: key }));
    if (ok) setPublicKey("");
  };

  const delist = async () => {
    if (!requireOwner() || !provider || deleteConfirmation !== poolId) return;
    const list = new Contract({ id: FOGATA2_LIST_POOLS_CONTRACT_ID, signer, provider, abi: abiFogata2ListPools });
    const ok = await run("Removing pool from the Fogata list…", "Pool removed from the Fogata list", () => list.functions.remove_pool({ value: poolId }));
    if (ok) router.push("/fogata");
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !submitting && onOpenChange(next)} title={`Manage ${initial.name || "this pool"}`} wide>
      <p className="ks-foot" style={{ marginTop: 6 }}>
        Only the pool owner sees these settings.
      </p>

      <h4 className="ks-h2" style={{ marginTop: 24 }}>
        Pool
      </h4>
      <Field id="pool-name" label="Name">
        <input id="pool-name" className="ks-input" value={poolName} onChange={(e) => setPoolName(e.target.value)} disabled={submitting} />
      </Field>
      <Field id="pool-image" label="Image URL" hint="Direct HTTPS image: PNG, JPEG, WebP or GIF, up to 2 MB. Shown as a static thumbnail.">
        <input id="pool-image" type="url" className="ks-input" value={poolImage} onChange={(e) => setPoolImage(e.target.value)} disabled={submitting} />
      </Field>
      <Field id="pool-description" label="Description">
        <textarea id="pool-description" className="ks-input" rows={4} value={poolDescription} onChange={(e) => setPoolDescription(e.target.value)} disabled={submitting} />
      </Field>
      <Field id="reburn-period" label="Payout period (days)">
        <input id="reburn-period" type="text" inputMode="decimal" className="ks-input" value={reburnPeriodDays} onChange={(e) => setReburnPeriodDays(e.target.value)} disabled={submitting} />
      </Field>
      <BeneficiariesEditor beneficiaries={beneficiaries} onChange={setBeneficiaries} disabled={submitting} />
      <button type="button" className="ks-btn wide" style={{ marginTop: 18 }} onClick={saveParams} disabled={submitting}>
        {submitting ? "Saving…" : "Save pool settings"}
      </button>

      <h4 className="ks-h2" style={{ marginTop: 36 }}>
        Reserved KOIN
      </h4>
      <p className="ks-foot" style={{ marginTop: 4 }}>
        Currently reserved: {reservedKoin !== null ? `${fmtRaw(reservedKoin, 8, 2)} KOIN` : "—"}. Reserved KOIN provides mana for operating the pool and is not burned.
      </p>
      <Field id="reserved-koin-amount" label="KOIN amount">
        <input id="reserved-koin-amount" type="text" inputMode="decimal" className="ks-input" placeholder="0" value={reservedKoinAmount} onChange={(e) => setReservedKoinAmount(e.target.value)} disabled={submitting} />
      </Field>
      <div className="ks-actions" style={{ marginTop: 14 }}>
        <button type="button" className="ks-btn md" onClick={() => reserved("add")} disabled={submitting}>
          Add
        </button>
        <button type="button" className="ks-btn ghost md" onClick={() => reserved("remove")} disabled={submitting}>
          Remove
        </button>
      </div>

      <h4 className="ks-h2" style={{ marginTop: 36 }}>
        Node operator public key
      </h4>
      {registeredPublicKey && (
        <p className="ks-foot" style={{ marginTop: 4 }}>
          Registered: <span className="ks-mono">{registeredPublicKey}</span>
        </p>
      )}
      <Field
        id="public-key"
        label="Public key"
        hint={
          <>
            From <code>.koinos/block_producer/public.key</code>. Also set <code>producer</code> in your node&apos;s <code>config.yml</code> to this pool address.
          </>
        }
      >
        <input id="public-key" className="ks-input" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="Paste the contents of public.key" disabled={submitting} />
      </Field>
      <button type="button" className="ks-btn ghost md" style={{ marginTop: 14 }} onClick={registerKey} disabled={submitting}>
        Register public key
      </button>

      <div style={{ marginTop: 36, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <button type="button" className="ks-rawlink" onClick={() => setDangerOpen((v) => !v)} aria-expanded={dangerOpen}>
          {dangerOpen ? "Danger zone ‹" : "Danger zone ›"}
        </button>
        {dangerOpen && (
          <div>
            <p className="ks-foot">Removing the pool delists it from Fogata. Stakers keep their funds and can still withdraw. Enter the pool address to confirm.</p>
            <input aria-label="Pool address confirmation" className="ks-input" style={{ marginTop: 10 }} value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder={poolId} disabled={submitting} />
            <button type="button" className="ks-btn danger md" style={{ marginTop: 12 }} onClick={delist} disabled={submitting || deleteConfirmation !== poolId}>
              Remove from Fogata list
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
