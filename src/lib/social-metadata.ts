import type { Metadata } from "next";
import { utils } from "koilib";
import { RPC_NODE } from "@/koinos/constants";
import { fetchTokenList, formatTokenAmount } from "@/lib/tokens";

// Titles, descriptions and transaction summaries for link previews
// (Open Graph / Twitter cards). The card images are drawn in social-card.tsx.

export const SITE_TITLE = "KoinScan - Koinos Block Explorer";
export const SITE_DESCRIPTION = "Explore the Koinos blockchain - transactions, blocks, accounts, and smart contracts";

// The site card from src/app/opengraph-image.tsx. Segments with their own
// opengraph-image file override this.
const SITE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "KoinScan, the Koinos block explorer" };

// The card from src/app/fogata/opengraph-image.tsx, for pages under /fogata
// that set their own title.
export const FOGATA_IMAGE = { url: "/fogata/opengraph-image", width: 1200, height: 630, alt: "Fogata mining pools on KoinScan" };

// A child segment's openGraph and twitter objects replace the root ones
// entirely, including the inherited image, so every page that sets its own
// title goes through this.
export function pageMetadata(title: string, description: string, image = SITE_IMAGE): Metadata {
  return {
    title,
    description,
    openGraph: { type: "website", siteName: "KoinScan", title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export function shortTxId(txid: string): string {
  return txid.length > 20 ? `${txid.slice(0, 10)}…${txid.slice(-6)}` : txid;
}

export function shortAddress(address: string): string {
  return address.length > 16 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function isTxId(value: string): boolean {
  return /^0x[0-9a-fA-F]{8,128}$/.test(value);
}

// Checks the checksum too, so made-up text can't pass as an address.
export function isAddress(value: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]{25,35}$/.test(value)) return false;
  try {
    return utils.isChecksumAddress(value);
  } catch {
    return false;
  }
}

export interface TransactionSummary {
  // e.g. "Transfer", "Contract call"
  kind: string;
  // e.g. "100 KOIN", "swap"
  headline: string;
  detail?: string;
  failed: boolean;
}

interface RestEvent {
  name?: string;
  source?: string;
  data?: { from?: string; to?: string; value?: string };
}

// Token contracts that the KoinDX token list names "koin" / "vhp".
const KNOWN_SYMBOLS: Record<string, { symbol: string; decimals: number }> = {
  "15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL": { symbol: "KOIN", decimals: 8 },
  "1AdzuXSpC6K9qtXdCBgD5NUpDNwHjMgrc9": { symbol: "VHP", decimals: 8 },
  "1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju": { symbol: "VHP", decimals: 8 },
};

// "1.0000" -> "1", "0.250000" -> "0.25"; leaves "1.50K" alone.
function trimZeros(amount: string): string {
  return /^[\d,]+\.\d+$/.test(amount) ? amount.replace(/\.?0+$/, "") : amount;
}

// "deposit_koin" -> "Deposit KOIN"
function humanizeMethod(entryPoint: string): string {
  const words = entryPoint.split("_").filter(Boolean).map((word) => (/^(koin|vhp)$/i.test(word) ? word.toUpperCase() : word));
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function tokenInfo(contractId: string) {
  if (KNOWN_SYMBOLS[contractId]) return KNOWN_SYMBOLS[contractId];
  const list = await fetchTokenList();
  const token = list.tokens.find((t) => t.address === contractId);
  return token ? { symbol: token.symbol, decimals: Number(token.decimals) } : null;
}

// Crawlers give up after a few seconds, so a slow node gets the plain card.
export async function getTransactionSummary(txid: string): Promise<TransactionSummary | null> {
  if (!isTxId(txid)) return null;

  try {
    const url = new URL(`/v1/transaction/${encodeURIComponent(txid)}`, RPC_NODE);
    url.searchParams.set("return_receipt", "true");
    url.searchParams.set("decode_operations", "true");
    url.searchParams.set("decode_events", "true");

    // Included transactions never change.
    const response = await fetch(url, { signal: AbortSignal.timeout(3000), next: { revalidate: 86400 } });
    if (!response.ok) return null;
    const data = await response.json();

    const failed = Boolean(data?.receipt?.reverted);
    const events: RestEvent[] = data?.receipt?.events ?? [];
    const transfers = events.filter((e) => typeof e?.name === "string" && e.name.endsWith("transfer_event"));
    const transfer = transfers[0];
    const operation = data?.transaction?.operations?.[0];
    const entryPoint = operation?.call_contract?.entry_point;
    const method = typeof entryPoint === "string" && entryPoint !== "transfer" ? humanizeMethod(entryPoint) : null;

    if (transfer?.data?.from && transfer?.data?.to && transfer?.data?.value) {
      const token = transfer.source ? await tokenInfo(transfer.source) : null;
      const amount = trimZeros(formatTokenAmount(String(transfer.data.value), token?.decimals ?? 8));
      const more = transfers.length > 1 ? ` · +${transfers.length - 1} more` : "";
      return {
        kind: method ?? "Transfer",
        headline: `${amount} ${token?.symbol ?? "tokens"}`,
        detail: `${shortAddress(transfer.data.from)} → ${shortAddress(transfer.data.to)}${more}`,
        failed,
      };
    }

    if (operation?.call_contract) {
      const contractId = operation.call_contract.contract_id;
      return {
        kind: "Contract call",
        headline: method ?? "Contract call",
        detail: contractId ? `on ${shortAddress(contractId)}` : undefined,
        failed,
      };
    }
    if (operation?.upload_contract) {
      return { kind: "Contract upload", headline: "Contract upload", detail: shortAddress(operation.upload_contract.contract_id ?? ""), failed };
    }

    return { kind: "Transaction", headline: "Transaction", failed };
  } catch {
    return null;
  }
}
