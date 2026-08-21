/**
 * Transaction History Data Accuracy Investigation
 *
 * Compares transaction history from:
 * 1. REST API: rest.koinos.io/v1/account/{address}/history
 * 2. JSON-RPC via koilib: transaction_store.get_account_transactions
 *
 * Usage: npx tsx scripts/compare-tx-sources.ts [address]
 */

import { Provider } from 'koilib';

const REST_NODE = 'https://rest.koinos.io';
const RPC_NODE = 'https://api.koinos.io';

// Test addresses - use a known active wallet
const TEST_ADDRESSES = [
  '1NsQbH5AhQXgtSNg1ejpFqTi2hmCWz1eQS', // KoinDX
  '15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL', // KOIN contract (legacy)
  '19GYjDBVXU7keLbYvMLazsGQn3GTWHjHkK', // KOIN contract (current)
];

interface RestTransaction {
  seq_num?: string;
  trx: {
    transaction: {
      id: string;
      header: {
        payer: string;
        chain_id: string;
        rc_limit: string;
        nonce: string;
      };
      operations: any[];
    };
    receipt: {
      id: string;
      payer: string;
      events: any[];
      rc_used: string;
    };
  };
}

interface KoilibTransaction {
  id: string;
  payer: string;
  timestamp?: string;
  operations: any[];
}

async function fetchRestHistory(address: string, limit: number = 20): Promise<RestTransaction[]> {
  const url = `${REST_NODE}/v1/account/${address}/history?limit=${limit}&ascending=false&irreversible=true&decode_operations=true&decode_events=true`;

  console.log(`\n📡 REST API Request: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`REST API failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Handle different response formats
  if (Array.isArray(data)) {
    return data;
  } else if (data?.values) {
    return data.values;
  } else if (data?.transactions) {
    return data.transactions;
  }

  return [];
}

interface RpcHistoryResult {
  values?: RestTransaction[];
}

async function fetchRpcHistory(address: string, limit: number = 20): Promise<RestTransaction[]> {
  const provider = new Provider([RPC_NODE]);

  console.log(`\n🔗 JSON-RPC (account_history) Request to: ${RPC_NODE}`);

  // Use the correct method: account_history.get_account_history
  // This is the JSON-RPC equivalent of the REST /history endpoint
  const result = await provider.call('account_history.get_account_history', {
    address: address,
    ascending: false,
    limit,
    irreversible: true,
    decode_operations: true,
    decode_events: true,
  }) as RpcHistoryResult;

  const transactions = result?.values || [];
  console.log(`  - account_history.get_account_history: ${transactions.length} txs`);

  return transactions;
}

// Keep this for reference - these are alternative koilib methods
async function fetchKoilibTransactionStore(address: string, limit: number = 20): Promise<KoilibTransaction[]> {
  const provider = new Provider([RPC_NODE]);

  console.log(`\n🔗 Koilib (transaction_store) Request to: ${RPC_NODE}`);

  try {
    // Method 1: get_account_transactions (outgoing)
    const outgoingResult = await provider.call('transaction_store.get_account_transactions', {
      account: address,
      ascending: false,
      limit,
    }) as { transactions?: KoilibTransaction[] };

    // Method 2: get_account_rc_transactions (incoming/impacted)
    const incomingResult = await provider.call('transaction_store.get_account_rc_transactions', {
      account: address,
      ascending: false,
      limit,
    }) as { transactions?: KoilibTransaction[] };

    const outgoing = outgoingResult?.transactions || [];
    const incoming = incomingResult?.transactions || [];

    console.log(`  - get_account_transactions: ${outgoing.length} txs`);
    console.log(`  - get_account_rc_transactions: ${incoming.length} txs`);

    // Combine and dedupe
    const allTransactions = [...outgoing, ...incoming];
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
    console.log(`  ⚠️ transaction_store methods not available on this node`);
    return [];
  }
}

function extractTxIds(restTxs: RestTransaction[]): string[] {
  const ids = restTxs.map(tx => tx.trx?.transaction?.id || tx.trx?.receipt?.id).filter(Boolean);
  // Debug: log first few IDs
  if (ids.length > 0) {
    console.log(`  Extracted ${ids.length} IDs, first: ${ids[0]?.substring(0, 30)}...`);
  } else {
    console.log(`  Warning: No transaction IDs extracted`);
    if (restTxs.length > 0) {
      console.log(`  First TX structure: ${JSON.stringify(Object.keys(restTxs[0] || {}))}`);
      if (restTxs[0]?.trx) {
        console.log(`  trx keys: ${JSON.stringify(Object.keys(restTxs[0].trx || {}))}`);
      }
    }
  }
  return ids;
}

function compareResults(
  address: string,
  restTxs: RestTransaction[],
  rpcTxs: RestTransaction[]
) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 COMPARISON RESULTS FOR: ${address}`);
  console.log('='.repeat(80));

  const restIds = extractTxIds(restTxs);
  const rpcIds = extractTxIds(rpcTxs);

  console.log(`\n📈 Transaction Counts:`);
  console.log(`  REST API:     ${restTxs.length} transactions`);
  console.log(`  JSON-RPC:     ${rpcTxs.length} transactions`);

  // Find transactions only in REST
  const onlyInRest = restIds.filter(id => !rpcIds.includes(id));

  // Find transactions only in RPC
  const onlyInRpc = rpcIds.filter(id => !restIds.includes(id));

  // Find common transactions
  const common = restIds.filter(id => rpcIds.includes(id));

  console.log(`\n🔍 Transaction ID Comparison:`);
  console.log(`  Common:         ${common.length}`);
  console.log(`  Only in REST:   ${onlyInRest.length}`);
  console.log(`  Only in RPC:    ${onlyInRpc.length}`);

  if (onlyInRest.length > 0) {
    console.log(`\n⚠️  Transactions ONLY in REST API:`);
    onlyInRest.slice(0, 5).forEach(id => console.log(`    - ${id}`));
    if (onlyInRest.length > 5) console.log(`    ... and ${onlyInRest.length - 5} more`);
  }

  if (onlyInRpc.length > 0) {
    console.log(`\n⚠️  Transactions ONLY in JSON-RPC:`);
    onlyInRpc.slice(0, 5).forEach(id => console.log(`    - ${id}`));
    if (onlyInRpc.length > 5) console.log(`    ... and ${onlyInRpc.length - 5} more`);
  }

  // Compare data fields for common transactions
  if (common.length > 0) {
    console.log(`\n📋 Data Field Comparison (first common transaction):`);
    const commonId = common[0];
    const restTx = restTxs.find(tx => tx.trx?.transaction?.id === commonId || tx.trx?.receipt?.id === commonId);
    const rpcTx = rpcTxs.find(tx => tx.trx?.transaction?.id === commonId || tx.trx?.receipt?.id === commonId);

    if (restTx && rpcTx) {
      console.log(`  Transaction ID: ${commonId}`);

      // Compare payer
      const restPayer = restTx.trx?.transaction?.header?.payer || restTx.trx?.receipt?.payer;
      const rpcPayer = rpcTx.trx?.transaction?.header?.payer || rpcTx.trx?.receipt?.payer;
      const payerMatch = restPayer === rpcPayer;
      console.log(`  Payer: REST=${restPayer}, RPC=${rpcPayer} ${payerMatch ? '✅' : '❌'}`);

      // Compare operations count
      const restOpsCount = restTx.trx?.transaction?.operations?.length || 0;
      const rpcOpsCount = rpcTx.trx?.transaction?.operations?.length || 0;
      const opsMatch = restOpsCount === rpcOpsCount;
      console.log(`  Operations: REST=${restOpsCount}, RPC=${rpcOpsCount} ${opsMatch ? '✅' : '❌'}`);

      // Compare events count
      const restEventsCount = restTx.trx?.receipt?.events?.length || 0;
      const rpcEventsCount = rpcTx.trx?.receipt?.events?.length || 0;
      const eventsMatch = restEventsCount === rpcEventsCount;
      console.log(`  Events: REST=${restEventsCount}, RPC=${rpcEventsCount} ${eventsMatch ? '✅' : '❌'}`);

      // Compare sequence numbers
      const restSeqNum = restTx.seq_num;
      const rpcSeqNum = rpcTx.seq_num;
      const seqMatch = restSeqNum === rpcSeqNum;
      console.log(`  Seq Num: REST=${restSeqNum}, RPC=${rpcSeqNum} ${seqMatch ? '✅' : '❌'}`);
    }
  }

  // Deep compare first few transactions
  console.log(`\n📊 Deep Comparison (first 3 common transactions):`);
  let allMatch = true;

  for (let i = 0; i < Math.min(3, common.length); i++) {
    const commonId = common[i];
    const restTx = restTxs.find(tx => tx.trx?.transaction?.id === commonId || tx.trx?.receipt?.id === commonId);
    const rpcTx = rpcTxs.find(tx => tx.trx?.transaction?.id === commonId || tx.trx?.receipt?.id === commonId);

    if (restTx && rpcTx) {
      // Compare JSON stringified versions
      const restJson = JSON.stringify(restTx.trx);
      const rpcJson = JSON.stringify(rpcTx.trx);
      const match = restJson === rpcJson;

      if (!match) {
        allMatch = false;
        console.log(`  ❌ TX ${i + 1} (${commonId.substring(0, 20)}...): Data mismatch`);

        // Find specific differences
        const restEvents = restTx.trx?.receipt?.events || [];
        const rpcEvents = rpcTx.trx?.receipt?.events || [];

        if (restEvents.length !== rpcEvents.length) {
          console.log(`     Events: REST has ${restEvents.length}, RPC has ${rpcEvents.length}`);
        }

        // Compare operation args (this is where decode differences might show)
        const restOps = restTx.trx?.transaction?.operations || [];
        const rpcOps = rpcTx.trx?.transaction?.operations || [];

        if (restOps.length > 0 && rpcOps.length > 0) {
          const restArgs = JSON.stringify(restOps[0]?.call_contract?.args);
          const rpcArgs = JSON.stringify(rpcOps[0]?.call_contract?.args);
          if (restArgs !== rpcArgs) {
            console.log(`     Operation args differ:`);
            console.log(`       REST: ${restArgs?.substring(0, 100)}...`);
            console.log(`       RPC:  ${rpcArgs?.substring(0, 100)}...`);
          }
        }

        // Check event data differences
        if (restEvents.length > 0 && rpcEvents.length > 0) {
          const restEventData = JSON.stringify(restEvents[0]?.data);
          const rpcEventData = JSON.stringify(rpcEvents[0]?.data);
          if (restEventData !== rpcEventData) {
            console.log(`     Event data differs:`);
            console.log(`       REST: ${restEventData?.substring(0, 100)}...`);
            console.log(`       RPC:  ${rpcEventData?.substring(0, 100)}...`);
          }
        }
      } else {
        console.log(`  ✅ TX ${i + 1} (${commonId.substring(0, 20)}...): Perfect match`);
      }
    }
  }

  // Summary
  const accuracy = common.length > 0 ? (common.length / Math.max(restIds.length, rpcIds.length) * 100).toFixed(1) : '0';
  console.log(`\n📊 Summary:`);
  console.log(`  Match Rate: ${accuracy}%`);
  console.log(`  Data Match: ${allMatch ? '✅ All sampled transactions match perfectly' : '❌ Some data differences found'}`);

  if (onlyInRest.length === 0 && onlyInRpc.length === 0 && allMatch) {
    console.log(`  ✅ Perfect match! REST and JSON-RPC return identical data.`);
  } else {
    console.log(`  ⚠️  Discrepancies found between REST and JSON-RPC results.`);

    if (onlyInRest.length > 0) {
      console.log(`  → REST API includes ${onlyInRest.length} transaction(s) not in JSON-RPC`);
    }

    if (onlyInRpc.length > 0) {
      console.log(`  → JSON-RPC includes ${onlyInRpc.length} transaction(s) not in REST`);
    }
  }

  return {
    restCount: restTxs.length,
    rpcCount: rpcTxs.length,
    common: common.length,
    onlyInRest: onlyInRest.length,
    onlyInRpc: onlyInRpc.length,
    dataMatch: allMatch,
  };
}

async function investigateAddress(address: string, limit: number = 20) {
  console.log('\n' + '🔬'.repeat(40));
  console.log(`\nInvestigating: ${address}`);
  console.log('Limit:', limit, 'transactions');

  try {
    // Fetch from both sources
    const [restTxs, rpcTxs] = await Promise.all([
      fetchRestHistory(address, limit),
      fetchRpcHistory(address, limit),
    ]);

    // Compare REST vs JSON-RPC (account_history)
    return compareResults(address, restTxs, rpcTxs);
  } catch (error) {
    console.error(`\n❌ Error investigating ${address}:`, error);
    return null;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         KOINSCAN TRANSACTION HISTORY DATA ACCURACY INVESTIGATION          ║');
  console.log('╠════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  Comparing REST API vs Koilib JSON-RPC for transaction history            ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');

  // Get address from command line or use defaults
  const customAddress = process.argv[2];
  const addresses = customAddress ? [customAddress] : TEST_ADDRESSES;

  const results: Record<string, any> = {};

  for (const address of addresses) {
    results[address] = await investigateAddress(address, 20);
  }

  // Final summary
  console.log('\n' + '═'.repeat(80));
  console.log('FINAL SUMMARY');
  console.log('═'.repeat(80));

  for (const [address, result] of Object.entries(results)) {
    if (result) {
      const dataStatus = result.dataMatch ? '✅' : '⚠️';
      const countStatus = result.onlyInRest === 0 && result.onlyInRpc === 0 ? '✅' : '⚠️';
      console.log(`${countStatus} ${address.substring(0, 20)}...: REST=${result.restCount}, RPC=${result.rpcCount}, Common=${result.common}, DataMatch=${dataStatus}`);
    } else {
      console.log(`❌ ${address.substring(0, 20)}...: Error occurred`);
    }
  }

  console.log('\n💡 Key Insight:');
  console.log('   Both REST API (/v1/account/{address}/history) and JSON-RPC');
  console.log('   (account_history.get_account_history) should return the same data.');
  console.log('   The REST endpoint is essentially a wrapper around the JSON-RPC method.');
  console.log('   Any discrepancies might indicate caching, timing, or configuration differences.');
}

main().catch(console.error);
