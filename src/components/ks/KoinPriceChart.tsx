"use client";

import { useEffect, useMemo, useState } from "react";
import { useKoinQuote } from "@/hooks/useKoinPrice";
import { PRICE_RANGES, type PricePoint, type PriceRange } from "@/lib/armana-price";
import { formatChange, formatKoinUsd } from "@/lib/price";
import { Filters } from "@/components/ks/Controls";
import { LineChart } from "@/components/ks/LineChart";

const RANGE_LABEL: Record<PriceRange, string> = { "24h": "24 hours", "7d": "7 days", "30d": "30 days" };

function when(t: number, range: PriceRange): string {
  const date = new Date(t);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return range === "24h" ? time : `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

/** The KOIN price now and a line of it over a chosen range, from Armana's price service. */
export function KoinPriceChart() {
  const quote = useKoinQuote();
  const [range, setRange] = useState<PriceRange>("24h");
  const [history, setHistory] = useState<{ range: PriceRange; points: PricePoint[] } | null>(null);
  // The range buttons appear once any range has a line to show, so the page stays quiet without history.
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/koin-price/history?range=${range}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { points?: PricePoint[] } | null) => {
        if (!active) return;
        const points = body?.points ?? [];
        setHistory({ range, points });
        if (points.length > 1) setHasHistory(true);
      })
      .catch(() => active && setHistory({ range, points: [] }));
    return () => {
      active = false;
    };
  }, [range]);

  const points = useMemo(() => (history?.range === range ? history.points : []), [history, range]);
  const line = useMemo(() => points.map((p) => ({ x: p.t, y: p.usd })), [points]);
  const first = points[0]?.usd;
  const last = points[points.length - 1]?.usd;
  const rangeChange = first && last ? (100 * (last - first)) / first : null;
  const change = range === "24h" ? quote?.change ?? rangeChange : rangeChange;
  const colour = change === null || change >= 0 ? "var(--ok)" : "var(--bad)";

  if (!quote) return null;
  return (
    <section className="ks-price" aria-label="KOIN price">
      <div className="ks-price-now">
        <b>{formatKoinUsd(quote.usd)}</b>
        {change !== null && (
          <span className={change >= 0 ? "up" : "down"}>
            {formatChange(change)} <em>in {RANGE_LABEL[range]}</em>
          </span>
        )}
      </div>
      {line.length > 1 && (
        <LineChart
          points={line}
          height={150}
          colour={colour}
          label={`KOIN price over ${RANGE_LABEL[range]}`}
          idle={<>KOIN in US dollars over {RANGE_LABEL[range]}</>}
          readout={(p) => (
            <>
              <b>{formatKoinUsd(p.y)}</b> · {when(p.x, range)}
            </>
          )}
        />
      )}
      {hasHistory && <Filters label="Price range" options={PRICE_RANGES.map((r) => ({ value: r, label: r.toUpperCase() }))} value={range} onChange={setRange} />}
    </section>
  );
}
