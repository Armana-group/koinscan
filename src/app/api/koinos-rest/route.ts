import { NextResponse } from 'next/server';

const DEFAULT_REST_ORIGIN = 'https://rest.koinos.io';
const ALLOWED_REST_ORIGINS = new Set([
  DEFAULT_REST_ORIGIN,
  'https://api.koinos.io',
  'https://api.koinosblocks.com',
]);

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

  try {
    const response = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Error proxying Koinos REST request:', error);
    return NextResponse.json({ error: 'Koinos REST request failed' }, { status: 502 });
  }
}
