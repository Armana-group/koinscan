import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FOGATA_IMAGE, pageMetadata } from "@/lib/social-metadata";

// Pool and trade pages inherit this, including the Fogata card.
export const metadata: Metadata = pageMetadata(
  "Fogata | KoinScan",
  "Stake KOIN with a Koinos mining pool and earn block rewards, without running a node.",
  FOGATA_IMAGE,
);

export default function FogataLayout({ children }: { children: ReactNode }) {
  return children;
}
