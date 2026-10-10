"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useNames } from "@/components/chrome/NamesProvider";
import { short } from "@/lib/format";
import { knownContract } from "@/lib/names";
import type { Segment } from "@/lib/tx-story";

/** The route an address opens: contracts for known contracts, address otherwise. */
export function hrefFor(address: string): string {
  return knownContract(address) ? `/contracts/${address}` : `/address/${address}`;
}

/** An address shown by its name when we have one, linking to its page. */
export function Named({ address, link = true, bold = true, prefix = "" }: { address: string; link?: boolean; bold?: boolean; prefix?: string }) {
  const { nameOf } = useNames();
  const label = `${prefix}${nameOf(address) ?? short(address)}`;
  const inner = bold ? <b title={address}>{label}</b> : <span title={address}>{label}</span>;
  if (!link) return inner;
  return <Link href={hrefFor(address)}>{inner}</Link>;
}

/** Renders a lede built by tx-story: strings stay, addresses become names. */
export function Sentence({ parts }: { parts: Segment[] }) {
  return (
    <>
      {parts.map((part, index) =>
        typeof part === "string" ? <span key={index}>{part}</span> : <Named key={index} address={part.address} />,
      )}
    </>
  );
}

/** A name for an address with no link, for row titles. */
export function useNameOf(): (address: string | null | undefined, fallback?: string) => string {
  const { nameOf } = useNames();
  return (address, fallback) => (address ? nameOf(address) ?? fallback ?? short(address) : fallback ?? "");
}

export function Inline({ children }: { children: ReactNode }) {
  return <span className="text-ink">{children}</span>;
}
