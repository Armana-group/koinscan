// Turns whatever someone typed into the search box into a route. The
// classification is pure so it can be tested; the token check needs the chain.

export type SearchKind = "tx" | "nickname" | "block" | "symbol" | "address" | "empty" | "unknown";

export interface SearchQuery {
  kind: SearchKind;
  value: string;
}

const TX_ID = /^(0x)?[0-9a-fA-F]{64,}$/;
const ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{25,36}$/;

export function classifySearch(raw: string): SearchQuery {
  const value = raw.trim();
  if (!value) return { kind: "empty", value };

  if (TX_ID.test(value)) return { kind: "tx", value: value.startsWith("0x") ? value : `0x${value}` };

  if (value.startsWith("@")) {
    const nickname = value.slice(1).trim().toLowerCase();
    return nickname ? { kind: "nickname", value: nickname } : { kind: "empty", value: "" };
  }

  // "Block 40,041,420", "#40041420", "40041420"
  const block = value.replace(/^block\s*/i, "").replace(/^#/, "").replace(/[,\s]/g, "");
  if (/^\d+$/.test(block)) return { kind: "block", value: block };

  if (/^(koin|vhp)$/i.test(value)) return { kind: "symbol", value: value.toLowerCase() };

  if (ADDRESS.test(value) && value.startsWith("1")) return { kind: "address", value };

  // A bare word is most likely a nickname typed without the @.
  if (/^[a-z0-9_.-]{1,32}$/i.test(value)) return { kind: "nickname", value: value.toLowerCase() };

  return { kind: "unknown", value };
}
