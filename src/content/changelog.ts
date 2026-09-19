export interface ChangelogEntry {
  date: string;
  displayDate: string;
  title: string;
  summary: string;
  changes: readonly string[];
  contributors: readonly [string, ...string[]];
  commits: readonly [string, ...string[]];
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
    contributors: ["Ron Hamenahem"],
    commits: ["0e3652c", "5d9698d"],
  },
  {
    date: "2026-08-21",
    displayDate: "August 21, 2026",
    title: "More reliable contract interactions",
    summary:
      "Contract pages now handle a wider range of live ABIs without crashing or returning misleading balance results.",
    changes: [
      "Use current KOIN and VHP contract identifiers with dependable token ABI fallbacks.",
      "Normalize legacy entry-point and read-only fields when contracts publish older ABI formats.",
      "Provide safe default outputs so empty balance results decode as zero when appropriate.",
      "Avoid repeated renders and serializer failures while preserving real contract-call errors.",
    ],
    contributors: ["Julian Gonzalez"],
    commits: ["993b052", "002fe20"],
  },
  {
    date: "2026-06-12",
    displayDate: "June 12, 2026",
    title: "Reliable blockchain requests and safer administration",
    summary:
      "Blockchain data now loads through a same-origin fallback when upstream browser requests are blocked, with stronger administrative boundaries.",
    changes: [
      "Route approved Koinos REST requests through a server endpoint to avoid upstream browser CORS failures.",
      "Reject unsupported origins and paths at the proxy boundary.",
      "Require authenticated whitelist administration instead of relying on client-set access cookies.",
      "Add browser security headers, restricted image hosts, and repeatable security checks.",
    ],
    contributors: ["Ron Hamenahem"],
    commits: ["ab5afad"],
  },
  {
    date: "2026-06-02",
    displayDate: "June 2, 2026",
    title: "Correct transfers and resilient account history",
    summary:
      "Transaction views now decode on-chain transfers accurately and keep account history available when a REST endpoint fails.",
    changes: [
      "Decode encoded transfer events into the correct sender, recipient, and token amount.",
      "Preserve exact token quantities instead of losing precision during display formatting.",
      "Fall back to Koinos JSON-RPC when REST account history is unavailable or malformed.",
      "Show the deployed Git commit in the footer so the running version can be identified.",
    ],
    contributors: ["Ron Hamenahem"],
    commits: ["6b03103", "9a2817c", "8bacf94", "0023b99"],
  },
  {
    date: "2026-01-22",
    displayDate: "January 22, 2026",
    title: "Clearer transaction history and accurate balances",
    summary:
      "Address pages gained a cleaner activity view and direct token balance checks designed around the behavior of Koinos contracts.",
    changes: [
      "Add an advanced history view while keeping the default transaction rows easier to scan.",
      "Improve token transfer details in expanded transactions.",
      "Read balances directly from token contracts and process them in batches to protect RPC nodes.",
      "Introduce KOIN price and USD-value displays with consistent currency formatting.",
    ],
    contributors: ["Ron Hamenahem"],
    commits: ["0c07e48", "d31ed3f"],
  },
] as const satisfies readonly ChangelogEntry[];
