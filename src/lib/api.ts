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

/**
 * Fetches detailed transaction history for an account using the direct API endpoint
 * @param address The account address to fetch history for
 * @param limit Maximum number of transactions to fetch
 * @param ascending Sort order (true for ascending, false for descending)
 * @param irreversible Whether to include only irreversible transactions
 * @returns Array of detailed transactions
 */
export async function getDetailedAccountHistory(
  address: string,
  limit: number = 10,
  ascending: boolean = false,
  irreversible: boolean = true
): Promise<DetailedTransaction[]> {
  try {
    const url = `https://api.koinos.io/v1/account/${address}/history?limit=${limit}&ascending=${ascending}&irreversible=${irreversible}&decode_operations=true&decode_events=true`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data: DetailedTransaction[] = await response.json();
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
 * Formats detailed transactions into a simplified format for display
 * @param transactions Array of detailed transactions
 * @returns Formatted transactions with key information extracted
 */
export function formatDetailedTransactions(transactions: DetailedTransaction[]): any[] {
  return transactions.map(tx => {
    // Extract token transfer events
    const transferEvents = tx.trx.receipt.events.filter(event => 
      event.name === 'token.transfer_event' || 
      event.name === 'koinos.contracts.token.transfer_event'
    );

    // Calculate total value transferred (if applicable)
    let totalValueTransferred = '0';
    let tokenSymbol = 'KOIN'; // Default to KOIN
    
    if (transferEvents.length > 0) {
      try {
        // Try to determine token symbol from contract ID
        // This is a simplified approach - in a real app, you might want to maintain a mapping of contract IDs to token symbols
        const contractId = transferEvents[0].source;
        if (contractId) {
          // Known contract IDs for common tokens
          const tokenContracts: Record<string, string> = {
            '15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL': 'KOIN', // KOIN contract
            '1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju': 'VHP',  // VHP contract
            // Add more token contracts as needed
          };
          
          tokenSymbol = tokenContracts[contractId] || 'TOKEN';
        }
        
        totalValueTransferred = transferEvents.reduce((total, event) => {
          const value = event.data?.value || '0';
          return (BigInt(total) + BigInt(value)).toString();
        }, '0');
      } catch (error) {
        console.error('Error calculating total value transferred:', error);
      }
    }

    // Extract operation details
    const operations = tx.trx.transaction.operations.map(op => {
      if (op.call_contract) {
        return {
          type: 'Contract Call',
          contract: op.call_contract.contract_id,
          method: op.call_contract.entry_point,
          args: op.call_contract.args
        };
      }
      // Handle other operation types as needed
      return { type: 'Other Operation' };
    });

    return {
      id: tx.trx.transaction.id,
      payer: tx.trx.transaction.header.payer,
      timestamp: '', // Will be populated separately
      blockHeight: '', // Will be populated separately
      operations: operations,
      events: transferEvents,
      rc_used: tx.trx.receipt.rc_used,
      signatures: tx.trx.transaction.signatures,
      totalValueTransferred,
      tokenSymbol
    };
  });
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