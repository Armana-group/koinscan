// Small display helpers shared by every page. Pure functions only.

/** "1GGxRh…xtvk" */
export function short(value: string | null | undefined, head = 6, tail = 4): string {
  if (!value) return "";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** "0x12203a9d…4e6f1" for transaction and block ids. */
export function shortId(value: string | null | undefined): string {
  return short(value, 10, 5);
}

/** 40076180 -> "40,076,180" */
export function fmt(value: number | string | null | undefined, maximumFractionDigits = 0): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits });
}

/**
 * A raw on-chain amount ("177094340882", 8 decimals) as "1,770.94". Exact
 * BigInt arithmetic; trailing zeros dropped; at most `maxDecimals` shown.
 */
export function fmtRaw(raw: string | number | null | undefined, decimals = 8, maxDecimals = 4): string {
  if (raw === null || raw === undefined || raw === "") return "0";
  let amount: bigint;
  try {
    amount = BigInt(String(raw));
  } catch {
    return String(raw);
  }
  const negative = amount < BigInt(0);
  if (negative) amount = -amount;
  const scale = BigInt(10) ** BigInt(decimals);
  const whole = amount / scale;
  const fraction = (amount % scale).toString().padStart(decimals, "0");
  let shown = fraction.slice(0, maxDecimals).replace(/0+$/, "");
  // A tiny but non-zero amount should not read as "0".
  if (!shown && amount > BigInt(0) && whole === BigInt(0)) shown = fraction.replace(/0+$/, "").slice(0, 8);
  const wholeText = whole.toLocaleString("en-US");
  return `${negative ? "-" : ""}${wholeText}${shown ? `.${shown}` : ""}`;
}

/** Raw amount to a plain number (for sums and estimates; precision loss is fine there). */
export function rawToNumber(raw: string | number | null | undefined, decimals = 8): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n / 10 ** decimals : 0;
}

/** 7300000 -> "7.30M", 193712 -> "193.7K" */
export function compact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** "2 minutes ago", "just now", "yesterday", "3 days ago", else a date. */
export function ago(timestamp: number | string | Date | null | undefined, now = Date.now()): string {
  const t = toMillis(timestamp);
  if (t === null) return "";
  const s = Math.round((now - t) / 1000);
  if (s < 0) return "in a moment";
  if (s < 5) return "just now";
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.round(d / 7)} week${Math.round(d / 7) === 1 ? "" : "s"} ago`;
  return when(t, false);
}

/** "in 14 hours" for a future time. */
export function until(timestamp: number | string | Date | null | undefined, now = Date.now()): string {
  const t = toMillis(timestamp);
  if (t === null) return "";
  const s = Math.round((t - now) / 1000);
  if (s <= 0) return "now";
  if (s < 60) return "in under a minute";
  const m = Math.round(s / 60);
  if (m < 60) return `in ${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.round(m / 60);
  if (h < 24) return `in ${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return `in ${d} day${d === 1 ? "" : "s"}`;
}

/** "Oct 9, 2026, 5:28 PM" */
export function when(timestamp: number | string | Date | null | undefined, withTime = true): string {
  const t = toMillis(timestamp);
  if (t === null) return "";
  return new Date(t).toLocaleString("en-US", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

/** "today", "yesterday", "on Monday", or a date, for grouping rows by day. */
export function dayLabel(timestamp: number | string | Date | null | undefined, now = Date.now()): string {
  const t = toMillis(timestamp);
  if (t === null) return "earlier";
  const start = (ms: number) => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((start(now) - start(t)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `on ${new Date(t).toLocaleDateString("en-US", { weekday: "long" })}`;
  return `on ${new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function toMillis(timestamp: number | string | Date | null | undefined): number | null {
  if (timestamp === null || timestamp === undefined || timestamp === "") return null;
  if (timestamp instanceof Date) return timestamp.getTime();
  const n = Number(timestamp);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Seconds vs milliseconds: anything before 2001 in ms is really seconds.
  return n < 1e11 ? n * 1000 : n;
}

/** Initials for an avatar: "JGA Pool #3" -> "JP", an address -> its 2nd and 3rd characters. */
export function initials(label: string | null | undefined, address?: string): string {
  if (label) {
    const words = label.replace(/[^A-Za-z0-9 ]/g, " ").split(" ").filter(Boolean);
    const text = words.map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    if (text) return text;
  }
  if (address) return address.slice(1, 3).toUpperCase();
  return "?";
}

/** A stable hue for an address so unknown accounts keep the same colour everywhere. */
export function hue(value: string): number {
  let h = 0;
  for (const c of value) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** "deposit_koin" -> "Deposit KOIN", "set_reward_preference" -> "Set reward preference" */
export function humanize(method: string | number | null | undefined): string {
  if (method === null || method === undefined) return "";
  const text = String(method)
    .replace(/^method\((.*)\)$/, "$1")
    .split("_")
    .filter(Boolean)
    .map((w) => (/^(koin|vhp|dex|abi|rc|id)$/i.test(w) ? w.toUpperCase() : w))
    .join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${fmt(n)} ${n === 1 ? word : pluralWord}`;
}
