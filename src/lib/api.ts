import { Provider, Transaction, utils } from 'koilib';

// Initialize the Koinos provider
const provider = new Provider(['https://api.koinos.io']);

export interface FormattedOperation {
  type: string;
  contract?: string;
  method?: string;
  args?: Record<string, any>;
  data?: any;
}

// Define the blockchain transaction interface
export interface BlockchainTransaction {
  id: string;
  payer: string;
  timestamp: string;
  operations: Array<{
    upload_contract?: {
      contract_id: string;
      [key: string]: any;
    };
    call?: {
      contract_id: string;
      entry_point: number;
      args: Record<string, any>;
    };
    set_system_call?: Record<string, any>;
    set_system_contract?: {
      contract_id: string;
      [key: string]: any;
    };
  }>;
}

export interface FormattedTransaction extends BlockchainTransaction {
  formattedOperations: FormattedOperation[];
}

// New interfaces for the detailed transaction history endpoint
export interface TransactionEvent {
  sequence: number;
  source: string;
  name: string;
  data: Record<string, any>;
  impacted: string[];
}

export interface TransactionReceipt {
  id: string;
  payer: string;
  max_payer_rc: string;
  rc_limit: string;
  rc_used: string;
  disk_storage_used: string;
  network_bandwidth_used: string;
  compute_bandwidth_used: string;
  events: TransactionEvent[];
  state_delta_entries?: any[];
}

export interface TransactionOperation {
  call_contract?: {
    contract_id: string;
    entry_point: string;
    args: Record<string, any>;
  };
  upload_contract?: any;
  set_system_call?: any;
  set_system_contract?: any;
}

export interface TransactionHeader {
  chain_id: string;
  rc_limit: string;
  nonce: string;
  operation_merkle_root: string;
  payer: string;
}

export interface TransactionData {
  id: string;
  header: TransactionHeader;
  operations: TransactionOperation[];
  signatures: string[];
}

export interface DetailedTransaction {
  seq_num?: string;
  trx: {
    transaction: TransactionData;
    receipt: TransactionReceipt;
  };
}

export async function getAddressHistory(
  address: string,
  limit: number = 10,
  includeIncoming: boolean = false,
  includeOutgoing: boolean = true
): Promise<BlockchainTransaction[]> {
  try {
    // Get transactions where the address is the payer (outgoing)
    const outgoingPromise = includeOutgoing
      ? provider.call('transaction_store.get_account_transactions', {
          account: address,
          ascending: false,
          limit,
        })
      : Promise.resolve({ transactions: [] });

    // Get transactions where the address is involved (incoming)
    const incomingPromise = includeIncoming
      ? provider.call('transaction_store.get_account_rc_transactions', {
          account: address,
          ascending: false,
          limit,
        })
      : Promise.resolve({ transactions: [] });

    const [outgoingResult, incomingResult] = await Promise.all([outgoingPromise, incomingPromise]);
    const outgoing = outgoingResult as { transactions: BlockchainTransaction[] };
    const incoming = incomingResult as { transactions: BlockchainTransaction[] };

    // Combine and sort transactions
    const allTransactions = [
      ...(outgoing.transactions || []),
      ...(incoming.transactions || []),
    ];

    // Remove duplicates based on transaction ID
    const uniqueTransactions = Array.from(
      new Map(allTransactions.map(tx => [tx.id, tx])).values()
    );

    // Sort by timestamp descending
    return uniqueTransactions.sort((a, b) => {
      const timestampA = parseInt(a.timestamp || '0');
      const timestampB = parseInt(b.timestamp || '0');
      return timestampB - timestampA;
    }).slice(0, limit);
  } catch (error) {
    console.error('Error fetching address history:', error);
    throw error;
  }
}

export function formatTransactions(transactions: BlockchainTransaction[]): FormattedTransaction[] {
  return transactions.map(tx => {
    const formattedOperations = tx.operations?.map((op: any) => {
      let formattedOp: FormattedOperation = {
        type: 'Unknown Operation'
      };

      if ('upload_contract' in op) {
        formattedOp = {
          type: 'Upload Contract',
          contract: op.upload_contract?.contract_id,
          data: op.upload_contract
        };
      } else if ('call' in op) {
        formattedOp = {
          type: 'Contract Call',
          contract: op.call?.contract_id,
          method: op.call?.entry_point.toString(),
          args: op.call?.args
        };
      } else if ('set_system_call' in op) {
        formattedOp = {
          type: 'System Call',
          data: op.set_system_call
        };
      } else if ('set_system_contract' in op) {
        formattedOp = {
          type: 'Set System Contract',
          contract: op.set_system_contract?.contract_id,
          data: op.set_system_contract
        };
      }

      return formattedOp;
    }) || [];

    return {
      ...tx,
      formattedOperations
    };
  });
}

// Add a helper function to decode entry points to human-readable method names
function decodeEntryPoint(entryPoint: string): string {
  // Convert the entry point to a more consistent format for comparison
  const entryPointHex = entryPoint.startsWith('0x') 
    ? entryPoint.toLowerCase() 
    : `0x${parseInt(entryPoint).toString(16).padStart(8, '0')}`.toLowerCase();
  
  // Common entry points for Koinos token contracts and other contracts
  const entryPoints: Record<string, string> = {
    '0x82a3537f': 'name',
    '0xb76a7ca1': 'symbol',
    '0xee80fd2f': 'decimals',
    '0xb0da3934': 'totalSupply',
    '0x5c721497': 'balanceOf',
    '0x27f576ca': 'transfer',
    '0xdc6f17bb': 'mint',
    '0x859facc5': 'burn',
    // Governance contract
    '0xe74b785c': 'propose',
    '0xc66013ad': 'vote',
    '0x66206f76': 'getProposal',
    '0xd44caa11': 'getVote',
    '0x531d5d4e': 'getPendingProposals',
    // Add more entry points as needed
  };
  
  return entryPoints[entryPointHex] || `method(${entryPoint})`;
}

// List of known contract categories
interface ContractCategory {
  id: string;
  name: string;
  tags: string[];
  type: 'token' | 'governance' | 'dapp' | 'system' | 'other';
}

// Known contracts with their associated categories and tags
const knownContracts: ContractCategory[] = [
  {
    id: '15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL',
    name: 'KOIN Token',
    tags: ['token', 'koin'],
    type: 'token'
  },
  {
    id: '1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju',
    name: 'VHP Token',
    tags: ['token', 'vhp'],
    type: 'token'
  },
  {
    id: '13tmzDmfqCsbYT26C4CmKxq86d33senqH3',
    name: 'KAP (Koinos Account Protocol)',
    tags: ['kap', 'naming', 'dapp'],
    type: 'dapp'
  },
  {
    id: '19WxDJ9Kcvx4VqQFkpwLbMkPc4wqzSDwKK',
    name: 'Governance',
    tags: ['governance', 'system'],
    type: 'governance'
  },
  // Add more known contracts as needed
];

// Known method categories
interface MethodCategory {
  name: string;
  tags: string[];
}

// Known methods with their associated tags
const methodCategories: Record<string, MethodCategory> = {
  'transfer': { name: 'Transfer', tags: ['transfer'] },
  'mint': { name: 'Mint', tags: ['mint', 'token-creation'] },
  'burn': { name: 'Burn', tags: ['burn', 'token-destruction'] },
  'balanceOf': { name: 'Balance Check', tags: ['query', 'read-only'] },
  'name': { name: 'Token Name', tags: ['query', 'token-info', 'read-only'] },
  'symbol': { name: 'Token Symbol', tags: ['query', 'token-info', 'read-only'] },
  'decimals': { name: 'Token Decimals', tags: ['query', 'token-info', 'read-only'] },
  'totalSupply': { name: 'Token Supply', tags: ['query', 'token-info', 'read-only'] },
  'propose': { name: 'Create Proposal', tags: ['governance', 'proposal'] },
  'vote': { name: 'Vote', tags: ['governance', 'voting'] },
  'getProposal': { name: 'Get Proposal', tags: ['governance', 'query', 'read-only'] },
  'getVote': { name: 'Get Vote', tags: ['governance', 'query', 'read-only'] },
  'getPendingProposals': { name: 'Get Pending Proposals', tags: ['governance', 'query', 'read-only'] },
  // Add more method categories as needed
};

/**
 * Analyzes a transaction and assigns appropriate tags
 * @param tx The formatted transaction to analyze
 * @returns An array of tags for the transaction
 */
function analyzeAndTagTransaction(tx: any): { tags: string[], primaryTag: string } {
  const tags = new Set<string>();
  let primaryTag = '';
  
  // Check for token transfers first
  if (tx.totalValueTransferred !== '0') {
    tags.add('transfer');
    primaryTag = 'Transfer';
  }
  
  // Check operations
  for (const op of tx.operations) {
    if (op.type === 'Contract Call' && op.contract && op.method) {
      // Check if it's a known contract
      const contractInfo = knownContracts.find(c => c.id === op.contract);
      if (contractInfo) {
        contractInfo.tags.forEach(tag => tags.add(tag));
        
        // Set primary tag based on contract type if not already set
        if (!primaryTag && contractInfo.type) {
          if (contractInfo.type === 'token') primaryTag = 'Token';
          else if (contractInfo.type === 'governance') primaryTag = 'Governance';
          else if (contractInfo.type === 'dapp') primaryTag = 'DApp';
          else if (contractInfo.type === 'system') primaryTag = 'System';
        }
      }
      
      // Check method category
      const methodCategory = methodCategories[op.method as string];
      if (methodCategory) {
        methodCategory.tags.forEach(tag => tags.add(tag));
        
        // Set primary tag based on method if not a transfer
        if (!primaryTag || primaryTag === 'Token') {
          primaryTag = methodCategory.name;
        }
      }
      
      // If it's a method that doesn't match known categories, label as DApp interaction
      if (!methodCategory && !primaryTag) {
        tags.add('dapp');
        primaryTag = 'DApp';
      }
    }
    
    // Add more operation type analyses here
  }
  
  // Check events for more context
  for (const event of tx.events) {
    if (event.name.includes('transfer_event')) {
      tags.add('transfer');
      
      // Check the transfer direction
      const { from, to } = event.data || {};
      if (from && to) {
        // If the user's address is the recipient, tag as received
        if (tx.associatedAddress && to.toLowerCase() === tx.associatedAddress.toLowerCase()) {
          tags.add('received');
          // Set primary tag if not already set
          if (!primaryTag) primaryTag = 'Received';
        }
        // If the user's address is the sender, tag as sent
        else if (tx.associatedAddress && from.toLowerCase() === tx.associatedAddress.toLowerCase()) {
          tags.add('sent');
          // Set primary tag if not already set
          if (!primaryTag) primaryTag = 'Sent';
        }
        // Default: if we can't determine the direction, just tag as transfer
        else if (!primaryTag) {
          primaryTag = 'Transfer';
        }
      } else if (!primaryTag) {
        primaryTag = 'Transfer';
      }
    } else if (event.name.includes('mint_event')) {
      tags.add('mint');
      tags.add('token-creation');
      if (!primaryTag) primaryTag = 'Mint';
    } else if (event.name.includes('burn_event')) {
      tags.add('burn');
      tags.add('token-destruction');
      if (!primaryTag) primaryTag = 'Burn';
    }
    
    // Check for dapp events
    if (event.name.includes('kap.') || 
        event.name.includes('dapp.') ||
        (!event.name.includes('token.') && !event.name.includes('system.') && !event.name.includes('contracts.token.'))) {
      tags.add('dapp');
      tags.add('interacted');
      if (!primaryTag) primaryTag = 'DApp';
    }
  }
  
  // If still no primary tag found, use a generic one
  if (!primaryTag) {
    primaryTag = 'Transaction';
  }
  
  return { 
    tags: Array.from(tags), 
    primaryTag 
  };
}

// Add interface for user-friendly transaction info
export interface UserFriendlyTransactionInfo {
  actionType: 'sent' | 'received' | 'interacted' | 'staked' | 'unstaked' | 'minted' | 'burned' | 'swapped' | 'other';
  description: string;
  amount?: string;
  tokenSymbol?: string;
  counterparty?: string;
  dappName?: string;
  isPositive: boolean; // Whether the transaction increased balance (received) or decreased it (sent)
}

/**
 * Generate a user-friendly description of a transaction based on its operations and events
 * @param tx The formatted transaction
 * @returns An object containing user-friendly information about the transaction
 */
export function generateUserFriendlyInfo(tx: any): UserFriendlyTransactionInfo {
  // Default to a generic description
  const defaultInfo: UserFriendlyTransactionInfo = {
    actionType: 'other',
    description: 'Blockchain transaction',
    isPositive: false
  };
  
  // No operations or events? Return default
  if (!tx.operations || tx.operations.length === 0) {
    return defaultInfo;
  }

  // Look for transfer events first - they're most user-relevant
  if (tx.events && tx.events.length > 0) {
    // Check for token transfers
    const transferEvents = tx.events.filter((event: any) => 
      event.name.includes('transfer_event')
    );
    
    if (transferEvents.length > 0) {
      const transfer = transferEvents[0];
      const { from, to, value } = transfer.data || {};
      
      // Skip if missing critical data
      if (!from || !to || !value) {
        return defaultInfo;
      }
      
      // Determine if user is sender or recipient
      // First check if the associatedAddress matches the 'to' field exactly
      let userIsRecipient = to === tx.associatedAddress;
      
      // If not a match and the address is non-empty, do a case-insensitive check
      // This helps with address format differences (sometimes addresses can vary in case)
      if (!userIsRecipient && tx.associatedAddress) {
        userIsRecipient = to.toLowerCase() === tx.associatedAddress.toLowerCase();
      }
      
      // For debugging
      console.log(`Transaction ${tx.id}: to=${to}, associatedAddress=${tx.associatedAddress}, userIsRecipient=${userIsRecipient}`);
      
      const counterparty = userIsRecipient ? from : to;
      
      // If this is a received transaction, add 'received' tag to the transaction
      if (userIsRecipient && !tx.tags.includes('received')) {
        tx.tags.push('received');
      }
      // If this is a sent transaction, add 'sent' tag to the transaction
      else if (!userIsRecipient && !tx.tags.includes('sent')) {
        tx.tags.push('sent');
      }
      
      return {
        actionType: userIsRecipient ? 'received' : 'sent',
        description: userIsRecipient 
          ? `Received ${formatValue(value)} ${tx.tokenSymbol}` 
          : `Sent ${formatValue(value)} ${tx.tokenSymbol}`,
        amount: formatValue(value),
        tokenSymbol: tx.tokenSymbol,
        counterparty: shortenAddress(counterparty),
        isPositive: userIsRecipient
      };
    }
    
    // Check for mint events
    const mintEvents = tx.events.filter((event: any) => 
      event.name.includes('mint_event')
    );
    
    if (mintEvents.length > 0) {
      const mint = mintEvents[0];
      const { to, value } = mint.data || {};
      
      if (to && value) {
        return {
          actionType: 'minted',
          description: `Minted ${formatValue(value)} ${tx.tokenSymbol}`,
          amount: formatValue(value),
          tokenSymbol: tx.tokenSymbol,
          counterparty: shortenAddress(to),
          isPositive: true
        };
      }
    }
    
    // Check for burn events
    const burnEvents = tx.events.filter((event: any) => 
      event.name.includes('burn_event')
    );
    
    if (burnEvents.length > 0) {
      const burn = burnEvents[0];
      const { from, value } = burn.data || {};
      
      if (from && value) {
        return {
          actionType: 'burned',
          description: `Burned ${formatValue(value)} ${tx.tokenSymbol}`,
          amount: formatValue(value),
          tokenSymbol: tx.tokenSymbol,
          counterparty: shortenAddress(from),
          isPositive: false
        };
      }
    }
  }
  
  // Check operations if we haven't identified the transaction type from events
  const mainOperation = tx.operations[0];
  
  // Handle contract calls
  if (mainOperation.type === 'contract_call' && mainOperation.method) {
    // Get dApp name if available
    let dappName = '';
    if (mainOperation.contract) {
      const knownDapps: Record<string, string> = {
        '1D6NoQ_p1p8iXt5nB7Yb7XwGTcsdZ2a4': 'FlowState Game',
        '1MAbK9xPBTqEGxhEHRHMmGGBHcnANGcnR': 'Koinos Swap',
        // Add more known dApps here
      };
      
      // Try to find a match for the contract
      for (const [dappAddress, name] of Object.entries(knownDapps)) {
        if (mainOperation.contract.includes(dappAddress)) {
          dappName = name;
          break;
        }
      }
    }
    
    // Method-specific descriptions
    if (typeof mainOperation.method === 'string') {
      // Staking operations
      if (mainOperation.method.includes('stake')) {
        return {
          actionType: 'staked',
          description: `Staked tokens`,
          dappName: dappName || undefined,
          isPositive: false
        };
      }
      
      // Unstaking operations
      if (mainOperation.method.includes('unstake')) {
        return {
          actionType: 'unstaked',
          description: `Unstaked tokens`,
          dappName: dappName || undefined,
          isPositive: true
        };
      }
      
      // Swap operations
      if (mainOperation.method.includes('swap')) {
        return {
          actionType: 'swapped',
          description: `Swapped tokens`,
          dappName: dappName || undefined,
          isPositive: false
        };
      }
    }
    
    // Generic dApp interaction
    return {
      actionType: 'interacted',
      description: dappName ? `Interacted with ${dappName}` : 'dApp interaction',
      dappName: dappName || undefined,
      isPositive: false
    };
  }
  
  // If we reach here, use a generic description based on primary tag if available
  if (tx.primaryTag) {
    return {
      actionType: 'other',
      description: tx.primaryTag.charAt(0).toUpperCase() + tx.primaryTag.slice(1).replace('-', ' '),
      isPositive: false
    };
  }
  
  return defaultInfo;
}

/**
 * Formats detailed transactions for display
 * @param transactions Array of detailed transactions
 * @returns Formatted transactions with key information extracted
 */
export function formatDetailedTransactions(transactions: DetailedTransaction[], userAddress?: string): any[] {
  return transactions.map((tx) => {
    const { call_contract, upload_contract, set_system_call, set_system_contract } = tx.trx.transaction.operations[0] || {};
    
    // Process token info from transfer events if available
    let tokenSymbol = 'KOIN';
    let totalValueTransferred = '0';
    
    if (tx.trx.receipt && tx.trx.receipt.events) {
      const transferEvents = tx.trx.receipt.events.filter(event => event.name.includes('transfer_event'));
      
      if (transferEvents.length > 0) {
        // Get the first transfer event (most relevant)
        const transferEvent = transferEvents[0];
        
        // Extract token info
        if (transferEvent.source) {
          const tokenContracts: Record<string, string> = {
            '15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL': 'KOIN',
            '1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju': 'VHP',
            // Add more token contracts as needed
          };
          
          if (tokenContracts[transferEvent.source]) {
            tokenSymbol = tokenContracts[transferEvent.source];
          }
        }
        
        // Sum up total value transferred
        let total = BigInt(0);
        
        transferEvents.forEach(event => {
          if (event.data && event.data.value) {
            try {
              total += BigInt(event.data.value);
            } catch (err) {
              console.error('Error summing transfer values:', err);
            }
          }
        });
        
        totalValueTransferred = total.toString();
      }
    }
    
    // Create a base formatted transaction with empty tags array
    const formattedTx: any = {
      id: tx.trx.transaction.id,
      payer: tx.trx.transaction.header.payer,
      operations: [],
      events: tx.trx.receipt.events || [],
      rc_used: tx.trx.receipt.rc_used,
      signatures: tx.trx.transaction.signatures,
      totalValueTransferred,
      tokenSymbol,
      tags: [] as string[],  // Explicitly type as string array
      primaryTag: undefined as string | undefined,
      associatedAddress: userAddress || tx.trx.transaction.header.payer
    };
    
    // Extract operation details
    const operations = tx.trx.transaction.operations.map(op => {
      if (op.call_contract) {
        // Decode the entry point to a human-readable method name
        const methodName = decodeEntryPoint(op.call_contract.entry_point);
        
        return {
          type: 'Contract Call',
          contract: op.call_contract.contract_id,
          method: methodName,
          args: op.call_contract.args
        };
      }
      // Handle other operation types as needed
      return { type: 'Other Operation' };
    });

    formattedTx.operations = operations;
    
    // Analyze and tag the transaction
    const { tags, primaryTag } = analyzeAndTagTransaction(formattedTx);
    formattedTx.tags = tags;
    formattedTx.primaryTag = primaryTag;
    
    // After the transaction is fully formatted and tagged
    const userFriendlyInfo = generateUserFriendlyInfo(formattedTx);
    
    // Add the user-friendly info to the transaction
    return {
      ...formattedTx,
      userFriendlyInfo
    };
  });
}

/**
 * Fetches detailed transaction history for an account
 * @param address Account address
 * @param limit Maximum number of transactions to fetch
 * @param ascending Sort order (true for ascending, false for descending)
 * @param irreversible Whether to include only irreversible transactions
 * @param sequenceNumber Optional sequence number for pagination
 * @returns Array of detailed transactions
 */
export async function getDetailedAccountHistory(
  address: string,
  limit: number = 10,
  ascending: boolean = false,
  irreversible: boolean = true,
  sequenceNumber?: string
): Promise<DetailedTransaction[]> {
  try {
    let url = `https://api.koinos.io/v1/account/${address}/history?limit=${limit}&ascending=${ascending}&irreversible=${irreversible}&decode_operations=true&decode_events=true`;
    
    // Add sequence_number parameter if provided
    if (sequenceNumber) {
      console.log('Using sequence number for pagination:', sequenceNumber);
      url += `&sequence_number=${sequenceNumber}`;
    }
    
    console.log('API Request URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data: DetailedTransaction[] = await response.json();
    console.log(`API returned ${data.length} transactions`);
    
    return data;
  } catch (error) {
    console.error('Error fetching detailed account history:', error);
    throw error;
  }
}

/**
 * Fetches transaction details by transaction ID
 * @param transactionId The ID of the transaction to fetch
 * @returns Transaction details including timestamp
 */
export async function getTransactionDetails(transactionId: string): Promise<any> {
  try {
    const url = `https://api.koinos.io/v1/transaction/${transactionId}?return_receipt=true&decode_operations=true&decode_events=true`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
}

/**
 * Fetches block information by block ID
 * @param blockId The ID of the block to fetch
 * @returns Block information including height
 */
export async function getBlockInfo(blockId: string): Promise<any> {
  try {
    const url = `https://api.koinos.io/v1/chain/blocks/${blockId}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching block info:', error);
    return null;
  }
}

/**
 * Fetches information about the head (latest) block on the blockchain
 * @returns Head block information including ID, height, and timestamp
 */
export async function getHeadBlockInfo(): Promise<any> {
  try {
    const url = `https://api.koinos.io/v1/chain/head_info`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching head block info:', error);
    return null;
  }
}

// Temporary export to help debug
export const headBlockInfo = getHeadBlockInfo;

/**
 * Fetches detailed block information by block height
 * @param height The height of the block to fetch
 * @returns Detailed block information including transactions and events
 */
export async function getBlockByHeight(height: string): Promise<any> {
  try {
    const url = `https://api.koinos.io/v1/block/${height}?return_block=true&return_receipt=true&decode_operations=true&decode_events=true`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching block by height:', error);
    return null;
  }
}

// Temporary export to help debug
export const blockByHeight = getBlockByHeight;

/**
 * Enriches transaction data with timestamp information from direct transaction API
 * @param transactions Array of formatted transactions
 * @returns Promise resolving to transactions with timestamp information
 */
export async function enrichTransactionsWithTimestamps(transactions: any[]): Promise<any[]> {
  const enrichedTransactions = await Promise.all(
    transactions.map(async (tx) => {
      try {
        const txDetails = await getTransactionDetails(tx.id);
        
        if (txDetails && txDetails.transaction && txDetails.transaction.timestamp) {
          let blockHeight = '';
          
          // Comment out block info fetching to avoid 404 errors
          /*
          // If we have containing blocks, fetch the block height
          if (txDetails.containing_blocks && txDetails.containing_blocks.length > 0) {
            const blockId = txDetails.containing_blocks[0];
            const blockInfo = await getBlockInfo(blockId);
            
            if (blockInfo && blockInfo.header && blockInfo.header.height) {
              blockHeight = blockInfo.header.height;
            }
          }
          */
          
          return {
            ...tx,
            timestamp: txDetails.transaction.timestamp,
            blockId: txDetails.containing_blocks ? txDetails.containing_blocks[0] : '',
            blockHeight: blockHeight
          };
        }
        
        return tx;
      } catch (error) {
        console.error('Error enriching transaction:', error);
        return tx;
      }
    })
  );
  
  return enrichedTransactions;
}

/**
 * Fetches the token balance for a specific account and token
 * @param address The account address to fetch the balance for
 * @param tokenSymbol The token symbol (e.g., 'koin')
 * @returns Promise resolving to the token balance as a string
 */
export async function getTokenBalance(address: string, tokenSymbol: string = 'koin'): Promise<string> {
  try {
    const url = `https://api.koinos.io/v1/account/${address}/balance/${tokenSymbol.toLowerCase()}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.value || '0';
  } catch (error) {
    console.error(`Error fetching ${tokenSymbol} balance:`, error);
    return '0';
  }
}

// Helper function to format values in a user-friendly way
function formatValue(value: string): string {
  if (!value) return '0';
  
  // Convert to number
  const num = parseFloat(value);
  
  // Format based on size
  if (num === 0) return '0';
  if (num < 0.000001) return '< 0.000001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
  return `${(num / 1000000).toFixed(2)}M`;
}

// Helper function to shorten addresses
function shortenAddress(address: string): string {
  if (!address) return '';
  if (address.length < 16) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
} 