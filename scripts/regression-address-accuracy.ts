import assert from "node:assert/strict";
import {
  loadWalletBalances,
  type TokenBalanceReader,
} from "../src/lib/wallet-balances";
import { getTotalTransactionCount } from "../src/lib/account-history";
import type { KoinosToken } from "../src/lib/tokens";
import { getHeadBlockInfo, getTransactionDetails } from "../src/lib/api";
import { getKoinPrice } from "../src/lib/price";

const token = (
  symbol: string,
  address: string,
  decimals = "8",
): KoinosToken => ({
  name: symbol,
  symbol,
  description: `${symbol} regression fixture`,
  decimals,
  logoURI: "",
  address,
  allowance: false,
});

const suppliedWalletTokens = [
  token("KOIN", "koin"),
  token("VHP", "vhp"),
  token("Snake", "1MKWW9dJXVUcJU9PHF1zDnzRTFQJ6q4NKy"),
  token("Kat", "1HpqHhCQPqeJf15MwAGF6RmhJ9aet8Hd5k"),
  token("KAN", "1LeWGhDVD8g5rGCL4aDegEf9fKyTL1KhsS"),
  token("KOINDX", "1DdERbxQte8XCwLQT8KVDyq1NJo5EGhpdg"),
  token("vUSDC", "1N8iYrYEJdCVK1rhbqv3qZUzHcpoeKmFnj"),
  token("vUSDT", "12VoHz41a4HtfiyhTWbg9RXqGMRbYk6pXh"),
  token("ZERO", "zero-contract"),
  token("BROKEN", "broken-contract"),
];

const rawBalancesByContract = new Map<string, string>([
  ["19GYjDBVXU7keLbYvMLazsGQn3GTWHjHkK", "50000000"],
  ["12Y5vW6gk8GceH53YfRkRre2Rrcsgw7Naq", "100525220"],
  ["1MKWW9dJXVUcJU9PHF1zDnzRTFQJ6q4NKy", "6942000000000"],
  ["1HpqHhCQPqeJf15MwAGF6RmhJ9aet8Hd5k", "45000000000"],
  ["1LeWGhDVD8g5rGCL4aDegEf9fKyTL1KhsS", "3987600141"],
  ["1DdERbxQte8XCwLQT8KVDyq1NJo5EGhpdg", "2000000000"],
  ["1N8iYrYEJdCVK1rhbqv3qZUzHcpoeKmFnj", "1059764"],
  ["12VoHz41a4HtfiyhTWbg9RXqGMRbYk6pXh", "387241"],
  ["zero-contract", "0"],
]);

const readBalance: TokenBalanceReader = async (contractAddress) => {
  const balance = rawBalancesByContract.get(contractAddress);
  if (balance === undefined) {
    throw new Error(`balance unavailable for ${contractAddress}`);
  }
  return balance;
};

async function main() {
  const walletResult = await loadWalletBalances(
    suppliedWalletTokens,
    "1Lx3imsZ9u98Qb6r2mJUse3twSBRdUBrjU",
    readBalance,
  );

  assert.deepEqual(
    walletResult.balances.map(({ token: balanceToken, formattedBalance }) => [
      balanceToken.symbol,
      formattedBalance,
    ]),
    [
      ["Snake", "69.42K"],
      ["Kat", "450.0000"],
      ["KAN", "39.8760"],
      ["KOINDX", "20.0000"],
      ["VHP", "1.0053"],
      ["KOIN", "0.500000"],
      ["vUSDC", "0.010598"],
      ["vUSDT", "0.003872"],
    ],
    "the supplied wallet exposes all eight known non-zero balances, including current KOIN and VHP",
  );

  assert.deepEqual(
    walletResult.failures.map(({ token: failedToken }) => failedToken.symbol),
    ["BROKEN"],
    "failed reads are reported while verified zero balances are omitted without an error",
  );

  let activeBalanceReads = 0;
  let maximumConcurrentBalanceReads = 0;
  const concurrencyTokens = Array.from({ length: 12 }, (_, index) =>
    token(`ZERO-${index}`, `zero-contract-${index}`),
  );

  await loadWalletBalances(
    concurrencyTokens,
    "1Lx3imsZ9u98Qb6r2mJUse3twSBRdUBrjU",
    async () => {
      activeBalanceReads += 1;
      maximumConcurrentBalanceReads = Math.max(
        maximumConcurrentBalanceReads,
        activeBalanceReads,
      );
      await Promise.resolve();
      activeBalanceReads -= 1;
      return "0";
    },
  );

  assert.ok(
    maximumConcurrentBalanceReads <= 2,
    `balance loading exceeded two concurrent reads: ${maximumConcurrentBalanceReads}`,
  );

  assert.equal(
    getTotalTransactionCount("15"),
    16,
    "sequence 15 represents 16 zero-based records",
  );
  assert.equal(
    getTotalTransactionCount("0"),
    1,
    "sequence zero represents the first record",
  );
  assert.equal(
    getTotalTransactionCount(undefined),
    null,
    "missing sequence metadata has no inferred count",
  );
  assert.equal(
    getTotalTransactionCount("15oops"),
    null,
    "malformed sequence metadata has no inferred count",
  );

  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const consoleErrors: unknown[][] = [];

  try {
    globalThis.fetch = async () => new Response("{}", { status: 429 });
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args);
    };

    const throttledDetails = await getTransactionDetails(
      "https://rest.koinos.io",
      `0x${"a".repeat(64)}`,
    );

    assert.equal(throttledDetails, null, "a throttled optional detail request returns no enrichment");
    assert.deepEqual(consoleErrors, [], "a 429 does not emit a console error or trigger the dev overlay");
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }

  let priceRequestUrl = "";
  try {
    globalThis.fetch = async (input) => {
      priceRequestUrl = String(input);
      return new Response(
        JSON.stringify({ usd: 0.01, change: 0, timestamp: 0, source: "regression" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    assert.equal(await getKoinPrice(), 0.01, "the same-origin price response is returned");
    assert.equal(priceRequestUrl, "/api/koin-price", "Safari requests price data through the app origin");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const headBlockConsoleErrors: unknown[][] = [];
  try {
    globalThis.fetch = async () => new Response("{}", { status: 400 });
    console.error = (...args: unknown[]) => {
      headBlockConsoleErrors.push(args);
    };

    assert.equal(await getHeadBlockInfo("https://rest.koinos.io"), null);
    assert.deepEqual(
      headBlockConsoleErrors,
      [],
      "a transient head-block miss does not emit a console error or trigger the dev overlay",
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }

  console.log("address accuracy regressions passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
