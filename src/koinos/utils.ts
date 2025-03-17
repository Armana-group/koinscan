import { Contract, Provider, utils } from 'koilib';
import { RPC_NODE, NICKNAMES_CONTRACT_ID } from './constants';

/**
 * Resolves a nickname to an address on Koinos
 * @param nickname The nickname to resolve (with or without @ symbol)
 * @returns The resolved address or null if not found
 */
export async function resolveNickname(nickname: string): Promise<string | null> {
  // Remove @ if present
  const cleanNickname = nickname.startsWith('@') ? nickname.substring(1) : nickname;
  console.log(`[resolveNickname] Attempting to resolve: ${cleanNickname}`);
  
  // Don't try to resolve if it already looks like an address
  if (cleanNickname.startsWith('1') && cleanNickname.length >= 30 && cleanNickname.length <= 36) {
    console.log(`[resolveNickname] Input already looks like an address: ${cleanNickname}`);
    return cleanNickname;
  }
  
  try {
    const provider = new Provider([RPC_NODE]);
    
    // Using the same implementation as the contracts page
    const nicknames = new Contract({
      id: NICKNAMES_CONTRACT_ID,
      provider,
      abi: utils.nicknamesAbi, // This is available from koilib
    });
    
    // Resolve the nickname to an address
    const { result } = await nicknames.functions.get_address({
      value: cleanNickname,
    });
    
    if (!result || !result.value) {
      console.log(`[resolveNickname] No address found for: ${cleanNickname}`);
      return null;
    }
    
    console.log(`[resolveNickname] Resolved to address: ${result.value}`);
    return result.value;
  } catch (error) {
    console.error(`[resolveNickname] Error resolving nickname:`, error);
    return null;
  }
}

/**
 * Gets the image URL for a token or contract
 * @param address The contract address
 * @param nickname Optional nickname for the token
 * @returns URL to the token image
 */
export function getTokenImageUrl(address: string, nickname?: string): string {
  // Default fallback image
  const defaultImage = "https://upload.wikimedia.org/wikipedia/commons/b/bc/Unknown_person.jpg";
  
  // Known contract address mappings - these need to match the filenames in the token-list repo
  const knownContracts: Record<string, string> = {
    // Koin contract address
    "15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL": "koin",
    // VHP contract address
    "18tWNU7EdyUrzr7NMVyqa9YImzaKLgz2r7MVdpqR9LepWL": "vhp",
    // Add more mappings as needed
  };
  
  // For known tokens with nicknames (regardless of address)
  if (nickname) {
    if (nickname.toLowerCase() === 'koin') {
      return 'https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/koin.png';
    }
    if (nickname.toLowerCase() === 'vhp') {
      return 'https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/vhp.png';
    }
  }
  
  // For known contract addresses
  if (address && knownContracts[address]) {
    return `https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/${knownContracts[address]}.png`;
  }
  
  // For other addresses, try using the address directly
  if (address && address.startsWith('1') && address.length >= 30) {
    console.log(`Trying to load image for address: ${address}`);
    return `https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/${address}.png`;
  }
  
  // Fallback to default
  return defaultImage;
} 