// Human names for addresses the explorer already knows about: system
// contracts, block producers, and Fogata pools (loaded at runtime by the
// NamesProvider). Pure data and lookups only.
import {
  GOVERNANCE_CONTRACT_ID,
  KNOWN_PRODUCERS,
  KOIN_CONTRACT_ID,
  KOIN_VHP_DEX_CONTRACT_ID,
  KOINOS_FUND_CONTRACT_ID,
  FOGATA1_LIST_POOLS_CONTRACT_ID,
  FOGATA2_LIST_POOLS_CONTRACT_ID,
  NICKNAMES_CONTRACT_ID,
  POB_CONTRACT_ID,
  VHP_CONTRACT_ID,
} from "@/koinos/constants";

export type ContractGroup = "Core" | "Governance" | "Names and tools" | "Community";
export type ContractGlyph = "koin" | "vhp" | "system" | "gov" | "util" | "pool" | "trade";

export interface KnownContract {
  address: string;
  name: string;
  description: string;
  group: ContractGroup;
  glyph: ContractGlyph;
  /** The short name the REST API and the token list use. */
  slug?: string;
}

export const KNOWN_CONTRACTS: readonly KnownContract[] = [
  { address: KOIN_CONTRACT_ID, name: "Koin", description: "The native token", group: "Core", glyph: "koin", slug: "koin" },
  { address: VHP_CONTRACT_ID, name: "Virtual Hash Power", description: "Burned to produce blocks", group: "Core", glyph: "vhp", slug: "vhp" },
  { address: POB_CONTRACT_ID, name: "Proof of Burn", description: "How blocks are produced", group: "Core", glyph: "system" },
  { address: "1HGN9h47CzoFwU2bQZwe6BYoX4TM6pXc4b", name: "Resources", description: "Mana, the free transaction fuel", group: "Core", glyph: "system" },
  { address: "1H3DobdV873CM5DtqDkhZMcn8eHgMfHJ1T", name: "Byte Launcher", description: "Updates system contracts", group: "Core", glyph: "system" },
  { address: "1GArWiQwb1Wn1yB7VBSUfyhJr4Yv9SW8Pj", name: "Byte Storage", description: "Holds bytecode for new system contracts", group: "Core", glyph: "system" },
  { address: GOVERNANCE_CONTRACT_ID, name: "Governance", description: "Proposals and votes", group: "Governance", glyph: "gov" },
  { address: KOINOS_FUND_CONTRACT_ID, name: "Koinos Fund", description: "Funding for Koinos projects", group: "Governance", glyph: "gov" },
  { address: NICKNAMES_CONTRACT_ID, name: "Nicknames", description: "Human names for addresses, like @julian", group: "Names and tools", glyph: "util" },
  { address: "19WxDJ9Kcvx4VqQFkpwVmwVEy1hMuwXtQE", name: "Name Service", description: "Find contracts by name", group: "Names and tools", glyph: "util" },
  { address: "18zw3ZokdfHtudzaWAUnU4tUvKzKiJeN76", name: "Claim", description: "Claim KOIN from the old chain", group: "Names and tools", glyph: "util" },
  { address: FOGATA2_LIST_POOLS_CONTRACT_ID, name: "Fogata Pools v2", description: "Mining pools", group: "Community", glyph: "pool" },
  { address: FOGATA1_LIST_POOLS_CONTRACT_ID, name: "Fogata Pools v1", description: "The first generation of mining pools", group: "Community", glyph: "pool" },
  { address: KOIN_VHP_DEX_CONTRACT_ID, name: "Koin/VHP DEX", description: "Trade KOIN and VHP", group: "Community", glyph: "trade" },
  { address: "17e1q6Fh5RgnuA8K7v4KvXXH4k9qHgsT5s", name: "KoinDX", description: "Swap any token for another", group: "Community", glyph: "trade" },
];

export const CONTRACT_GROUPS: readonly ContractGroup[] = ["Core", "Governance", "Names and tools", "Community"];

const LEGACY_TOKENS: Record<string, string> = {
  "15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL": "KOIN",
  "1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju": "VHP",
  "18tWNU7E4yuQzz7hMVpceb9ixmaWLVyQsr": "VHP",
};

const STATIC_NAMES: Record<string, string> = (() => {
  const names: Record<string, string> = { ...LEGACY_TOKENS };
  for (const c of KNOWN_CONTRACTS) names[c.address] = c.name;
  // Token contracts read better by symbol in sentences ("sent 95 KOIN").
  names[KOIN_CONTRACT_ID] = "KOIN";
  names[VHP_CONTRACT_ID] = "VHP";
  for (const p of KNOWN_PRODUCERS) if (p.name !== p.address) names[p.address] = p.name;
  return names;
})();

/** The static name for an address, or undefined. Runtime names come from useNames(). */
export function staticName(address: string | null | undefined): string | undefined {
  if (!address) return undefined;
  return STATIC_NAMES[address];
}

export function isKnownProducer(address: string): boolean {
  return KNOWN_PRODUCERS.some((p) => p.address === address);
}

export function knownContract(address: string): KnownContract | undefined {
  return KNOWN_CONTRACTS.find((c) => c.address === address);
}

/** Addresses the REST API and the token list refer to by a short slug. */
export function tokenSlug(address: string): string | undefined {
  if (address === "koin" || address === "vhp") return address;
  return knownContract(address)?.slug;
}
