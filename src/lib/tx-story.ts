// Turns a transaction payload (REST /v1/transaction with decoded operations
// and events) into the sentences the transaction page shows. Pure.
import { decodeTokenTransferEventData } from "@/lib/api";
import { fmtRaw, humanize } from "@/lib/format";

export interface TokenInfo {
  symbol: string;
  decimals: number;
  address?: string;
  logoURI?: string;
}

export type TokenLookup = (contractId: string) => TokenInfo | null | undefined;

export interface Transfer {
  token: TokenInfo;
  contract: string;
  from: string;
  to: string;
  value: string;
  amount: string;
}

export interface Party {
  role: string;
  address: string;
}

export interface Operation {
  kind: "call" | "upload" | "system";
  contract?: string;
  method?: string;
  args?: Record<string, unknown>;
}

export interface TxEvent {
  name: string;
  source: string;
  data: unknown;
}

/** A lede is a sentence with addresses marked so the page can name them. */
export type Segment = string | { address: string };

export interface TxStory {
  headline: string;
  lede: Segment[];
  failed: boolean;
  pending: boolean;
  transfers: Transfer[];
  parties: Party[];
  operations: Operation[];
  events: TxEvent[];
  payer: string;
  manaUsed: string | null;
  logs: string[];
  timestamp: number | null;
  blockIds: string[];
}

interface RawOperation {
  call_contract?: { contract_id?: string; entry_point?: string | number; args?: Record<string, unknown> };
  upload_contract?: { contract_id?: string };
  set_system_call?: unknown;
  set_system_contract?: unknown;
}

interface RawEvent {
  name?: string;
  source?: string;
  data?: unknown;
}

interface RawTransaction {
  transaction?: {
    id?: string;
    header?: { payer?: string; rc_limit?: string };
    operations?: RawOperation[];
    timestamp?: string | number;
  };
  receipt?: {
    payer?: string;
    rc_used?: string;
    events?: RawEvent[];
    logs?: string[];
    reverted?: boolean;
  };
  containing_blocks?: string[];
}

const FALLBACK_TOKEN: TokenInfo = { symbol: "tokens", decimals: 8 };

function readOperations(raw: RawOperation[]): Operation[] {
  return raw.map((op) => {
    if (op.call_contract) {
      const method = op.call_contract.entry_point;
      return {
        kind: "call",
        contract: op.call_contract.contract_id,
        method: typeof method === "string" && !/^\d+$/.test(method) ? method : method !== undefined ? `method(${method})` : undefined,
        args: op.call_contract.args,
      };
    }
    if (op.upload_contract) return { kind: "upload", contract: op.upload_contract.contract_id };
    return { kind: "system" };
  });
}

function readTransfers(events: TxEvent[], lookup: TokenLookup): Transfer[] {
  const transfers: Transfer[] = [];
  for (const event of events) {
    if (!/transfer_event$/i.test(event.name)) continue;
    const data = decodeTokenTransferEventData(event.data);
    if (!data) continue;
    const token = lookup(event.source) ?? FALLBACK_TOKEN;
    transfers.push({
      token,
      contract: event.source,
      from: data.from,
      to: data.to,
      value: data.value,
      amount: fmtRaw(data.value, token.decimals, 4),
    });
  }
  return transfers;
}

function dedupe(parties: Party[]): Party[] {
  const seen = new Set<string>();
  return parties.filter((party) => {
    const key = `${party.role}:${party.address}`;
    if (!party.address || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildTxStory(payload: unknown, lookup: TokenLookup): TxStory | null {
  const raw = payload as RawTransaction | null;
  if (!raw?.transaction) return null;

  const tx = raw.transaction;
  const receipt = raw.receipt;
  const payer = tx.header?.payer ?? receipt?.payer ?? "";
  const operations = readOperations(tx.operations ?? []);
  const events: TxEvent[] = (receipt?.events ?? []).map((event) => ({
    name: event.name ?? "",
    source: event.source ?? "",
    data: event.data,
  }));
  const transfers = readTransfers(events, lookup);
  const failed = Boolean(receipt?.reverted);
  const pending = !receipt;
  const logs = receipt?.logs ?? [];
  const timestamp = tx.timestamp !== undefined && tx.timestamp !== null && tx.timestamp !== "" ? Number(tx.timestamp) : null;

  const call = operations.find((op) => op.kind === "call");
  const upload = operations.find((op) => op.kind === "upload");
  const method = call?.method && call.method !== "transfer" ? humanize(call.method) : null;

  // A transfer that never happened (reverted or pending) still has its
  // intent in the operation arguments.
  const args = (call?.args ?? {}) as { from?: unknown; to?: unknown; value?: unknown };
  if (!transfers.length && call?.method === "transfer" && call.contract && typeof args.from === "string" && typeof args.to === "string" && args.value !== undefined) {
    const token = lookup(call.contract) ?? FALLBACK_TOKEN;
    transfers.push({ token, contract: call.contract, from: args.from, to: args.to, value: String(args.value), amount: fmtRaw(String(args.value), token.decimals, 4) });
  }
  const transfer = transfers[0];
  const more = transfers.length > 1 ? ` and ${transfers.length - 1} more` : "";

  let headline: string;
  let lede: Segment[];

  if (transfer) {
    headline = `${transfer.amount} ${transfer.token.symbol}`;
    if (method && call?.contract && call.contract !== transfer.contract) {
      lede = ["Sent by ", { address: transfer.from }, " to ", { address: transfer.to }, " through ", { address: call.contract }, `, ${method.toLowerCase()}${more}.`];
    } else {
      lede = ["Sent by ", { address: transfer.from }, " to ", { address: transfer.to }, `${more}.`];
    }
  } else if (call) {
    headline = method ?? "Contract call";
    lede = call.contract ? ["On ", { address: call.contract }, ", by ", { address: payer }, "."] : ["By ", { address: payer }, "."];
  } else if (upload) {
    headline = "Contract uploaded";
    lede = upload.contract ? [{ address: upload.contract }, " now runs new code, uploaded by ", { address: payer }, "."] : ["Uploaded by ", { address: payer }, "."];
  } else {
    headline = "Transaction";
    lede = ["Sent by ", { address: payer }, "."];
  }

  if (failed) {
    const what = transfer ? "Transfer" : headline;
    headline = `${what} did not go through`;
    const tried = transfer
      ? [{ address: transfer.from }, ` tried to send ${transfer.amount} ${transfer.token.symbol} to `, { address: transfer.to }, "."]
      : call?.contract
        ? [{ address: payer }, ` tried to ${(method ?? "call").toLowerCase()} on `, { address: call.contract }, "."]
        : [{ address: payer }, " sent a transaction that was reverted."];
    const reason = logs.length ? ` ${logs[logs.length - 1].replace(/^transaction reverted: /i, "")}` : "";
    lede = [...tried, reason ? ` ${reason.trim().replace(/[.]*$/, "")}.` : " Nothing moved; only mana was spent."];
  }

  const parties: Party[] = [];
  if (transfer && !failed) {
    for (const t of transfers) {
      parties.push({ role: "From", address: t.from });
      parties.push({ role: "To", address: t.to });
    }
  } else if (transfer) {
    parties.push({ role: "From", address: transfer.from }, { role: "To", address: transfer.to });
  }
  if (!parties.some((p) => p.address === payer)) parties.push({ role: transfer ? "Paid by" : "By", address: payer });
  for (const op of operations) {
    if (op.kind === "call" && op.contract && !transfers.some((t) => t.contract === op.contract)) parties.push({ role: "Contract", address: op.contract });
    if (op.kind === "upload" && op.contract) parties.push({ role: "Uploaded", address: op.contract });
  }

  return {
    headline,
    lede,
    failed,
    pending,
    transfers,
    parties: dedupe(parties),
    operations,
    events,
    payer,
    manaUsed: receipt?.rc_used ?? null,
    logs,
    timestamp: Number.isFinite(timestamp) ? timestamp : null,
    blockIds: raw.containing_blocks ?? [],
  };
}
