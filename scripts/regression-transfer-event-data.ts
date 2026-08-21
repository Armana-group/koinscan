import assert from 'node:assert/strict';

import * as apiModule from '../src/lib/api';

interface TransferEventFixture {
  sequence: number;
  source: string;
  name: string;
  data: unknown;
  impacted: string[];
}

interface DetailedTransactionFixture {
  trx: {
    transaction: {
      id: string;
      header: {
        payer: string;
        chain_id: string;
        rc_limit: string;
        nonce: string;
        operation_merkle_root: string;
      };
      operations: unknown[];
      signatures: string[];
    };
    receipt: {
      id: string;
      payer: string;
      max_payer_rc: string;
      rc_limit: string;
      rc_used: string;
      disk_storage_used: string;
      network_bandwidth_used: string;
      compute_bandwidth_used: string;
      events: TransferEventFixture[];
    };
  };
}

interface FormattedTransfer {
  token: {
    symbol: string;
  };
  formattedAmount: string;
  isPositive: boolean;
}

interface FormattedAction {
  tokenTransfers?: FormattedTransfer[];
}

interface FormattedTransaction {
  id: string;
  actions: FormattedAction[];
}

interface ApiExports {
  formatDetailedTransactions: (
    transactions: DetailedTransactionFixture[],
    userAddress?: string
  ) => FormattedTransaction[];
}

const moduleWithDefault = apiModule as typeof apiModule & { default?: ApiExports };
const api = moduleWithDefault.default ?? (apiModule as unknown as ApiExports);
const { formatDetailedTransactions } = api;

const USER_ADDRESS = '1ABk4GREUhSh74r7HfZ3tHvSCjVYMrR6jC';
const KOIN_CONTRACT = '19GYjDBVXU7keLbYvMLazsGQn3GTWHjHkK';
const VHP_CONTRACT = '12Y5vW6gk8GceH53YfRkRre2Rrcsgw7Naq';
const SWAP_TX = '0x1220d92c2166306d3a8e476cfef248a1d4a679c3aac322475c47017dabb28fce65be';
const RECEIVE_TX = '0x1220ef58653e687a4e5acc1b6aa34749a05e2ebda77a9488e20b5d4911ad0d58f358';

function detailedTx(id: string, events: TransferEventFixture[]): DetailedTransactionFixture {
  return {
    trx: {
      transaction: {
        id,
        header: {
          payer: USER_ADDRESS,
          chain_id: 'test',
          rc_limit: '0',
          nonce: '0',
          operation_merkle_root: '',
        },
        operations: [],
        signatures: [],
      },
      receipt: {
        id,
        payer: USER_ADDRESS,
        max_payer_rc: '0',
        rc_limit: '0',
        rc_used: '0',
        disk_storage_used: '0',
        network_bandwidth_used: '0',
        compute_bandwidth_used: '0',
        events,
      },
    },
  };
}

function transferEvent(source: string, data: unknown): TransferEventFixture {
  return {
    sequence: 0,
    source,
    name: 'koinos.contracts.token.transfer_event',
    data,
    impacted: [],
  };
}

const formatted = formatDetailedTransactions(
  [
    detailedTx(SWAP_TX, [
      transferEvent(
        KOIN_CONTRACT,
        'ChkAZME7t2azCrlKfVwKUYqWAEc7vaGT_qtTEhkA738KGC8ExTw9frtA5O8zPz4Bku_42hKyGICt4gQ='
      ),
      transferEvent(
        VHP_CONTRACT,
        'ChkA738KGC8ExTw9frtA5O8zPz4Bku_42hKyEhkAZME7t2azCrlKfVwKUYqWAEc7vaGT_qtTGNSK4gQ='
      ),
    ]),
    detailedTx(RECEIVE_TX, [
      transferEvent(
        KOIN_CONTRACT,
        'ChkAE3aTG9-p1brViNeoB0uMQY7YFZcdR6PvEhkAZME7t2azCrlKfVwKUYqWAEc7vaGT_qtTGIDh6xc='
      ),
    ]),
    detailedTx('decoded-object-control', [
      transferEvent(KOIN_CONTRACT, {
        from: USER_ADDRESS,
        to: '17wu3E1ZsFUuVaPPLqxHgF7DJgqSHtjUyh',
        value: '25000000',
      }),
    ]),
  ],
  USER_ADDRESS
);

const swap = formatted.find((tx) => tx.id === SWAP_TX);
assert.ok(swap, 'swap transaction should be formatted');
assert.equal(swap.actions.length, 2, 'swap should expose both encoded transfer events');
assert.deepEqual(
  swap.actions.map((action) => {
    const transfer = action.tokenTransfers?.[0];
    assert.ok(transfer, 'swap action should include a token transfer');

    return {
      symbol: transfer.token.symbol,
      amount: transfer.formattedAmount,
      positive: transfer.isPositive,
    };
  }),
  [
    { symbol: 'KOIN', amount: '0.1', positive: false },
    { symbol: 'VHP', amount: '0.09995604', positive: true },
  ]
);

const receive = formatted.find((tx) => tx.id === RECEIVE_TX);
assert.ok(receive, 'receive transaction should be formatted');
assert.equal(receive.actions.length, 1, 'receive should expose the encoded transfer event');
const receiveTransfer = receive.actions[0]?.tokenTransfers?.[0];
assert.ok(receiveTransfer, 'receive action should include a token transfer');
assert.equal(receiveTransfer.token.symbol, 'KOIN');
assert.equal(receiveTransfer.formattedAmount, '0.5');
assert.equal(receiveTransfer.isPositive, true);

const decoded = formatted.find((tx) => tx.id === 'decoded-object-control');
assert.ok(decoded, 'decoded object control should be formatted');
assert.equal(decoded.actions.length, 1, 'decoded object transfer should still parse');
const decodedTransfer = decoded.actions[0]?.tokenTransfers?.[0];
assert.ok(decodedTransfer, 'decoded action should include a token transfer');
assert.equal(decodedTransfer.formattedAmount, '0.25');
assert.equal(decodedTransfer.isPositive, false);

console.log('transfer event data regression passed');
