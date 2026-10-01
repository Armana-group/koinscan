import { cardSize, renderCard } from "@/lib/social-card";
import { isAddress } from "@/lib/social-metadata";

export const alt = "Koinos address on KoinScan";
export const size = cardSize;
export const contentType = "image/png";

// Balances change, and apps cache previews for days, so the card shows only
// the address itself. Anything that isn't an address is never echoed onto
// the card.
export default async function AddressImage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  return renderCard({
    eyebrow: "Address",
    headline: isAddress(address) ? address : "Koinos address",
    headlineSize: isAddress(address) ? 44 : 80,
    detail: "Balances and transaction history",
    footer: "Koinos blockchain",
  });
}
