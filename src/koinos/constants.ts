export const CONTRACT_ID = "1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju";
export const RPC_NODE = "https://harbinger-api.koinos.io";
export const BLOCK_EXPLORER = "https://harbinger.koinosblocks.com";
export const NETWORK_NAME = "harbinger";

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
