// Mana is the free resource credit every KOIN holder has. It is spent by
// transactions and refills to the full KOIN balance over five days.

const REGEN_MS = 5 * 24 * 60 * 60 * 1000;

export interface ManaSummary {
  /** 0–100, whole number. */
  percent: number;
  /** "full", "full in 2 h", "full in 3 d" … */
  fullIn: string;
}

function duration(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.round(ms / 3_600_000);
  if (hours < 48) return `${Math.max(1, hours)} h`;
  return `${Math.round(ms / 86_400_000)} d`;
}

/** Both values are raw satoshi strings as the chain returns them. */
export function manaSummary(rc: string | null | undefined, koin: string | null | undefined): ManaSummary | null {
  if (!rc || !koin || !/^\d+$/.test(rc) || !/^\d+$/.test(koin)) return null;
  const max = BigInt(koin);
  if (max === BigInt(0)) return { percent: 0, fullIn: "no KOIN" };
  const have = BigInt(rc) > max ? max : BigInt(rc);
  const ratio = Number((have * BigInt(10_000)) / max) / 10_000;
  if (have === max) return { percent: 100, fullIn: "full" };
  const percent = Math.floor(ratio * 100);
  return { percent, fullIn: `full in ${duration((1 - ratio) * REGEN_MS)}` };
}
