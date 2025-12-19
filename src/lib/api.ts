import { Provider, ProviderInterface, Transaction, utils } from 'koilib';
import { getTokenByAddress, formatTokenAmount, getTokenBySymbol } from '@/lib/tokens';

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

export interface TransactionAction {
  type: 'token_transfer' | 'token_mint' | 'token_burn' | 'contract_interaction' | 'system_call' | 'contract_upload' | 'governance' | 'other';
  description: string;
  dappName?: string;
  tokenTransfers?: Array<{
    token: {
      symbol: string;
      address: string;
      decimals: string | number;
      name?: string;
      logoURI?: string;
    };
    amount: string;
    formattedAmount: string;
    from: string;
    to: string;
    isPositive?: boolean;
  }>;
  metadata?: Record<string, any>;
}

export async function getAddressHistory(
  provider: ProviderInterface,
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

/**
 * Process transaction and extract meaningful actions
 * @param tx The transaction to process
 * @param userAddress Optional user address to determine direction of transfers
 * @returns Array of transaction actions
 */
export function extractTransactionActions(tx: any, userAddress?: string): TransactionAction[] {
  const actions: TransactionAction[] = [];
  const tokenTransfers = new Map<string, any[]>();

  // Debug: log event structure
  console.log('[extractTransactionActions] tx.events count:', tx.events?.length || 0);
  console.log('[extractTransactionActions] userAddress:', userAddress);
  if (tx.events?.length > 0) {
    console.log('[extractTransactionActions] First event:', JSON.stringify(tx.events[0], null, 2));
  }

  // First pass: collect all token transfers grouped by token
  for (const event of tx.events || []) {
    const eventName = event.name?.toLowerCase() || '';
    const eventData = event.data || {};
    
    // Process transfer events - check various formats (koinos.contracts.token.transfer_event, transfer_event, etc.)
    if (eventName.includes('transfer')) {
      const { from, to, value } = eventData;
      console.log('[extractTransactionActions] Found transfer event:', eventName, 'from:', from, 'to:', to, 'value:', value);

      if (from && to && value) {
        // Identify the token - get full info from KoinDX list
        const tokenAddress = event.source;
        const tokenInfo = getTokenInfoSync(tokenAddress);
        const tokenSymbol = tokenInfo?.symbol || getTokenSymbolSync(tokenAddress);
        const decimals = tokenInfo?.decimals || 8;
        const logoURI = tokenInfo?.logoURI || '';
        const tokenName = tokenInfo?.name || tokenSymbol;

        // Create or update token transfer entry
        if (!tokenTransfers.has(tokenAddress)) {
          tokenTransfers.set(tokenAddress, []);
        }

        tokenTransfers.get(tokenAddress)?.push({
          from,
          to,
          value,
          decimals,
          symbol: tokenSymbol,
          address: tokenAddress,
          logoURI,
          name: tokenName
        });
      }
    }
  }
  
  // Second pass: create token transfer actions
  if (tokenTransfers.size > 0) {
    // Use Array.from to convert the Map entries to an array for iteration
    Array.from(tokenTransfers.entries()).forEach(([tokenAddress, transfers]) => {
      transfers.forEach(transfer => {
        const { from, to, value, decimals, symbol, logoURI, name } = transfer;
        const isOutgoing = userAddress && from.toLowerCase() === userAddress.toLowerCase();
        const isIncoming = userAddress && to.toLowerCase() === userAddress.toLowerCase();

        // Only add relevant transfers if user address is provided
        if (userAddress && !isOutgoing && !isIncoming) {
          return;
        }

        const formattedAmount = formatTokenAmount(value, typeof decimals === 'number' ? decimals : parseInt(decimals.toString()));

        actions.push({
          type: 'token_transfer',
          description: isIncoming
            ? `Received ${formattedAmount} ${symbol}`
            : `Sent ${formattedAmount} ${symbol}`,
          tokenTransfers: [{
            token: {
              symbol,
              address: tokenAddress,
              decimals,
              name,
              logoURI
            },
            amount: value,
            formattedAmount,
            from,
            to,
            isPositive: isIncoming || false
          }]
        });
      });
    });
  }
  
  // Handle mint events
  const mintEvents = tx.events?.filter((event: any) =>
    event.name?.toLowerCase().includes('mint_event') || event.name?.toLowerCase().includes('mint.')
  ) || [];

  for (const mint of mintEvents) {
    const eventData = mint.data || {};
    const { to, value } = eventData;

    if (to && value) {
      // Identify the token - get full info from KoinDX list
      const tokenAddress = mint.source;
      const tokenInfo = getTokenInfoSync(tokenAddress);
      const tokenSymbol = tokenInfo?.symbol || getTokenSymbolSync(tokenAddress);
      const decimals = tokenInfo?.decimals || 8;
      const logoURI = tokenInfo?.logoURI || '';
      const tokenName = tokenInfo?.name || tokenSymbol;

      const formattedAmount = formatTokenAmount(value, decimals);

      actions.push({
        type: 'token_mint',
        description: `Minted ${formattedAmount} ${tokenSymbol}`,
        tokenTransfers: [{
          token: {
            symbol: tokenSymbol,
            address: tokenAddress,
            decimals,
            name: tokenName,
            logoURI
          },
          amount: value,
          formattedAmount,
          from: '0x0000000000000000000000000000000000000000',
          to,
          isPositive: true
        }]
      });
    }
  }

  // Handle burn events
  const burnEvents = tx.events?.filter((event: any) =>
    event.name?.toLowerCase().includes('burn_event') || event.name?.toLowerCase().includes('burn.')
  ) || [];

  for (const burn of burnEvents) {
    const eventData = burn.data || {};
    const { from, value } = eventData;

    if (from && value) {
      // Identify the token - get full info from KoinDX list
      const tokenAddress = burn.source;
      const tokenInfo = getTokenInfoSync(tokenAddress);
      const tokenSymbol = tokenInfo?.symbol || getTokenSymbolSync(tokenAddress);
      const decimals = tokenInfo?.decimals || 8;
      const logoURI = tokenInfo?.logoURI || '';
      const tokenName = tokenInfo?.name || tokenSymbol;

      const formattedAmount = formatTokenAmount(value, decimals);

      actions.push({
        type: 'token_burn',
        description: `Burned ${formattedAmount} ${tokenSymbol}`,
        tokenTransfers: [{
          token: {
            symbol: tokenSymbol,
            address: tokenAddress,
            decimals,
            name: tokenName,
            logoURI
          },
          amount: value,
          formattedAmount,
          from,
          to: '0x0000000000000000000000000000000000000000',
          isPositive: false
        }]
      });
    }
  }
  
  // Handle contract uploads
  if (tx.operations?.some((op: any) => op.type === 'Upload Contract')) {
    actions.push({
      type: 'contract_upload',
      description: 'Contract Uploaded'
    });
  }
  
  // Handle governance actions
  const governanceEvents = tx.events?.filter((event: any) => 
    event.name?.toLowerCase().includes('governance.') || 
    event.name?.toLowerCase().includes('vote.') || 
    event.name?.toLowerCase().includes('proposal.')
  ) || [];
  
  if (governanceEvents.length > 0) {
    actions.push({
      type: 'governance',
      description: 'Governance Action',
      metadata: {
        events: governanceEvents
      }
    });
  }
  
  // Handle specific dApp interactions by checking for known contracts
  const dappInteractions = tx.operations?.filter((op: any) => 
    op.type === 'Contract Call' && op.contract
  ) || [];
  
  for (const dappOp of dappInteractions) {
    // Check for known dApps
    const knownDapps: Record<string, string> = {
      '1D6NoQ_p1p8iXt5nB7Yb7XwGTcsdZ2a4': 'FlowState Game',
      '1MAbK9xPBTqEGxhEHRHMmGGBHcnANGcnR': 'Koinos Swap',
      // Add more known dApps here
    };
    
    let dappName = '';
    let methodName = dappOp.method?.toString() || 'Unknown Method';
    
    // Try to find a match for the contract
    for (const [dappAddress, name] of Object.entries(knownDapps)) {
      if (dappOp.contract?.includes(dappAddress)) {
        dappName = name;
        break;
      }
    }
    
    if (dappName) {
      actions.push({
        type: 'contract_interaction',
        description: `${dappName}: ${methodName}`,
        dappName,
        metadata: {
          contract: dappOp.contract,
          method: methodName,
          args: dappOp.args
        }
      });
    }
  }
  
  // If no actions were identified, add a generic one
  if (actions.length === 0) {
    console.log('[extractTransactionActions] No actions found, adding generic');
    actions.push({
      type: 'other',
      description: 'Transaction'
    });
  } else {
    console.log('[extractTransactionActions] Actions found:', actions.length, actions.map(a => a.type));
  }

  return actions;
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

    // Extract actions using the new approach
    const actions = extractTransactionActions(tx);

    return {
      ...tx,
      formattedOperations,
      actions
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
          ? `Received ${formatTokenAmount(value, parseInt(tx.tokenDecimals))} ${tx.tokenSymbol}` 
          : `Sent ${formatTokenAmount(value, parseInt(tx.tokenDecimals))} ${tx.tokenSymbol}`,
        amount: formatTokenAmount(value, parseInt(tx.tokenDecimals)),
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
          description: `Minted ${formatTokenAmount(value, parseInt(tx.tokenDecimals))} ${tx.tokenSymbol}`,
          amount: formatTokenAmount(value, parseInt(tx.tokenDecimals)),
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
          description: `Burned ${formatTokenAmount(value, parseInt(tx.tokenDecimals))} ${tx.tokenSymbol}`,
          amount: formatTokenAmount(value, parseInt(tx.tokenDecimals)),
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
  // Guard against non-array input
  if (!Array.isArray(transactions)) {
    console.warn('formatDetailedTransactions received non-array input:', transactions);
    return [];
  }
  return transactions.map((tx) => {
    const { call_contract, upload_contract, set_system_call, set_system_contract } = tx.trx.transaction.operations[0] || {};
    
    // Process token info from transfer events if available
    let tokenSymbol = 'KOIN';
    let totalValueTransferred = '0';
    
    // Track transfers for multiple tokens
    const tokenTransfers: Record<string, string> = {};
    
    if (tx.trx.receipt && tx.trx.receipt.events) {
      const transferEvents = tx.trx.receipt.events.filter(event => event.name.includes('transfer_event'));
      
      // Process each transfer event
      if (transferEvents.length > 0) {
        transferEvents.forEach(event => {
          if (event.source && event.data && event.data.value) {
            try {
              // Identify the token
              let eventTokenSymbol = 'Unknown';
              eventTokenSymbol = getTokenSymbolSync(event.source);
              
              // Add to the token's total
              const value = BigInt(event.data.value);
              if (tokenTransfers[eventTokenSymbol]) {
                // Convert existing value to BigInt, add the new value, and store back as string
                const currentTotal = BigInt(tokenTransfers[eventTokenSymbol]);
                tokenTransfers[eventTokenSymbol] = (currentTotal + value).toString();
              } else {
                tokenTransfers[eventTokenSymbol] = value.toString();
              }
              
              // For backward compatibility, keep track of the first token for single-token display
              if (transferEvents.indexOf(event) === 0) {
                tokenSymbol = eventTokenSymbol;
                totalValueTransferred = value.toString();
              }
            } catch (err) {
              console.error('Error processing transfer event:', err);
            }
          }
        });
      }
      
      // Also check for mint events
      const mintEvents = tx.trx.receipt.events.filter(event => event.name.includes('mint_event'));
      if (mintEvents.length > 0) {
        mintEvents.forEach(event => {
          if (event.source && event.data && event.data.value) {
            try {
              // Identify the token
              let eventTokenSymbol = 'Unknown';
              eventTokenSymbol = getTokenSymbolSync(event.source);
              
              // Add to the token's total
              const value = BigInt(event.data.value);
              if (tokenTransfers[eventTokenSymbol]) {
                // Convert existing value to BigInt, add the new value, and store back as string
                const currentTotal = BigInt(tokenTransfers[eventTokenSymbol]);
                tokenTransfers[eventTokenSymbol] = (currentTotal + value).toString();
              } else {
                tokenTransfers[eventTokenSymbol] = value.toString();
              }
              
              // If no transfer events, use the first mint event for display
              if (transferEvents.length === 0 && mintEvents.indexOf(event) === 0) {
                tokenSymbol = eventTokenSymbol;
                totalValueTransferred = value.toString();
              }
            } catch (err) {
              console.error('Error processing mint event:', err);
            }
          }
        });
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
      tokenTransfers, // Add the multi-token transfer information
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

    // Extract actions for the new minimal display
    const actions = extractTransactionActions(formattedTx, userAddress);
    formattedTx.actions = actions;

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
  restNode: string,
  address: string,
  limit: number = 10,
  ascending: boolean = false,
  irreversible: boolean = true,
  sequenceNumber?: string
): Promise<DetailedTransaction[]> {
  try {
    let url = `${restNode}/v1/account/${address}/history?limit=${limit}&ascending=${ascending}&irreversible=${irreversible}&decode_operations=true&decode_events=true`;
    
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
    
    const data = await response.json();

    // Handle different response formats - API might return array directly or wrapped in an object
    let transactions: DetailedTransaction[];
    if (Array.isArray(data)) {
      transactions = data;
    } else if (data && Array.isArray(data.values)) {
      transactions = data.values;
    } else if (data && Array.isArray(data.transactions)) {
      transactions = data.transactions;
    } else {
      console.warn('Unexpected API response format:', data);
      transactions = [];
    }

    console.log(`API returned ${transactions.length} transactions`);

    return transactions;
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
export async function getTransactionDetails(restNode: string, transactionId: string): Promise<any> {
  try {
    const url = `${restNode}/v1/transaction/${transactionId}?return_receipt=true&decode_operations=true&decode_events=true`;
    
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
export async function getBlockInfo(restNode: string, blockId: string): Promise<any> {
  try {
    const url = `${restNode}/v1/chain/blocks/${blockId}`;
    
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
export async function getHeadBlockInfo(restNode: string): Promise<any> {
  try {
    const url = `${restNode}/v1/chain/head_info`;
    
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
export async function getBlockByHeight(restNode: string, height: string): Promise<any> {
  try {
    const url = `${restNode}/v1/block/${height}?return_block=true&return_receipt=true&decode_operations=true&decode_events=true`;
    
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
export async function enrichTransactionsWithTimestamps(restNode: string, transactions: any[]): Promise<any[]> {
  const enrichedTransactions = await Promise.all(
    transactions.map(async (tx) => {
      try {
        const txDetails = await getTransactionDetails(restNode, tx.id);
        
        if (txDetails && txDetails.transaction && txDetails.transaction.timestamp) {
          let blockHeight = '';
          
          // Comment out block info fetching to avoid 404 errors
          /*
          // If we have containing blocks, fetch the block height
          if (txDetails.containing_blocks && txDetails.containing_blocks.length > 0) {
            const blockId = txDetails.containing_blocks[0];
            const blockInfo = await getBlockInfo(restNode, blockId);
            
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

// Contract address to REST API token name mapping
// The REST API uses short names like 'koin', 'vhp' instead of full addresses
const CONTRACT_TO_API_NAME: Record<string, string> = {
  '15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL': 'koin',
  '1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju': 'vhp',
};

/**
 * Fetches the token balance for a specific account and token
 * @param address The account address to fetch the balance for
 * @param tokenContract The token contract address or token name (koin, vhp, etc.)
 * @returns Promise resolving to the token balance as a string (in whole units, not satoshis)
 */
export async function getTokenBalance(restNode: string, address: string, tokenContract: string): Promise<string> {
  try {
    // The REST API expects short names like 'koin', 'vhp' - not full contract addresses
    // If given a full address, try to convert it to the API name
    let apiTokenName = tokenContract.toLowerCase();
    if (CONTRACT_TO_API_NAME[tokenContract]) {
      apiTokenName = CONTRACT_TO_API_NAME[tokenContract];
    }
    const url = `${restNode}/v1/account/${address}/balance/${apiTokenName}`;
    
    const response = await fetch(url);

    // 400/404 are expected when account has no balance for a token
    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        return '0';
      }
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.value || '0';
  } catch (error) {
    // Only log unexpected errors
    if (error instanceof Error && !error.message.includes('400') && !error.message.includes('404')) {
      console.error(`Error fetching token balance:`, error);
    }
    return '0';
  }
}

/**
 * Helper function to shorten addresses
 */
export function shortenAddress(address: string): string {
  if (!address) return '';
  if (address.length < 16) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Token cache for dynamically loaded tokens - stores full token info
interface CachedToken {
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  address: string;
}

let tokenCache: Record<string, CachedToken> = {};
let tokenCacheInitialized = false;

// Map short token names to full contract addresses
const SHORT_NAME_TO_ADDRESS: Record<string, string> = {
  'koin': '15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL',
  'vhp': '1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju',
};

// Initialize token cache from the KoinDX token list
async function initializeTokenCache() {
  if (tokenCacheInitialized) return;

  try {
    const response = await fetch('https://raw.githubusercontent.com/koindx/token-list/main/src/tokens/mainnet.json');
    if (response.ok) {
      const data = await response.json();
      if (data?.tokens && Array.isArray(data.tokens)) {
        data.tokens.forEach((token: any) => {
          if (token.address && token.symbol) {
            const tokenInfo: CachedToken = {
              symbol: token.symbol,
              name: token.name || token.symbol,
              decimals: parseInt(token.decimals) || 8,
              logoURI: token.logoURI || '',
              address: token.address
            };

            // Add by the address in the token list
            tokenCache[token.address] = tokenInfo;

            // Also add by full contract address if this is a short name (like 'koin', 'vhp')
            const fullAddress = SHORT_NAME_TO_ADDRESS[token.address.toLowerCase()];
            if (fullAddress) {
              tokenCache[fullAddress] = { ...tokenInfo, address: fullAddress };
            }
          }
        });
        tokenCacheInitialized = true;
        console.log('[TokenCache] Loaded', Object.keys(tokenCache).length, 'tokens from KoinDX');
      }
    }
  } catch (error) {
    console.warn('[TokenCache] Error loading token list:', error);
  }
}

// Initialize cache on module load
initializeTokenCache();

// Get full token info by address
export function getTokenInfoSync(address: string): CachedToken | null {
  // Check cached tokens first
  if (tokenCache[address]) {
    return tokenCache[address];
  }

  // Fallback for native tokens with special addresses
  // Koinos uses multiple addresses for the same token in different contexts
  const nativeTokens: Record<string, CachedToken> = {
    // Short names used in KoinDX token list
    'koin': {
      symbol: 'KOIN',
      name: 'Koin',
      decimals: 8,
      logoURI: 'https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/koin.png',
      address: 'koin'
    },
    'vhp': {
      symbol: 'VHP',
      name: 'Virtual Hash Power',
      decimals: 8,
      logoURI: 'https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/vhp.png',
      address: 'vhp'
    },
    // KOIN contract addresses (used in transfer events)
    '15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL': {
      symbol: 'KOIN',
      name: 'Koin',
      decimals: 8,
      logoURI: 'https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/koin.png',
      address: '15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL'
    },
    // Alternative KOIN contract address (also returns KOIN symbol)
    '19GYjDBVXU7keLbYvMLazsGQn3GTWHjHkK': {
      symbol: 'KOIN',
      name: 'Koin',
      decimals: 8,
      logoURI: 'https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/koin.png',
      address: '19GYjDBVXU7keLbYvMLazsGQn3GTWHjHkK'
    },
    // VHP contract addresses
    '1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju': {
      symbol: 'VHP',
      name: 'Virtual Hash Power',
      decimals: 8,
      logoURI: 'https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/vhp.png',
      address: '1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju'
    },
    // Alternative VHP contract address
    '18tWNU7E4yuQzz7hMVpceb9ixmaWLVyQsr': {
      symbol: 'VHP',
      name: 'Virtual Hash Power',
      decimals: 8,
      logoURI: 'https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/vhp.png',
      address: '18tWNU7E4yuQzz7hMVpceb9ixmaWLVyQsr'
    }
  };

  if (nativeTokens[address]) {
    return nativeTokens[address];
  }

  return null;
}

// Synchronous token symbol lookup for use in non-async contexts
function getTokenSymbolSync(address: string): string {
  // Try the full token info lookup first (includes KoinDX cache)
  const tokenInfo = getTokenInfoSync(address);
  if (tokenInfo) {
    return tokenInfo.symbol;
  }

  // Fallback hardcoded list for tokens not in KoinDX list
  const fallbackTokens: Record<string, string> = {
    '18tWNU7E4yuQzz7hMVpceb9ixmaWLVyQsr': 'VHP',
    '18tWNU7EdyUrzr7NMVyqa9YImzaKLgz2r7MVdpqR9LepWL': 'VHP',
  };

  if (fallbackTokens[address]) {
    return fallbackTokens[address];
  }

  // Log unknown addresses for debugging
  console.log('[getTokenSymbolSync] Unknown token address:', address);
  return 'Unknown';
} 