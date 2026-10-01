import type { Metadata } from "next";
import { getTransactionSummary, isTxId, pageMetadata, shortTxId } from "@/lib/social-metadata";

export async function generateMetadata({ params }: { params: Promise<{ txid: string }> }): Promise<Metadata> {
  const { txid } = await params;
  // Never echo arbitrary path text into a branded preview.
  if (!isTxId(txid)) return pageMetadata("Transaction | KoinScan", "View a Koinos transaction on KoinScan.");
  const summary = await getTransactionSummary(txid);
  const title = `Transaction ${shortTxId(txid)} | KoinScan`;

  if (!summary) return pageMetadata(title, "View this transaction on the Koinos blockchain.");

  const status = summary.failed ? "Failed transaction" : summary.kind;
  const description = [`${status}: ${summary.headline}`, summary.detail].filter(Boolean).join(", ");
  return pageMetadata(title, `${description}. View it on KoinScan, the Koinos block explorer.`);
}

export default function TransactionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
