import { NextResponse } from 'next/server';
import { DEFAULT_REST_NODE, KNOWN_REST_ORIGINS } from '@/koinos/known-nodes';
import { alternates, isImmutablePath, RestCache } from '@/lib/rest-cache';

// Transactions and blocks never change once a node has them, so they are kept
// in memory: fresh copies skip the node, and any copy answers when every
// trusted host is rate limiting or down.
const immutable = new RestCache();

const DEFAULT_REST_ORIGIN = DEFAULT_REST_NODE;
const ALLOWED_REST_ORIGINS = KNOWN_REST_ORIGINS;

const ALLOWED_REST_PATHS = [
  /^\/v1\/chain\/head_info$/,
  /^\/v1\/chain\/blocks\/(?:0x)?[a-fA-F0-9]{64,}$/,
  /^\/v1\/block\/(?:\d+|(?:0x)?[a-fA-F0-9]{64,})$/,
  /^\/v1\/transaction\/(?:0x)?[a-fA-F0-9]{64,}$/,
  /^\/v1\/account\/[1-9A-HJ-NP-Za-km-z]{20,60}\/history$/,
  /^\/v1\/account\/[1-9A-HJ-NP-Za-km-z]{20,60}\/balance\/[a-z0-9_-]{1,64}$/,
];

function normalizeRestOrigin(restNode: string | null): string | null {
  try {
    const url = new URL(restNode || DEFAULT_REST_ORIGIN);

    if (url.protocol !== 'https:') {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function isAllowedPath(path: string): boolean {
  return (
    path.startsWith('/v1/') &&
    !path.includes('..') &&
    ALLOWED_REST_PATHS.some((pattern) => pattern.test(path))
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const restOrigin = normalizeRestOrigin(requestUrl.searchParams.get('restNode'));
  const path = requestUrl.searchParams.get('path') || '';

  if (!restOrigin || !ALLOWED_REST_ORIGINS.has(restOrigin)) {
    return NextResponse.json({ error: 'Unsupported Koinos REST node' }, { status: 400 });
  }

  if (!isAllowedPath(path)) {
    return NextResponse.json({ error: 'Unsupported Koinos REST path' }, { status: 400 });
  }

  const upstreamUrl = new URL(path, restOrigin);
  requestUrl.searchParams.forEach((value, key) => {
    if (key !== 'restNode' && key !== 'path') {
      upstreamUrl.searchParams.append(key, value);
    }
  });

  const cacheable = isImmutablePath(path);
  const cacheKey = `${upstreamUrl.pathname}?${upstreamUrl.searchParams.toString()}`;
  const reply = (body: string, status: number, contentType: string, hit?: 'fresh' | 'stale') =>
    new NextResponse(body, {
      status,
      headers: {
        'Cache-Control': cacheable && status === 200 ? 'public, s-maxage=600, stale-while-revalidate=86400' : 'no-store',
        'Content-Type': contentType,
        ...(hit ? { 'X-Koinscan-Cache': hit } : {}),
      },
    });

  if (cacheable) {
    const fresh = immutable.fresh(cacheKey);
    if (fresh) return reply(fresh.body, 200, fresh.contentType, 'fresh');
  }

  const fetchFrom = async (origin: string) => {
    const url = new URL(upstreamUrl);
    url.protocol = new URL(origin).protocol;
    url.host = new URL(origin).host;
    const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    return { response, body: await response.text(), contentType: response.headers.get('content-type') || 'application/json' };
  };
  const overloaded = (status: number) => status === 429 || status >= 500;

  try {
    let result = await fetchFrom(restOrigin);
    // A rate-limited or failing host: try the other trusted ones for data that
    // is the same everywhere.
    if (cacheable && overloaded(result.response.status)) {
      for (const origin of alternates(restOrigin, ALLOWED_REST_ORIGINS)) {
        const next = await fetchFrom(origin).catch(() => null);
        if (next && !overloaded(next.response.status)) {
          result = next;
          break;
        }
      }
    }
    if (cacheable && overloaded(result.response.status)) {
      const stale = immutable.any(cacheKey);
      if (stale) return reply(stale.body, 200, stale.contentType, 'stale');
    }
    if (cacheable && result.response.status === 200) immutable.set(cacheKey, result.body, result.contentType);
    return reply(result.body, result.response.status, result.contentType);
  } catch (error) {
    if (cacheable) {
      const stale = immutable.any(cacheKey);
      if (stale) return reply(stale.body, 200, stale.contentType, 'stale');
    }
    console.error('Error proxying Koinos REST request:', error);
    return NextResponse.json({ error: 'Koinos REST request failed' }, { status: 502 });
  }
}
