// Shapes address history (the rows formatDetailedTransactions produces) into
// what the address page draws: one row per transaction, and runs of produced
// blocks folded into one row per day. Pure.
import { dayLabel, fmt, fmtRaw, humanize, rawToNumber } from "@/lib/format";

export interface TokenRef {
  symbol: string;
  address: string;
  decimals: number;
  logoURI?: string;
}

export interface HistoryTransfer {
  token: TokenRef;
  value: string;
  from: string;
  to: string;
  /** True when this account received it. */
  incoming: boolean;
}

export interface TxRow {
  kind: "tx";
  id: string;
  seq: string | undefined;
  timestamp: number | null;
  /** "transfer" rows lead with the token; everything else with a glyph. */
  lead: { type: "token"; token: TokenRef } | { type: "glyph"; glyph: "call" | "upload" | "wallet" | "block" };
  /** "From" / "To" / "Deposited into" and the address it refers to, or plain text. */
  title: string;
  counterparty?: string;
  detail?: string;
  amount?: string;
  amountSub?: string;
  tone: "in" | "out" | "plain";
  transfers: HistoryTransfer[];
  mana: string | null;
  filter: "received" | "sent" | "contracts" | "blocks";
}

export interface BlockRow {
  kind: "block";
  id: string;
  seq: string | undefined;
  timestamp: number | null;
  height: string;
  koin: string;
  vhp: string;
}

export interface BlockRun {
  kind: "run";
  key: string;
  day: string;
  blocks: BlockRow[];
  koinTotal: number;
  vhpTotal: number;
}

export type HistoryItem = TxRow | BlockRun;

interface FormattedTransfer {
  token: { symbol: string; address: string; decimals: string | number; logoURI?: string };
  amount: string;
  from: string;
  to: string;
  isPositive?: boolean;
}

interface FormattedAction {
  type: string;
  description?: string;
  dappName?: string;
  tokenTransfers?: FormattedTransfer[];
  metadata?: Record<string, unknown>;
}

interface FormattedRow {
  id: string;
  seq_num?: string;
  timestamp?: string | number;
  isBlockProduction?: boolean;
  blockHeight?: string;
  actions?: FormattedAction[];
  operations?: { type?: string; contract?: string; method?: string | number }[];
  rc_used?: string;
  payer?: string;
}

function toTokenRef(token: FormattedTransfer["token"]): TokenRef {
  return { symbol: token.symbol, address: token.address, decimals: Number(token.decimals) || 8, logoURI: token.logoURI };
}

function amountText(transfer: HistoryTransfer, sign: boolean): string {
  const amount = fmtRaw(transfer.value, transfer.token.decimals, 4);
  return `${sign ? (transfer.incoming ? "+" : "-") : ""}${amount} ${transfer.token.symbol}`;
}

function blockRow(row: FormattedRow, address: string): BlockRow {
  const transfers = (row.actions ?? []).flatMap((a) => a.tokenTransfers ?? []);
  const koin = transfers.find((t) => t.to === address && t.token.symbol === "KOIN")?.amount ?? "0";
  const vhp = transfers.find((t) => t.from === address && t.token.symbol === "VHP")?.amount ?? "0";
  return {
    kind: "block",
    id: row.id,
    seq: row.seq_num,
    timestamp: row.timestamp ? Number(row.timestamp) : null,
    height: row.blockHeight ?? "",
    koin,
    vhp,
  };
}

function txRow(row: FormattedRow, address: string): TxRow {
  const actions = row.actions ?? [];
  const primary = actions[0];
  const transfers: HistoryTransfer[] = actions
    .flatMap((a) => a.tokenTransfers ?? [])
    .map((t) => ({ token: toTokenRef(t.token), value: t.amount, from: t.from, to: t.to, incoming: t.to === address }));
  const mine = transfers.filter((t) => t.from === address || t.to === address);
  const incoming = mine.filter((t) => t.incoming);
  const outgoing = mine.filter((t) => !t.incoming);
  const calls = (row.operations ?? []).filter((op) => op.type === "Contract Call");
  const call = calls[0];
  const method = call?.method !== undefined ? String(call.method) : "";
  // A swap usually starts with an approve on the token; the exchange is the call that swaps.
  const swapCall = calls.find((op) => /swap/i.test(String(op.method ?? ""))) ?? calls[calls.length - 1];
  const mana = row.rc_used ?? null;
  const base = { kind: "tx" as const, id: row.id, seq: row.seq_num, timestamp: row.timestamp ? Number(row.timestamp) : null, transfers, mana };

  // Swapped one token for another.
  if (incoming.length && outgoing.length && incoming[0].token.address !== outgoing[0].token.address) {
    return {
      ...base,
      lead: { type: "token", token: incoming[0].token },
      title: `Swapped ${outgoing[0].token.symbol} for ${incoming[0].token.symbol}`,
      counterparty: swapCall?.contract,
      amount: amountText(incoming[0], true),
      amountSub: amountText(outgoing[0], true),
      tone: "in",
      filter: "contracts",
    };
  }

  const transfer = incoming[0] ?? outgoing[0] ?? transfers[0];
  if (transfer && (method === "transfer" || method === "" || !call || /^(mint|burn|transfer)$/.test(method))) {
    const counterparty = transfer.incoming ? transfer.from : transfer.to;
    const more = mine.length > 1 ? ` and ${mine.length - 1} more` : "";
    return {
      ...base,
      lead: { type: "token", token: transfer.token },
      title: transfer.incoming ? "From" : "To",
      counterparty,
      detail: more ? `${fmt(mine.length)} transfers` : undefined,
      amount: amountText(transfer, true),
      tone: transfer.incoming ? "in" : "out",
      filter: transfer.incoming ? "received" : "sent",
    };
  }

  // A contract call, possibly moving tokens as part of it.
  const label = primary?.type === "contract_upload" ? "Uploaded a contract" : method ? humanize(method) : (primary?.description ?? "Transaction");
  const mainTransfer = outgoing[0] ?? incoming[0];
  return {
    ...base,
    lead: { type: "glyph", glyph: primary?.type === "contract_upload" ? "upload" : "call" },
    title: label,
    counterparty: call?.contract,
    amount: mainTransfer ? amountText(mainTransfer, true) : undefined,
    amountSub: mainTransfer && mine.length > 1 ? amountText(mine[1], true) : undefined,
    tone: mainTransfer ? (mainTransfer.incoming ? "in" : "out") : "plain",
    filter: "contracts",
  };
}

/** Rows in the order given (newest first); block rows fold into one run per day. */
export function buildHistoryItems(rows: unknown[], address: string, now = Date.now()): HistoryItem[] {
  const items: HistoryItem[] = [];
  for (const raw of rows as FormattedRow[]) {
    if (!raw?.id) continue;
    if (raw.isBlockProduction) {
      const block = blockRow(raw, address);
      const day = dayLabel(block.timestamp, now);
      const last = items[items.length - 1];
      if (last?.kind === "run" && last.day === day) {
        last.blocks.push(block);
        last.koinTotal += rawToNumber(block.koin);
        last.vhpTotal += rawToNumber(block.vhp);
      } else {
        items.push({ kind: "run", key: `run-${block.id}`, day, blocks: [block], koinTotal: rawToNumber(block.koin), vhpTotal: rawToNumber(block.vhp) });
      }
      continue;
    }
    items.push(txRow(raw, address));
  }
  return items;
}

export interface ActivitySummary {
  blocks: number;
  koinEarned: number;
  sent: number;
  received: number;
  contracts: number;
}

export function summarizeActivity(items: HistoryItem[]): ActivitySummary {
  const summary: ActivitySummary = { blocks: 0, koinEarned: 0, sent: 0, received: 0, contracts: 0 };
  for (const item of items) {
    if (item.kind === "run") {
      summary.blocks += item.blocks.length;
      summary.koinEarned += item.koinTotal;
    } else if (item.filter === "sent") summary.sent += 1;
    else if (item.filter === "received") summary.received += 1;
    else summary.contracts += 1;
  }
  return summary;
}
