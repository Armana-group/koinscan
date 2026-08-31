export interface ChangelogEntry {
  date: string;
  displayDate: string;
  title: string;
  summary: string;
  changes: readonly string[];
  commit: string;
}

export const changelogEntries = [
  {
    date: "2026-08-30",
    displayDate: "August 30, 2026",
    title: "Accurate balances and market pricing",
    summary:
      "Address pages now report verified on-chain balances and current KOIN market values with clearer failure handling.",
    changes: [
      "Display all verified token holdings, including balances from the current KOIN and VHP contracts.",
      "Count the complete transaction history and reduce request bursts that could trigger API rate limits.",
      "Keep transient API failures from replacing the last verified block information or opening noisy browser errors.",
      "Use CoinMarketCap for the current KOIN price through a protected, server-cached endpoint.",
    ],
    commit: "5d9698d",
  },
] as const satisfies readonly ChangelogEntry[];
