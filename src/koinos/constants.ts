export const CONTRACT_ID = "1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju";
// REST API endpoint for account history, balances, etc.
export const RPC_NODE = "https://rest.koinos.io";
// JSON-RPC endpoints (for koilib Provider):
// export const RPC_NODE = "https://api.koinos.io";
// export const RPC_NODE = "https://api.koinosblocks.com";
// Use our own explorer instead of external service
export const BLOCK_EXPLORER = "";  // Empty string means relative URLs
export const NETWORK_NAME = "mainnet";
export const NICKNAMES_CONTRACT_ID = "1KD9Es7LBBjA1FY3ViCgQJ7e6WH1ipKbhz";
export const GOVERNANCE_CONTRACT_ID = "19qj51eTbSFJYU7ZagudkpxPgNSzPMfdPX";

export const WALLET_CONNECT_MODAL_SIGN_OPTIONS = {
  // Get your projectId by creating a free WalletConnect
  // cloud project at https://cloud.walletconnect.com
  projectId: "d148ec2da7b4b498893e582c0c36dfb5",
  metadata: {
    name: "My-dApp1",
    description: "my dapp description",
    url: "https://example.com",
    icons: [
      "https://walletconnect.com/_next/static/media/logo_mark.84dd8525.svg",
    ],
  },
  modalOptions: {
    explorerRecommendedWalletIds: "NONE" as const,
    enableExplorer: false,
  },
};

export const KNOWN_PRODUCERS = [{
  name: "Freedom Pool",
  address: "18DmHs6kCnr4E9Rr2Hcvm3YfXhiQ9wBuNq",
}, {
  name: "Koinnoisseur's max VAPOR pool",
  address: "15jueaBcMieDCMGw6wAmEK6cNSUVicknG1",
}, {
  name: "JGA Pool #1",
  address: "1DGNQQimsyBQajzQdWXY96m84YyDC2pUpB",
}, {
  name: "Engrave development sponsorship pool",
  address: "13iFaqgdnsoqUTCwZC9GtRXwh8ZvdiiPwm",
}, {
  name: "OnKoinos (made in Australia)",
  address: "1MFXTiWWGGhrCzGsH5TJ9x1zRyN8sNwYPr",
}, {
  name: "Koinos en español",
  address: "1KfD7n93LnnihyygopWUVTkbtWVe5aXXGW",
}, {
  name: "Koinos Group",
  address: "1EPZaqve43k9Jq5mNeT2ydCjUiytTTU4U",
}, {
  name: "KoinForge",
  address: "14iHqMGBznBM7xJXhkrQ266FgoFdymCqLM",
}, {
  name: "Koinnoisseur's max VHP pool",
  address: "18UYKhWVCbTpFs8oYC54xoiCQQthhEkX7m",
}, {
  name: "AlgoScout",
  address: "1DWpSxntZbLU9HvGDPkSqdKrVvNRoUwAis",
}, {
  name: "Koinnoisseur's quick KOIN restore pool",
  address: "1GJxaZw2BPU7NhB7fuVGKfQxaQ3tkhVKb8",
}, {
  name: "RWA and Company",
  address: "1FodaaRAcubVgH7goBvLx7C87Mpex7fAvs",
}, {
  name: "JGA Pool #2",
  address: "1MbsVfNw6yzQqA8499d8KQj8qdLyRs8CzW",
}, {
  name: "1JrsQXbrDqkT9yUH6gtj4yhQi1kgWwsohh",
  address: "1JrsQXbrDqkT9yUH6gtj4yhQi1kgWwsohh",
}];
