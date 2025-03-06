import { BETA_ACCESS_KEY, ALLOWED_WALLETS } from "@/config/beta-access";

interface BetaAccessState {
  hasAccess: boolean;
  walletAddress: string;
}

/**
 * Checks if the given wallet address has beta access
 */
export function hasWalletAccess(walletAddress: string): boolean {
  if (!walletAddress) return false;
  return ALLOWED_WALLETS.includes(walletAddress);
}

/**
 * Saves the beta access state to localStorage and as a cookie
 */
export function saveBetaAccess(walletAddress: string): void {
  if (!walletAddress) return;
  
  const isAllowed = hasWalletAccess(walletAddress);
  
  if (isAllowed) {
    const accessState: BetaAccessState = {
      hasAccess: true,
      walletAddress
    };
    
    // Save to localStorage (for client-side checks)
    localStorage.setItem(BETA_ACCESS_KEY, JSON.stringify(accessState));
    
    // Also set a cookie for server-side middleware checks
    document.cookie = `${BETA_ACCESS_KEY}=${JSON.stringify(accessState)}; path=/; max-age=86400`;
  }
}

/**
 * Gets the saved beta access state from localStorage
 */
export function getSavedBetaAccess(): BetaAccessState | null {
  if (typeof window === 'undefined') return null;
  
  const savedAccess = localStorage.getItem(BETA_ACCESS_KEY);
  if (!savedAccess) return null;
  
  try {
    const accessState = JSON.parse(savedAccess) as BetaAccessState;
    
    // Verify the access is still valid
    if (accessState.hasAccess && 
        accessState.walletAddress && 
        ALLOWED_WALLETS.includes(accessState.walletAddress)) {
      return accessState;
    }
  } catch (error) {
    console.error('Error parsing beta access state:', error);
  }
  
  return null;
}

/**
 * Clears the beta access state
 */
export function clearBetaAccess(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(BETA_ACCESS_KEY);
  document.cookie = `${BETA_ACCESS_KEY}=; path=/; max-age=0`;
} 