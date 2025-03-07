/**
 * Beta Access Control Configuration
 * 
 * This file manages access control for the beta version of the application.
 * Set BETA_ACCESS_ENABLED to false when ready for public release.
 */

// Master toggle for beta access restriction
export const BETA_ACCESS_ENABLED = true;

// Paths that should always be accessible even when beta access is enabled
export const PUBLIC_PATHS = [
  '/beta-access',
  '/_next',
  '/api',
  '/favicon.ico',
  '/images',
];

// Add wallet addresses that are allowed to access the beta
export const WHITELISTED_WALLETS: string[] = [
  // Add your invited wallet addresses here
  // Example: "15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL",
  
  // ⬇️ ADD YOUR WALLET ADDRESS BELOW FOR TESTING ⬇️
  
  // ⬆️ ADD YOUR WALLET ADDRESS ABOVE FOR TESTING ⬆️
  "12mutMcqqWavhfri2yXWSv77oh7PVY2WSS",
  "18fjEQn9bJQnB75BX97WXghMeVKHNJ6mmg",
  "@jga",
  "jga"
];

// Optional: Add some test wallets for your team during development
export const DEV_WALLETS: string[] = [
  // Add your development team wallets here
];

// Combined list of all allowed wallets
export const ALLOWED_WALLETS = [...WHITELISTED_WALLETS, ...DEV_WALLETS];

// Function to get nickname for a wallet if available
export function getNicknameForWallet(walletAddress: string): string | null {
  // Check if the wallet address starts with '@' or doesn't look like a blockchain address
  if (walletAddress.startsWith('@') || !walletAddress.match(/^[0-9a-zA-Z]{10,}/)) {
    return walletAddress;
  }
  
  // For regular wallet addresses, return null (no nickname)
  return null;
}

// Local storage key for storing beta access state
export const BETA_ACCESS_KEY = "koinos-explorer-beta-access"; 