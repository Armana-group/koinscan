import assert from 'node:assert/strict';

import * as apiModule from '../src/lib/api';

interface DetailedTransaction {
  trx: {
    transaction: {
      id: string;
    };
    receipt: {
      events: Array<{
        name: string;
        data: unknown;
        impacted: string[];
      }>;
    };
  };
}

interface ApiExports {
  getDetailedAccountHistory: (
    restNode: string,
    address: string,
    limit?: number,
    ascending?: boolean,
    irreversible?: boolean,
    sequenceNumber?: string
  ) => Promise<DetailedTransaction[]>;
  formatDetailedTransactions: (
    transactions: DetailedTransaction[],
    userAddress?: string
  ) => Array<{
    id: string;
    actions: Array<{
      tokenTransfers?: Array<{
        token: { symbol: string };
        formattedAmount: string;
        isPositive: boolean;
      }>;
    }>;
  }>;
}

const ADDRESS = '14AHKzFQ9xHHgecVAwrBsBgumyFoGsXhQw';
const EXPECTED_TX = '0x122048be90d8f0a412c015282ea3c0a22719ad6881ef8f54a4443ba7b66ab09a3079';

const moduleWithDefault = apiModule as typeof apiModule & { default?: ApiExports };
const api = moduleWithDefault.default ?? (apiModule as unknown as ApiExports);

async function main() {
  const history = await api.getDetailedAccountHistory(
    'https://rest.koinos.io',
    ADDRESS,
    100,
    false,
    true
  );

  assert.ok(history.length > 0, 'history fallback should return transactions when REST returns an error object');
  assert.ok(
    history.some((transaction) => transaction.trx.transaction.id === EXPECTED_TX),
    `fallback history should include known transaction ${EXPECTED_TX}`
  );

  const formatted = api.formatDetailedTransactions(history, ADDRESS);
  const expectedTransaction = formatted.find((transaction) => transaction.id === EXPECTED_TX);
  const firstTransfer = expectedTransaction?.actions.flatMap((action) => action.tokenTransfers || [])[0];

  assert.ok(firstTransfer, 'formatted fallback history should expose the known transfer action');
  assert.equal(firstTransfer.token.symbol, 'KOIN');
  assert.equal(firstTransfer.formattedAmount, '0.01');
  assert.equal(firstTransfer.isPositive, false);

  console.log('account history fallback regression passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
