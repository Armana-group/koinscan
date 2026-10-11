"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { short } from "@/lib/format";
import { PIE_COLOURS, pieColour, ringPaths } from "@/lib/pie";

interface Slice {
  address: string;
  share: number;
}

const SIZE = 220;

/** Who produced the recent blocks, as a ring with a legend of the largest producers. */
export function ProducerPie({ producers, sample, nameOf }: { producers: readonly Slice[]; sample: number; nameOf: (address: string) => string }) {
  const router = useRouter();
  const [hover, setHover] = useState<number | null>(null);
  const paths = useMemo(() => ringPaths(producers.map((p) => p.share), SIZE / 2, SIZE / 2, SIZE / 2, SIZE / 2 - 30), [producers]);
  const named = producers.slice(0, PIE_COLOURS.length);
  const rest = producers.slice(PIE_COLOURS.length);
  const restShare = rest.reduce((sum, p) => sum + p.share, 0);
  const focus = hover === null ? null : producers[hover];
  const label = (address: string) => nameOf(address) || short(address);

  return (
    <div className="ks-pie">
      <div className="ks-pie-ring" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Share of the last ${sample} blocks by producer`}>
          {paths.map((d, i) =>
            d ? (
              <path
                key={producers[i].address}
                d={d}
                fill={pieColour(i)}
                className={hover !== null && hover !== i ? "dim" : ""}
                onMouseEnter={() => setHover(i)}
                onClick={() => router.push(`/network/${producers[i].address}`)}
              >
                <title>{`${label(producers[i].address)}: ${producers[i].share.toFixed(1)}%`}</title>
              </path>
            ) : null,
          )}
        </svg>
        <div className="ks-pie-mid" aria-hidden>
          {focus ? (
            <>
              <b>{focus.share.toFixed(1)}%</b>
              <span>{label(focus.address)}</span>
            </>
          ) : (
            <>
              <b>{producers.length}</b>
              <span>producers in the last {sample} blocks</span>
            </>
          )}
        </div>
      </div>
      <ul className="ks-pie-key">
        {named.map((p, i) => (
          <li key={p.address} className={hover !== null && hover !== i ? "dim" : ""} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <Link href={`/network/${p.address}`}>
              <i style={{ background: pieColour(i) }} />
              <span>{label(p.address)}</span>
              <em>{p.share.toFixed(1)}%</em>
            </Link>
          </li>
        ))}
        {rest.length > 0 && (
          <li className={hover !== null && hover < PIE_COLOURS.length ? "dim" : ""}>
            <span className="ks-pie-rest">
              <i style={{ background: pieColour(PIE_COLOURS.length) }} />
              <span>
                {rest.length} other{rest.length === 1 ? "" : "s"}
              </span>
              <em>{restShare.toFixed(1)}%</em>
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
