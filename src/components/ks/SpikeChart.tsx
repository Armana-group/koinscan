"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { extremes, spikeLayout } from "@/lib/spikes";

export interface SpikeEntry {
  key: string;
  /** Above zero rises (money in), below zero drops (money out). */
  value: number;
  /** Entries in the same group share a scale; amounts in different tokens are not comparable. */
  group?: string;
  /** Small line over the label: who or what. */
  overline: ReactNode;
  /** The label itself: the amount. */
  main: ReactNode;
  href?: string;
}

// Logo gold for money in, logo purple for money out; neither reads as "bad".
const IN = "#e4b80c";
const OUT = "#522fe3";
const W = 1000;
const H = 220;
// How long the two standing labels stay before fading; hover brings one back.
const LABELS_MS = 4000;

/** A diverging spike line: in above the centre, out below, the largest of each labelled. */
export function SpikeChart({ entries, label }: { entries: readonly SpikeEntry[]; label: string }) {
  const router = useRouter();
  const [hover, setHover] = useState<number | null>(null);
  // The parent keys this chart on its entries, so new entries (a filter, an earlier page) show the labels again.
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIntro(false), LABELS_MS);
    return () => clearTimeout(timer);
  }, []);
  const values = useMemo(() => entries.map((e) => e.value), [entries]);
  const groups = useMemo(() => entries.map((e) => e.group ?? ""), [entries]);
  const { shapes, mid: MID } = useMemo(() => spikeLayout(values, W, H, 14, groups), [values, groups]);
  const { up, down } = useMemo(() => extremes(values), [values]);
  const labelled = hover !== null ? [hover] : [up, down].filter((i): i is number => i !== null);

  const pick = (clientX: number, box: DOMRect) => {
    const i = Math.floor(((clientX - box.left) / box.width) * entries.length);
    setHover(Math.max(0, Math.min(entries.length - 1, i)));
  };

  return (
    <div
      className="ks-spikes"
      onPointerMove={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
      onPointerDown={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
      onPointerLeave={() => setHover(null)}
      onClick={() => {
        const href = hover !== null ? entries[hover]?.href : undefined;
        if (href) router.push(href);
      }}
    >
      <div className="plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
          <defs>
            <linearGradient id="ks-spike-in" x1="0" y1="0" x2="0" y2={MID} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={IN} stopOpacity="0.45" />
              <stop offset="1" stopColor={IN} stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="ks-spike-out" x1="0" y1={MID} x2="0" y2={H} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={OUT} stopOpacity="0.04" />
              <stop offset="1" stopColor={OUT} stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <line x1={0} x2={W} y1={MID} y2={MID} className="mid" />
          {shapes.map((s, i) => (
            <path key={entries[i].key} d={s.path} className={`${values[i] >= 0 ? "in" : "out"}${hover !== null && hover !== i ? " dim" : ""}`} />
          ))}
        </svg>
        {shapes.map((s, i) => (
          <i
            key={entries[i].key}
            className={`dot ${values[i] >= 0 ? "in" : "out"}${hover !== null && hover !== i ? " dim" : ""}`}
            style={{ left: `${(s.x / W) * 100}%`, top: `${(s.y / H) * 100}%` }}
          />
        ))}
      </div>
      {labelled.map((i) => {
        const s = shapes[i];
        const left = (s.x / W) * 100;
        // Beside the peak, so the card stays inside the chart: right of it, or left near the right edge.
        const align = left > 60 ? "end" : "start";
        return (
          <div key={`label-${entries[i].key}`} className={`ks-spike-card ${values[i] >= 0 ? "in" : "out"} ${align}${hover === null && !intro ? " gone" : ""}`} style={{ left: `${left}%`, top: `${(s.y / H) * 100}%` }}>
            <span>{entries[i].overline}</span>
            <b>{entries[i].main}</b>
          </div>
        );
      })}
    </div>
  );
}
