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
    date: "2026-10-08",
    displayDate: "October 8, 2026",
    title: "Custom RPC nodes, block producer history, and faster failures",
    summary:
      "Pointing KoinScan at your own Koinos node works again, block producers see their rewards in address history, and an unreachable node fails fast.",
    changes: [
      "Fix custom RPC nodes, which the browser had been refusing since the June security hardening.",
      "Pick a trusted node from the settings menu: Koinos Community Foundation, Armana, or KoinosBlocks.",
      "Keep the free-text field for any other node. Custom nodes are read directly from your browser, never relayed through KoinScan's servers.",
      "Allow a local node over http://localhost for development and testing.",
      "Show blocks an address produced in its history as reward rows, with the KOIN earned and VHP burned, instead of an empty list.",
      "Report an unreachable RPC node within seconds, naming the node, instead of leaving balances loading for over a minute.",
    ],
    contributors: ["Ron Hamenahem"],
    commits: ["59fe8ae", "56ebfc0", "747f994"],
  },
  {
    date: "2026-10-02",
    displayDate: "October 2, 2026",
    title: "Fogata v2 beta, guide, and link previews",
    summary:
      "Fogata v2 opens as a public beta with a plain-language guide, clearer wallet controls, and rich previews when you share KoinScan links.",
    changes: [
      "Open Fogata v2 as a public beta. Feedback on bugs, confusing steps, and ideas is welcome in the Armana Telegram.",
      "Add the Fogata guide, covering how Koinos mining works, choosing a pool, deposits, reward settings, withdrawals, trading, and troubleshooting.",
      "Link each Fogata screen to the matching section of the guide, and summarize what changed in v2 on the pools page.",
      "Switch between shared Kondor accounts, disconnect, or forget a remembered address from the wallet menu, and see the connected account's KOIN balance.",
      "Show a rich preview when a KoinScan link is shared, with the amount and parties for transfers and the method for contract calls.",
      "Give Fogata links their own preview card.",
    ],
    contributors: ["Julian Gonzalez", "Ron Hamenahem"],
    commits: ["2331d30", "8c31127", "f019678"],
  },
  {
    date: "2026-09-19",
    displayDate: "September 19, 2026",
    title: "Fogata staking pools and VHP trading",
    summary:
      "Fogata v2 mining pools now live on Koinscan with a one-thing-per-screen design: a pools list, a pool page, and a place to trade VHP for KOIN.",
    changes: [
      "List Fogata v2 pools with their estimated yearly yield after fees, total VHP staked, and the pools' share of network production.",
      "Show each pool's yield or your stake first, with deposit, withdraw, and reward settings a tap away and pool details below.",
      "Trade VHP for KOIN, or KOIN for VHP, by placing an order; a matching open order is offered as a shortcut.",
      "Explain how pools and trading work in plain language on each page, collapsed by default.",
      "Replace native number inputs with decimal amount fields, so there are no spinner arrows or exponent notation.",
      "Redirect the earlier dApps addresses to the new Fogata section.",
    ],
    contributors: ["Ron Hamenahem", "Julian Gonzalez"],
    commits: ["2add423", "5115a88", "761e8a9"],
  },
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
