import { cardSize, renderCard } from "@/lib/social-card";
import { getTransactionSummary, isTxId, shortTxId } from "@/lib/social-metadata";

export const alt = "Koinos transaction on KoinScan";
export const size = cardSize;
export const contentType = "image/png";

export default async function TransactionImage({ params }: { params: Promise<{ txid: string }> }) {
  const { txid } = await params;
  const summary = await getTransactionSummary(txid);

  if (!summary) {
    // Anything that isn't a transaction id is never echoed onto the card.
    return renderCard({
      eyebrow: "Transaction",
      headline: isTxId(txid) ? shortTxId(txid) : "Koinos transaction",
      headlineSize: 72,
      footer: "Koinos blockchain",
    });
  }

  return renderCard({
    eyebrow: summary.kind,
    badge: summary.failed ? { label: "Failed", color: "#DC2626" } : undefined,
    headline: summary.headline,
    headlineSize: summary.headline.length > 14 ? 80 : 112,
    detail: summary.detail,
    footer: shortTxId(txid),
  });
}
