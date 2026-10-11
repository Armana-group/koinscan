export interface LinePoint {
  x: number;
  y: number;
}

export interface LineScale {
  /** SVG path through every point. */
  line: string;
  /** The same path closed down to the bottom edge, for a soft fill. */
  area: string;
  /** Pixel position of each point, in input order. */
  at: { x: number; y: number }[];
  /** Pixel height of a value, for reference lines. */
  yOf: (value: number) => number;
}

/**
 * Fits points into a width x height box with `pad` pixels top and bottom.
 * The y range covers the data and any `include` values (a target line, say),
 * so a flat series still sits in the middle instead of on an edge.
 */
export function scaleLine(points: readonly LinePoint[], width: number, height: number, pad = 4, include: readonly number[] = []): LineScale {
  if (points.length === 0) return { line: "", area: "", at: [], yOf: () => height / 2 };
  const xs = points.map((p) => p.x);
  const ys = [...points.map((p) => p.y), ...include];
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  let y0 = Math.min(...ys);
  let y1 = Math.max(...ys);
  if (y1 === y0) {
    const spread = Math.abs(y0) * 0.05 || 1;
    y0 -= spread;
    y1 += spread;
  }
  const xOf = (x: number) => (x1 === x0 ? width / 2 : ((x - x0) / (x1 - x0)) * width);
  const yOf = (y: number) => pad + (1 - (y - y0) / (y1 - y0)) * (height - 2 * pad);
  const at = points.map((p) => ({ x: xOf(p.x), y: yOf(p.y) }));
  const line = at.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const area = `${line} L ${at[at.length - 1].x.toFixed(2)} ${height} L ${at[0].x.toFixed(2)} ${height} Z`;
  return { line, area, at, yOf };
}

/** Index of the point whose pixel x is closest to `px`. */
export function nearest(at: readonly { x: number }[], px: number): number {
  let best = 0;
  for (let i = 1; i < at.length; i++) if (Math.abs(at[i].x - px) < Math.abs(at[best].x - px)) best = i;
  return best;
}
