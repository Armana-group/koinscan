import type { Metadata } from "next";
import { isAddress, pageMetadata, shortAddress } from "@/lib/social-metadata";

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }): Promise<Metadata> {
  const { address } = await params;
  // Never echo arbitrary path text into a branded preview.
  if (!isAddress(address)) return pageMetadata("Address | KoinScan", "View a Koinos address on KoinScan.");
  return pageMetadata(
    `Address ${shortAddress(address)} | KoinScan`,
    `Balances and transaction history for ${address} on the Koinos blockchain.`,
  );
}

export default function AddressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
