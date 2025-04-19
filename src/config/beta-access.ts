/**
 * Beta Access Control Configuration
 * 
 * This file manages access control for the beta version of the application.
 * Set BETA_ACCESS_ENABLED to false when ready for public release.
 */

import whitelist from './whitelist.json';

// Master toggle for beta access restriction
export const BETA_ACCESS_ENABLED = false;

// Paths that should always be accessible even when beta access is enabled
export const PUBLIC_PATHS = [
  '/beta-access',
  '/_next',
  '/api',
  '/favicon.ico',
  '/images',
];

// Combined list of all allowed wallets
export const ALLOWED_WALLETS = [...whitelist.whitelisted, ...whitelist.dev];

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

// Functions to manage whitelist
export async function addWalletToWhitelist(wallet: string): Promise<void> {
  const response = await fetch('/api/admin/whitelist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ wallet, action: 'add' }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to add wallet to whitelist');
  }
}

export async function removeWalletFromWhitelist(wallet: string): Promise<void> {
  const response = await fetch('/api/admin/whitelist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ wallet, action: 'remove' }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to remove wallet from whitelist');
  }
} 