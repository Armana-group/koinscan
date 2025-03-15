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