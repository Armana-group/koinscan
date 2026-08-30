import { KOIN_CONTRACT_ID, VHP_CONTRACT_ID } from "@/koinos/constants";
import type { KoinosToken } from "@/lib/tokens";

export interface TokenBalance {
  token: KoinosToken;
  balance: string;
  formattedBalance: string;
  numericValue: number;
}

export interface TokenBalanceFailure {
  token: KoinosToken;
  message: string;
}

export interface WalletBalanceLoadResult {
  balances: TokenBalance[];
  failures: TokenBalanceFailure[];
}

export type TokenBalanceReader = (
  contractAddress: string,
  owner: string,
  token: KoinosToken,
) => Promise<string>;

const CORE_TOKEN_CONTRACTS: Record<string, string> = {
  koin: KOIN_CONTRACT_ID,
  vhp: VHP_CONTRACT_ID,
};

const getContractAddress = (token: KoinosToken): string =>
  CORE_TOKEN_CONTRACTS[token.address.toLowerCase()] ?? token.address;

const getDecimals = (token: KoinosToken): number => {
  const decimals = Number.parseInt(token.decimals, 10);
  return Number.isInteger(decimals) && decimals >= 0 ? decimals : 8;
};

const formatBalance = (value: number): string => {
  if (value === 0) return "0";
  if (value < 0.000001) return "< 0.000001";
  if (value < 1) return value.toFixed(6);
  if (value < 1000) return value.toFixed(4);
  if (value < 1000000) return `${(value / 1000).toFixed(2)}K`;
  return `${(value / 1000000).toFixed(2)}M`;
};

const processBatches = async <T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    results.push(...(await Promise.all(batch.map(processor))));
  }

  return results;
};

type TokenReadResult =
  | { status: "balance"; balance: TokenBalance }
  | { status: "zero" }
  | { status: "failure"; failure: TokenBalanceFailure };

export async function loadWalletBalances(
  tokens: KoinosToken[],
  owner: string,
  readBalance: TokenBalanceReader,
  batchSize = 2,
): Promise<WalletBalanceLoadResult> {
  const results = await processBatches<KoinosToken, TokenReadResult>(
    tokens,
    batchSize,
    async (token) => {
      try {
        const balanceRaw = await readBalance(
          getContractAddress(token),
          owner,
          token,
        );
        const rawValue = BigInt(balanceRaw);

        if (rawValue === BigInt(0)) return { status: "zero" };
        if (rawValue < BigInt(0)) throw new Error("Token balance cannot be negative");

        const numericValue =
          Number(rawValue) / Math.pow(10, getDecimals(token));
        if (!Number.isFinite(numericValue))
          throw new Error("Token balance is too large to display");

        return {
          status: "balance",
          balance: {
            token,
            balance: balanceRaw,
            formattedBalance: formatBalance(numericValue),
            numericValue,
          },
        };
      } catch (error) {
        return {
          status: "failure",
          failure: {
            token,
            message:
              error instanceof Error
                ? error.message
                : "Unknown balance read error",
          },
        };
      }
    },
  );

  return {
    balances: results
      .filter(
        (result): result is Extract<TokenReadResult, { status: "balance" }> =>
          result.status === "balance",
      )
      .map(({ balance }) => balance)
      .sort((left, right) => right.numericValue - left.numericValue),
    failures: results
      .filter(
        (result): result is Extract<TokenReadResult, { status: "failure" }> =>
          result.status === "failure",
      )
      .map(({ failure }) => failure),
  };
}
