// Tokens that are not on the KoinDX list still answer name, symbol and
// decimals themselves. Ask once, remember the answer, and patch it into
// history rows that would otherwise say "Unknown".
import { Contract, Multicall, type ProviderInterface } from "koilib";
import tokenAbi from "@/koinos/abi";

export interface TokenMeta {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  /** On the KoinDX token list. Off-list tokens resolved here are never listed. */
  listed: boolean;
}

export const UNKNOWN_SYMBOL = "Unknown";
const STORAGE_KEY = "koinscan-token-meta";
const BATCH = 4;

/** null means the contract did not answer like a token. */
const memory = new Map<string, TokenMeta | null>();

function restore(): void {
  if (memory.size || typeof localStorage === "undefined") return;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, TokenMeta>;
    for (const [address, meta] of Object.entries(saved)) memory.set(address, meta);
  } catch {
    // ignore a bad cache
  }
}

function persist(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const saved: Record<string, TokenMeta> = {};
    for (const [address, meta] of memory) if (meta) saved[address] = meta;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // storage may be unavailable
  }
}

export function cachedTokenMeta(address: string): TokenMeta | null | undefined {
  restore();
  return memory.get(address);
}

type Value = { value?: string | number } | Error | undefined;
const text = (v: Value) => (v && !(v instanceof Error) && v.value !== undefined ? String(v.value) : undefined);

/** A contract can call itself anything. Keep it printable, short and non-empty. */
export function cleanLabel(value: string | undefined, fallback: string, max = 24): string {
  const cleaned = (value ?? "")
    .replace(/[\p{C}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : fallback;
}

function toMeta(address: string, name: string | undefined, symbol: string | undefined, decimals: string | undefined): TokenMeta | null {
  if (decimals === undefined || !symbol) return null;
  const fallback = `${address.slice(0, 4)}…${address.slice(-4)}`;
  const cleanSymbol = cleanLabel(symbol, fallback, 12);
  return { address, name: cleanLabel(name, cleanSymbol), symbol: cleanSymbol, decimals: Number(decimals), listed: false };
}

async function readOne(provider: ProviderInterface, address: string): Promise<TokenMeta | null> {
  const contract = new Contract({ id: address, provider, abi: tokenAbi });
  try {
    const [name, symbol, decimals] = await Promise.all([contract.functions.name({}), contract.functions.symbol({}), contract.functions.decimals({})]);
    return toMeta(address, text(name.result as Value), text(symbol.result as Value), text(decimals.result as Value));
  } catch {
    return null;
  }
}

async function readBatch(provider: ProviderInterface, addresses: string[]): Promise<(TokenMeta | null)[]> {
  const contracts = addresses.map((address) => new Contract({ id: address, provider, abi: tokenAbi }));
  const multicall = new Multicall({ provider, contracts });
  for (const contract of contracts) {
    await multicall.add(contract.functions.name, {});
    await multicall.add(contract.functions.symbol, {});
    await multicall.add(contract.functions.decimals, {});
  }
  try {
    const results = await multicall.call();
    return addresses.map((address, i) => {
      return toMeta(address, text(results[i * 3] as Value), text(results[i * 3 + 1] as Value), text(results[i * 3 + 2] as Value));
    });
  } catch {
    return Promise.all(addresses.map((address) => readOne(provider, address)));
  }
}

/** Resolve metadata for token contracts, cached in memory and localStorage. */
export async function resolveTokenMeta(provider: ProviderInterface, addresses: string[]): Promise<Map<string, TokenMeta | null>> {
  restore();
  const wanted = [...new Set(addresses)];
  const missing = wanted.filter((address) => !memory.has(address));
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const metas = await readBatch(provider, batch);
    batch.forEach((address, j) => memory.set(address, metas[j]));
  }
  if (missing.length) persist();
  return new Map(wanted.map((address) => [address, memory.get(address) ?? null]));
}

// ---- pure helpers for history rows

interface TransferLike {
  token: { symbol: string; address: string; decimals: string | number; logoURI?: string; name?: string };
}
interface RowLike {
  actions?: { tokenTransfers?: TransferLike[] }[];
}

/** Token contracts the history formatter could not name. */
export function unknownTokenAddresses(rows: RowLike[]): string[] {
  const found = new Set<string>();
  for (const row of rows)
    for (const action of row.actions ?? [])
      for (const transfer of action.tokenTransfers ?? []) if (transfer.token.symbol === UNKNOWN_SYMBOL && transfer.token.address) found.add(transfer.token.address);
  return [...found];
}

/** The same rows with resolved names in place of "Unknown". Rows without a hit are returned as they were. */
export function applyTokenMeta<T extends RowLike>(rows: T[], meta: Map<string, TokenMeta | null>): T[] {
  if (!meta.size) return rows;
  return rows.map((row) => {
    let touched = false;
    const actions = (row.actions ?? []).map((action) => {
      const transfers = (action.tokenTransfers ?? []).map((transfer) => {
        const hit = transfer.token.symbol === UNKNOWN_SYMBOL ? meta.get(transfer.token.address) : undefined;
        if (!hit) return transfer;
        touched = true;
        return { ...transfer, token: { ...transfer.token, symbol: hit.symbol, name: hit.name, decimals: hit.decimals } };
      });
      return action.tokenTransfers ? { ...action, tokenTransfers: transfers } : action;
    });
    return touched ? { ...row, actions } : row;
  });
}
