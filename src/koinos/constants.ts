export const CONTRACT_ID = "1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju";
// export const RPC_NODE = "https://api.koinos.io";
export const RPC_NODE = "https://api.koinosblocks.com";
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
