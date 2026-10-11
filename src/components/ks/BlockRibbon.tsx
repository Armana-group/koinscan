"use client";

import Link from "next/link";
import { useState } from "react";
import type { SampledBlock } from "@/lib/block-window";
import { fmt, plural } from "@/lib/format";

/**
 * The recent blocks as one row of squares, coloured by producer like the ring
 * below, with a dot over the few that carried transactions.
 */
export function BlockRibbon({ blocks, colourOf, nameOf }: { blocks: readonly SampledBlock[]; colourOf: (signer: string) => string; nameOf: (address: string) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const focus = hover === null ? null : blocks[hover];
  const before = hover !== null && hover > 0 ? blocks[hover - 1] : null;
  const withTxs = blocks.filter((b) => (b.txs ?? 0) > 0).length;

  return (
    <div className="ks-ribbon">
      <div className="ks-line-read">
        {focus ? (
          <>
            Block <b>{fmt(focus.height)}</b> by {nameOf(focus.signer)}
            {before && <> · {((focus.timestamp - before.timestamp) / 1000).toFixed(1)} s after the one before</>}
            {(focus.txs ?? 0) > 0 && <> · {plural(focus.txs ?? 0, "transaction")}</>}
          </>
        ) : (
          <>
            Last {blocks.length} blocks by producer{withTxs > 0 && <> · dots mark the {plural(withTxs, "block")} with transactions</>}
          </>
        )}
      </div>
      <div className="row" onMouseLeave={() => setHover(null)}>
        {blocks.map((block, i) => (
          <Link
            key={block.height}
            href={`/blocks/${block.height}`}
            aria-label={`Block ${fmt(block.height)} by ${nameOf(block.signer)}`}
            style={{ background: colourOf(block.signer) }}
            className={[(block.txs ?? 0) > 0 ? "tx" : "", hover === i ? "on" : hover !== null ? "dim" : ""].filter(Boolean).join(" ") || undefined}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
          />
        ))}
      </div>
    </div>
  );
}
