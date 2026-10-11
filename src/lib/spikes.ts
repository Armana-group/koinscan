// Geometry for the diverging spike chart: one triangle per entry, rising from a
// centre line for money in and dropping below it for money out. Pure.

export interface SpikeShape {
  /** Peak x, and the triangle's base runs from x - half to x + half. */
  x: number;
  half: number;
  /** Peak y; the centre line is at height / 2. */
  y: number;
  path: string;
}

/**
 * Heights in true proportion to the amount, so 25,000 KOIN stands 250 times
 * taller than 100. Amounts of different tokens are not comparable, so each
 * group (KOIN and VHP together, every other token alone) scales to its own
 * largest amount. A small floor keeps the tiniest entry visible as a nub.
 */
export function spikeHeights(values: readonly number[], half: number, groups?: readonly string[], floor = 0.04): number[] {
  const max = new Map<string, number>();
  values.forEach((v, i) => {
    const g = groups?.[i] ?? "";
    max.set(g, Math.max(max.get(g) ?? 0, Math.abs(v)));
  });
  return values.map((v, i) => {
    const top = max.get(groups?.[i] ?? "") ?? 0;
    return half * Math.max(floor, top > 0 ? Math.abs(v) / top : 0);
  });
}

export interface SpikeLayout {
  shapes: SpikeShape[];
  /** The centre line's y: lower when entries are mostly in, higher when mostly out. */
  mid: number;
}

/**
 * Spikes evenly spaced across `width`, touching at the centre line like a
 * heartbeat. The centre line sits where the tallest spike in and the deepest
 * spike out both just fit, so neither side wastes room and every spike keeps
 * its true proportion to the others.
 */
export function spikeLayout(values: readonly number[], width: number, height: number, pad = 10, groups?: readonly string[]): SpikeLayout {
  if (values.length === 0) return { shapes: [], mid: height / 2 };
  const room = height - 2 * pad;
  const fractions = spikeHeights(values, 1, groups);
  const up = Math.max(0, ...fractions.filter((_, i) => values[i] >= 0));
  const down = Math.max(0, ...fractions.filter((_, i) => values[i] < 0));
  const unit = room / (up + down || 1);
  const mid = pad + up * unit;
  const step = width / values.length;
  const shapes = values.map((value, i) => {
    const x = step * (i + 0.5);
    const y = value >= 0 ? mid - fractions[i] * unit : mid + fractions[i] * unit;
    const half = step / 2;
    const path = `M ${(x - half).toFixed(2)} ${mid.toFixed(2)} L ${x.toFixed(2)} ${y.toFixed(2)} L ${(x + half).toFixed(2)} ${mid.toFixed(2)} Z`;
    return { x, half, y, path };
  });
  return { shapes, mid };
}

/** Index of the largest value above zero and the largest below, for the standing labels. */
export function extremes(values: readonly number[]): { up: number | null; down: number | null } {
  let up: number | null = null;
  let down: number | null = null;
  values.forEach((v, i) => {
    if (v > 0 && (up === null || v > values[up])) up = i;
    if (v < 0 && (down === null || v < values[down])) down = i;
  });
  return { up, down };
}
