import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";
import { Contract, Provider } from "koilib";

import { abiFogata2ListPools } from "@/koinos/abis/fogata2ListPools";
import { abiFogata2Pool } from "@/koinos/abis/fogata2Pool";
import { FOGATA2_LIST_POOLS_CONTRACT_ID } from "@/koinos/constants";
import {
  POOL_LOGO_MAX_BYTES,
  isPrivateAddress,
  parseLogoUrl,
  readCapped,
  sniffImageType,
} from "@/lib/pool-logo";

/**
 * Serves a listed Fogata pool's logo. The URL is read from the pool contract,
 * never from the request, so this is not an open proxy: it can only fetch
 * images that listed pools have set on-chain. Visitors' IPs never reach the
 * pool owner's server, and only small PNG, JPEG, GIF or WebP files are
 * served, identified by their bytes.
 *
 * Residual risk: DNS is checked before the fetch, so a host that rebinds
 * between the check and the connection could still reach a private address.
 * On Vercel the function has no private network of ours to reach.
 */

export const runtime = "nodejs";

const RPC_ORIGIN = "https://api.koinos.io";
const KOINOS_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{20,60}$/;
const LISTED_POOLS_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

let listedPoolsCache: { loadedAt: number; pools: Set<string> } | null = null;

async function loadListedPools(provider: Provider): Promise<Set<string>> {
  if (listedPoolsCache && Date.now() - listedPoolsCache.loadedAt < LISTED_POOLS_TTL_MS) {
    return listedPoolsCache.pools;
  }
  const listContract = new Contract({
    id: FOGATA2_LIST_POOLS_CONTRACT_ID,
    provider,
    abi: abiFogata2ListPools,
  });
  const { result } = await listContract.functions.get_pools({ start: "", limit: 100, direction: 0 });
  const pools = new Set(((result?.value ?? []) as { account: string }[]).map((pool) => pool.account));
  listedPoolsCache = { loadedAt: Date.now(), pools };
  return pools;
}

function unavailable(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ poolId: string }> }) {
  const { poolId } = await params;
  if (!KOINOS_ADDRESS_PATTERN.test(poolId)) {
    return unavailable(400, "Invalid pool address");
  }

  const provider = new Provider([RPC_ORIGIN]);
  let image: string;
  try {
    const listed = await loadListedPools(provider);
    if (!listed.has(poolId)) return unavailable(404, "Not a listed Fogata pool");
    const pool = new Contract({ id: poolId, provider, abi: abiFogata2Pool });
    const { result } = await pool.functions.get_pool_params({});
    image = (result as { image?: string } | undefined)?.image ?? "";
  } catch (error) {
    console.error("Pool logo: unable to read the pool from chain:", error);
    return unavailable(502, "Could not read the pool");
  }

  const url = parseLogoUrl(image);
  if (!url) return unavailable(404, "Pool has no usable logo URL");

  try {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
      return unavailable(403, "Logo host is not public");
    }
  } catch {
    return unavailable(502, "Logo host did not resolve");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "image/png,image/jpeg,image/gif,image/webp" },
    });
  } catch {
    return unavailable(502, "Logo fetch failed");
  }
  if (response.status !== 200 || !response.body) {
    return unavailable(502, "Logo host did not return the image");
  }
  if (Number(response.headers.get("content-length") ?? 0) > POOL_LOGO_MAX_BYTES) {
    await response.body.cancel();
    return unavailable(413, "Logo is too large");
  }

  const bytes = await readCapped(response.body, POOL_LOGO_MAX_BYTES);
  if (!bytes) return unavailable(413, "Logo is too large");
  const type = sniffImageType(bytes);
  if (!type) return unavailable(415, "Logo is not a PNG, JPEG, GIF or WebP image");

  return new NextResponse(bytes as BodyInit, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
