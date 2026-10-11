"use client";

// Deploys a new pool contract, configures it, starts its first snapshot and
// submits it to the Fogata list in one transaction. The chain logic is the
// same as before; only the card around it changed.
import { Contract, Signer, utils } from "koilib";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/chrome/Sheet";
import { Field } from "@/components/ks/Controls";
import { useWallet } from "@/contexts/WalletContext";
import { abiPob } from "@/koinos/abis";
import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import { FOGATA2_LIST_POOLS_CONTRACT_ID, KOIN_CONTRACT_ID, POB_CONTRACT_ID } from "@/koinos/constants";
import * as toast from "@/lib/toast";
import { BeneficiariesEditor, toBaseUnits, type Beneficiary, validatePoolParams } from "./pool-form";

export function CreatePoolSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { provider, signer, savedAddress } = useWallet();
  const account = signer?.getAddress() ?? savedAddress ?? null;
  const [creating, setCreating] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [poolImage, setPoolImage] = useState("");
  const [poolDescription, setPoolDescription] = useState("");
  const [reburnPeriodDays, setReburnPeriodDays] = useState("4");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [reservedKoinAmount, setReservedKoinAmount] = useState("2000");
  const [publicKey, setPublicKey] = useState("");

  const handleCreatePool = async () => {
    if (!account || !signer || !provider) {
      toast.error("Connect your wallet to create a pool");
      return;
    }
    const problem = validatePoolParams({ name: poolName, days: reburnPeriodDays, beneficiaries });
    if (problem) {
      toast.error(problem);
      return;
    }
    const reservedKoinBaseUnits = toBaseUnits(reservedKoinAmount);
    const normalizedPublicKey = publicKey.trim();
    if (reservedKoinBaseUnits === "0") {
      toast.error("Enter a reserved KOIN amount greater than zero");
      return;
    }
    if (!normalizedPublicKey) {
      toast.error("Enter the node operator public key");
      return;
    }

    setCreating(true);
    let activeToast = toast.loading("Preparing pool deployment...");
    try {
      const bytecodeResponse = await fetch("/miningpool.wasm");
      if (!bytecodeResponse.ok) throw new Error("Failed to load mining pool bytecode");
      const bytecode = new Uint8Array(await bytecodeResponse.arrayBuffer());
      const contractSigner = new Signer({ privateKey: crypto.getRandomValues(new Uint8Array(32)), provider });
      const poolContract = new Contract({ signer: contractSigner, provider, abi: abiFogata2Pool, bytecode });
      const poolAddress = poolContract.getId();
      const listContract = new Contract({ id: FOGATA2_LIST_POOLS_CONTRACT_ID, provider, abi: abiFogata2ListPools });
      const koinContract = new Contract({ id: KOIN_CONTRACT_ID, provider, abi: utils.tokenAbi });
      const pobContract = new Contract({ id: POB_CONTRACT_ID, provider, abi: abiPob });
      const days = Number(reburnPeriodDays);

      const [
        { operation: setOwnerOperation },
        { operation: setParamsOperation },
        { operation: startOperation },
        { operation: submitOperation },
        { operation: approveReservedOperation },
        { operation: addReservedOperation },
        { operation: registerPublicKeyOperation },
      ] = await Promise.all([
        poolContract.functions.set_owner({ value: account }, { onlyOperation: true }),
        poolContract.functions.set_pool_params(
          {
            name: poolName.trim(),
            image: poolImage.trim(),
            description: poolDescription.trim(),
            beneficiaries: beneficiaries.map((b) => ({ address: b.address.trim(), percentage: b.percentage })),
            payment_period: String(Math.round(days * 86_400_000)),
          },
          { onlyOperation: true },
        ),
        poolContract.functions.reburn_and_snapshot({}, { onlyOperation: true }),
        listContract.functions.submit_pool({ value: poolAddress }, { onlyOperation: true }),
        koinContract.functions.approve({ owner: account, spender: poolAddress, value: reservedKoinBaseUnits }, { onlyOperation: true }),
        poolContract.functions.add_reserved_koin({ account, koin_amount: reservedKoinBaseUnits }, { onlyOperation: true }),
        pobContract.functions.register_public_key({ producer: poolAddress, public_key: normalizedPublicKey }, { onlyOperation: true }),
      ]);

      toast.dismiss(activeToast);
      activeToast = toast.loading("Approve the deployment in your wallet...");
      const { transaction, receipt } = await poolContract.deploy({
        abi: JSON.stringify(abiFogata2Pool),
        authorizesCallContract: true,
        authorizesUploadContract: true,
        payer: account,
        nextOperations: [submitOperation, setOwnerOperation, setParamsOperation, startOperation, approveReservedOperation, addReservedOperation, registerPublicKeyOperation],
        beforeSend: async (transactionToSign) => {
          await signer.signTransaction(transactionToSign, {
            [poolAddress]: abiFogata2Pool,
            [FOGATA2_LIST_POOLS_CONTRACT_ID]: abiFogata2ListPools,
            [KOIN_CONTRACT_ID]: utils.tokenAbi,
            [POB_CONTRACT_ID]: abiPob,
          });
        },
      });
      if (receipt?.reverted) throw new Error("Transaction reverted");
      await transaction?.wait();
      toast.dismiss(activeToast);
      toast.success("Mining pool deployed and submitted");
      onOpenChange(false);
      router.push(`/fogata/${poolAddress}`);
    } catch (err) {
      toast.dismiss(activeToast);
      toast.error(err instanceof Error ? err.message : "Pool deployment failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !creating && onOpenChange(next)} title="Start a pool" wide>
      <p className="ks-foot" style={{ marginTop: 8 }}>
        You need to be running a Koinos block producer already. A pool coordinates the stake; it does not run the node for you. The connected account becomes the owner.
      </p>
      {!account && <p className="ks-foot text-bad">Connect your wallet first.</p>}

      <Field id="new-pool-name" label="Name">
        <input id="new-pool-name" className="ks-input" value={poolName} onChange={(e) => setPoolName(e.target.value)} disabled={creating} />
      </Field>
      <Field id="new-pool-image" label="Image URL" hint="Direct HTTPS image: PNG, JPEG, WebP or GIF, up to 2 MB. Shown as a static thumbnail.">
        <input id="new-pool-image" type="url" className="ks-input" value={poolImage} onChange={(e) => setPoolImage(e.target.value)} disabled={creating} />
      </Field>
      <Field id="new-pool-description" label="Description">
        <textarea id="new-pool-description" className="ks-input" rows={4} value={poolDescription} onChange={(e) => setPoolDescription(e.target.value)} disabled={creating} />
      </Field>
      <Field id="new-pool-reburn-period" label="Payout period (days)">
        <input id="new-pool-reburn-period" type="text" inputMode="decimal" className="ks-input" value={reburnPeriodDays} onChange={(e) => setReburnPeriodDays(e.target.value)} disabled={creating} />
      </Field>
      <BeneficiariesEditor beneficiaries={beneficiaries} onChange={setBeneficiaries} disabled={creating} />
      <Field id="new-pool-reserved-koin" label="Reserved KOIN" hint="Provides mana for operating the pool and is not burned. About 2,000 KOIN suits a 4-day period; shorter periods need more.">
        <input id="new-pool-reserved-koin" type="text" inputMode="decimal" className="ks-input" value={reservedKoinAmount} onChange={(e) => setReservedKoinAmount(e.target.value)} disabled={creating} />
      </Field>
      <Field
        id="new-pool-public-key"
        label="Node operator public key"
        hint={
          <>
            The contents of <code>.koinos/block_producer/public.key</code>. After deploying, set <code>producer</code> in your node&apos;s <code>config.yml</code> to the new pool address.
          </>
        }
      >
        <input id="new-pool-public-key" className="ks-input" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="Paste the contents of public.key" disabled={creating} />
      </Field>
      <button type="button" className="ks-btn wide" style={{ marginTop: 22 }} onClick={handleCreatePool} disabled={!account || !signer || creating}>
        {creating ? "Deploying…" : "Deploy and submit pool"}
      </button>
      <p className="ks-foot" style={{ textAlign: "center" }}>
        A random one-time contract key is generated locally. Ownership goes to your connected account during deployment.
      </p>
    </Sheet>
  );
}
