"use client";

import { type Abi, Contract, utils } from "koilib";
import { buildSerializer } from "@/koinos/serializer";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { abiGovernance } from "@/koinos/abis";
import { abiKoin } from "@/koinos/abis/koin";
import { abiKoinosFund } from "@/koinos/abis/koinosFund";
import { GOVERNANCE_CONTRACT_ID, KOIN_CONTRACT_ID, KOINOS_FUND_CONTRACT_ID, NICKNAMES_CONTRACT_ID, VHP_CONTRACT_ID } from "@/koinos/constants";
import { knownContract } from "@/lib/names";
import { short } from "@/lib/format";
import * as toast from "@/lib/toast";
import { KoinosForm, argumentFields, prettyName } from "@/components/KoinosForm";
import { TokenFacts } from "@/components/TokenFacts";
import { CopyButton } from "@/components/ks/Advanced";
import { Filters } from "@/components/ks/Controls";
import { Crumb, Empty, H2, Lede, Page, Section, Skeleton, Title } from "@/components/ks/Page";
import { GlyphMark, TokenMark } from "@/components/ks/Row";
import { useChrome } from "@/components/chrome/ChromeProvider";

type MethodState = { args: unknown; loading: boolean; results: string; error?: string };
type Group = "all" | "read" | "write";

function decodeNickname(tokenId: unknown): string {
  try {
    return new TextDecoder().decode(utils.toUint8Array(String(tokenId).slice(2)));
  } catch {
    return "";
  }
}

export default function ContractPage() {
  const { contractId: param } = useParams<{ contractId: string }>();
  const { signer, provider } = useWallet();
  const { openWallet } = useChrome();
  const [contract, setContract] = useState<Contract | null>(null);
  const [info, setInfo] = useState({ nickname: "", address: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<Group>("all");
  const [selected, setSelected] = useState("");
  const [states, setStates] = useState<Record<string, MethodState>>({});

  useEffect(() => {
    if (!provider) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const nicknames = new Contract({ id: NICKNAMES_CONTRACT_ID, provider, abi: utils.nicknamesAbi });
        let contractId = "";
        let nickname = "";
        const slug = knownContract(param) ? undefined : ["koin", "vhp"].includes(param.toLowerCase()) ? param.toLowerCase() : undefined;
        if (slug === "koin") contractId = KOIN_CONTRACT_ID;
        else if (slug === "vhp") contractId = VHP_CONTRACT_ID;
        else if (param.startsWith("1")) {
          contractId = param;
          try {
            const { result } = await nicknames.functions.get_main_token({ value: contractId });
            if (result?.token_id) nickname = decodeNickname(result.token_id);
          } catch {
            /* no nickname */
          }
        } else {
          nickname = param.replace("@", "");
          const { result } = await nicknames.functions.get_address({ value: nickname });
          if (!result?.value) throw new Error(`Nothing is called @${nickname}.`);
          contractId = result.value;
        }
        if (!contractId) throw new Error("No contract address found.");

        let description = "";
        if (nickname) {
          try {
            const { result } = await nicknames.functions.metadata_of({ token_id: `0x${utils.toHexString(new TextEncoder().encode(nickname))}` });
            if (result?.value) description = JSON.parse(result.value).bio || "";
          } catch {
            /* no metadata */
          }
        }

        const c = new Contract({ id: contractId, provider });
        let abi: Abi | undefined;
        if (contractId === GOVERNANCE_CONTRACT_ID) abi = abiGovernance;
        else if (contractId === KOIN_CONTRACT_ID) abi = abiKoin;
        else if (contractId === VHP_CONTRACT_ID) abi = utils.tokenAbi;
        else if (contractId === KOINOS_FUND_CONTRACT_ID) abi = abiKoinosFund;
        else abi = await c.fetchAbi({ updateFunctions: false, updateSerializer: false });
        if (!abi?.methods) throw new Error("This address has no contract, or the contract has no ABI.");

        Object.keys(abi.methods).forEach((m) => {
          const method = abi.methods[m] as Record<string, unknown> & Abi["methods"][string];
          if (method.entry_point === undefined) method.entry_point = Number(method["entry-point"]);
          if (method.read_only === undefined) method.read_only = method["read-only"] as boolean | undefined;
          const balanceReturns = ["token.balance_of_result", "token.uint64", "bitkoincontract.balance_of_result"];
          if (method.return && !method.default_output && balanceReturns.includes(method.return)) method.default_output = { value: "0" };
          if (method.return && !method.default_output) method.default_output = "undefined";
        });
        c.abi = abi;
        c.updateFunctionsFromAbi();
        c.serializer = buildSerializer(c.abi) ?? undefined;
        if (!active) return;
        setContract(c);
        setInfo({ nickname, address: contractId, description });
      } catch (err) {
        if (!active) return;
        setError((err as Error).message);
        setContract(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [param, provider]);

  const methods = useMemo(() => {
    if (!contract?.abi) return [];
    return Object.keys(contract.abi.methods)
      .map((name) => ({
        name,
        prettyName: prettyName(name),
        readOnly: Boolean(contract.abi!.methods[name].read_only),
        description: contract.abi!.methods[name].description,
        // A method whose arguments cannot be encoded gets a note instead of a button.
        callable: argumentFields(contract.serializer, contract.abi!.methods[name].argument) !== null,
      }))
      .sort((a, b) => Number(b.readOnly) - Number(a.readOnly) || a.prettyName.localeCompare(b.prettyName));
  }, [contract]);
  const visible = methods.filter((m) => (group === "all" || (group === "read" ? m.readOnly : !m.readOnly)) && (!query.trim() || m.prettyName.toLowerCase().includes(query.toLowerCase()) || m.name.toLowerCase().includes(query.toLowerCase())));

  const run = useCallback(
    async (name: string, readOnly: boolean) => {
      if (!contract) return;
      setStates((prev) => ({ ...prev, [name]: { ...prev[name], loading: true, results: "", error: undefined } }));
      try {
        const args = states[name]?.args || {};
        if (readOnly) {
          const { result } = await contract.functions[name](args);
          setStates((prev) => ({ ...prev, [name]: { ...prev[name], loading: false, results: JSON.stringify(result, null, 2) } }));
        } else {
          if (!signer) throw new Error("Connect a wallet to send this.");
          signer.provider = contract.provider;
          contract.signer = signer;
          const { transaction, receipt } = await contract.functions[name](args, { rcLimit: 10_00000000 });
          toast.success("Transaction sent", { duration: 8000 });
          setStates((prev) => ({ ...prev, [name]: { ...prev[name], loading: false, results: JSON.stringify(receipt, null, 2) } }));
          await transaction!.wait();
          toast.custom(
            <span>
              Transaction mined.{" "}
              <a href={`/tx/${transaction!.id!}`} className="ks-link">
                View it
              </a>
            </span>,
            { duration: 12000, icon: "✅" },
          );
        }
      } catch (err) {
        const message = (err as Error).message;
        setStates((prev) => ({ ...prev, [name]: { ...prev[name], loading: false, error: message } }));
        toast.error(message, { duration: 8000 });
      }
    },
    [contract, signer, states],
  );

  const known = info.address ? knownContract(info.address) : undefined;
  const title = known?.name ?? (info.nickname ? `@${info.nickname}` : "Contract");
  const account = signer?.getAddress() ?? null;

  return (
    <Page>
      <Crumb back="Contracts" backHref="/contracts" right={<span>Contract</span>} />
      {loading && <Skeleton lines={2} />}
      {!loading && error && (
        <>
          <Title>Not a contract</Title>
          <Lede>{error}</Lede>
        </>
      )}
      {!loading && !error && contract && (
        <>
          <section className="ks-who" aria-label="Contract">
            {known?.slug ? <TokenMark symbol={known.name} address={known.slug} large /> : <GlyphMark glyph={known?.glyph ?? "call"} large />}
            <div style={{ minWidth: 0 }}>
              <Title>{title}</Title>
              <div className="ks-hashline">
                <span>{short(info.address, 8, 6)}</span>
                <CopyButton value={info.address} what="Address" />
                <Link href={`/address/${info.address}`} className="ks-link">
                  Activity ›
                </Link>
              </div>
            </div>
          </section>
          {(known?.description || info.description) && <Lede>{known?.description ?? info.description}</Lede>}

          <TokenFacts address={info.address} provider={provider} account={account} />

          <Section label="Functions" className="ks-list">
            <H2 count={methods.length}>Functions</H2>
            <div className="ks-controls" style={{ marginTop: 8 }}>
              <Filters
                options={[
                  { value: "all", label: "All" },
                  { value: "read", label: `Read (${methods.filter((m) => m.readOnly).length})` },
                  { value: "write", label: `Write (${methods.filter((m) => !m.readOnly).length})` },
                ]}
                value={group}
                onChange={setGroup}
              />
              <input className="ks-input" style={{ width: 180, height: 34, borderRadius: 17, background: "#fff" }} placeholder="Find a function" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a function" />
            </div>
            <div className="ks-list" style={{ marginTop: 8 }}>
              {visible.length === 0 && <Empty>No function matches.</Empty>}
              {visible.map((method) => {
                const open = selected === method.name;
                const state = states[method.name];
                return (
                  <div key={method.name} className={`ks-run${open ? " open" : ""}`}>
                    <button type="button" className="ks-row no-lead" onClick={() => setSelected(open ? "" : method.name)} aria-expanded={open}>
                      <span className="ks-what">
                        <span className="ks-t">{method.prettyName}</span>
                        <span className="ks-d">{method.description || (method.readOnly ? "Reads from the chain" : "Sends a transaction")}</span>
                      </span>
                      <span className="ks-amt plain">{method.readOnly ? "Read" : "Write"}</span>
                      <span className="ks-chev">›</span>
                    </button>
                    {open && (
                      <div style={{ padding: "4px 0 20px" }}>
                        <KoinosForm contract={contract} protobufType={method.name} onChange={(args) => setStates((prev) => ({ ...prev, [method.name]: { ...prev[method.name], args } }))} />
                        {method.callable && (
                          <div className="ks-actions" style={{ marginTop: 16 }}>
                            {method.readOnly ? (
                              <button type="button" className="ks-btn ghost md" onClick={() => run(method.name, true)} disabled={state?.loading}>
                                {state?.loading ? "Reading…" : "Read"}
                              </button>
                            ) : signer ? (
                              <button type="button" className="ks-btn md" onClick={() => run(method.name, false)} disabled={state?.loading}>
                                {state?.loading ? "Sending…" : `Send as ${short(signer.getAddress())}`}
                              </button>
                            ) : (
                              <button type="button" className="ks-btn md" onClick={openWallet}>
                                Connect wallet to send
                              </button>
                            )}
                          </div>
                        )}
                        {state?.results && <pre className="ks-raw">{state.results}</pre>}
                        {state?.error && (
                          <pre className="ks-raw" style={{ color: "var(--bad)" }}>
                            {state.error}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}
    </Page>
  );
}
