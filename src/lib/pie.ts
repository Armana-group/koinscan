/** Colours for the largest slices, from the logo outward; the rest share two greys. */
export const PIE_COLOURS = ["#522fe3", "#e05252", "#e4b80c", "#2f9e6b", "#16121c", "#ef8a3c", "#1f9aa8", "#c94f8a"];
const REST = ["#cfcbd3", "#e3e0e6"];

export function pieColour(index: number): string {
  return index < PIE_COLOURS.length ? PIE_COLOURS[index] : REST[(index - PIE_COLOURS.length) % REST.length];
}

function point(cx: number, cy: number, r: number, turn: number): string {
  const a = 2 * Math.PI * turn - Math.PI / 2;
  return `${(cx + r * Math.cos(a)).toFixed(3)} ${(cy + r * Math.sin(a)).toFixed(3)}`;
}

/**
 * One SVG path per share for a ring centred on (cx, cy), clockwise from twelve
 * o'clock. Shares are scaled to their total, so they need not add up to 100.
 */
export function ringPaths(shares: readonly number[], cx: number, cy: number, outer: number, inner: number): string[] {
  const total = shares.reduce((sum, s) => sum + Math.max(0, s), 0);
  if (total <= 0) return shares.map(() => "");
  let from = 0;
  return shares.map((share) => {
    const part = Math.max(0, share) / total;
    const to = from + part;
    let d = "";
    if (part >= 1) {
      // A whole ring: two half arcs each way, since one arc cannot end where it starts.
      d = `M ${point(cx, cy, outer, 0)} A ${outer} ${outer} 0 1 1 ${point(cx, cy, outer, 0.5)} A ${outer} ${outer} 0 1 1 ${point(cx, cy, outer, 0)} ` + `M ${point(cx, cy, inner, 0)} A ${inner} ${inner} 0 1 0 ${point(cx, cy, inner, 0.5)} A ${inner} ${inner} 0 1 0 ${point(cx, cy, inner, 0)} Z`;
    } else if (part > 0) {
      const large = part > 0.5 ? 1 : 0;
      d = `M ${point(cx, cy, outer, from)} A ${outer} ${outer} 0 ${large} 1 ${point(cx, cy, outer, to)} L ${point(cx, cy, inner, to)} A ${inner} ${inner} 0 ${large} 0 ${point(cx, cy, inner, from)} Z`;
    }
    from = to;
    return d;
  });
}
