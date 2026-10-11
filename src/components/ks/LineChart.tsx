"use client";

import { useMemo, useState, type ReactNode } from "react";
import { nearest, scaleLine, type LinePoint } from "@/lib/line";

const W = 1000;

interface LineChartProps {
  points: readonly LinePoint[];
  height: number;
  /** Line colour; the fill under it is the same colour, faded. */
  colour?: string;
  /** A dashed horizontal line, such as a target. */
  reference?: number;
  /** What to show for a point while the pointer is over it. */
  readout: (point: LinePoint) => ReactNode;
  /** What to show when the pointer is elsewhere. */
  idle?: ReactNode;
  label: string;
}

/** A thin line with a soft fill; hover or touch to read one point. */
export function LineChart({ points, height, colour = "var(--ink)", reference, readout, idle, label }: LineChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const scale = useMemo(() => scaleLine(points, W, height, 6, reference === undefined ? [] : [reference]), [points, height, reference]);
  const point = hover === null ? null : scale.at[hover];

  const track = (clientX: number, box: DOMRect) => {
    if (!scale.at.length) return;
    setHover(nearest(scale.at, ((clientX - box.left) / box.width) * W));
  };

  return (
    <div className="ks-line">
      <div className="ks-line-read">{hover === null ? idle : readout(points[hover])}</div>
      <div
        className="ks-line-plot"
        style={{ height }}
        onPointerMove={(event) => track(event.clientX, event.currentTarget.getBoundingClientRect())}
        onPointerDown={(event) => track(event.clientX, event.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
          <path d={scale.area} fill={colour} opacity={0.08} />
          {reference !== undefined && <line x1={0} x2={W} y1={scale.yOf(reference)} y2={scale.yOf(reference)} className="ref" />}
          <path d={scale.line} fill="none" stroke={colour} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {point && <line x1={point.x} x2={point.x} y1={0} y2={height} className="cursor" />}
        </svg>
        {point && <i style={{ left: `${(point.x / W) * 100}%`, top: point.y, background: colour }} />}
      </div>
    </div>
  );
}
