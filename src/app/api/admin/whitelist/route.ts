import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { timingSafeEqual } from 'crypto';

// Update the path to be relative to the project root
const whitelistPath = path.join(process.cwd(), 'src', 'config', 'whitelist.json');
const ADMIN_TOKEN_ENV = 'KOISCAN_ADMIN_API_TOKEN';
const VALID_ACTIONS = new Set(['add', 'remove']);
const KOINOS_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{26,35}$/;
const NICKNAME_PATTERN = /^@?[a-zA-Z0-9_-]{2,32}$/;

interface WhitelistData {
  whitelisted: string[];
  dev: string[];
}

// Default whitelist data
const defaultWhitelist: WhitelistData = {
  whitelisted: [
    "12mutMcqqWavhfri2yXWSv77oh7PVY2WSS",
    "18fjEQn9bJQnB75BX97WXghMeVKHNJ6mmg",
    "@jga",
    "jga",
    "1AQjQSbD2oHUNTi7FSvVywUQpWbNbjS8pD"
  ],
  dev: []
};

// Ensure the config directory exists and create whitelist.json if it doesn't exist
async function ensureWhitelistFile() {
  try {
    // Create the config directory if it doesn't exist
    const configDir = path.join(process.cwd(), 'src', 'config');
    await fs.mkdir(configDir, { recursive: true });

    let whitelist: WhitelistData;

    try {
      // Try to read existing whitelist
      const content = await fs.readFile(whitelistPath, 'utf-8');
      whitelist = JSON.parse(content) as WhitelistData;
    } catch {
      // If file doesn't exist or is invalid, create it with current whitelist data
      whitelist = defaultWhitelist;
      await fs.writeFile(whitelistPath, JSON.stringify(whitelist, null, 2));
    }

    return whitelist;
  } catch (error) {
    console.error('Error ensuring whitelist file exists:', error);
    // Return default whitelist data as fallback
    return defaultWhitelist;
  }
}

function constantTimeEqual(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}

function extractBearerToken(request: Request): string {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return '';
  }

  return authHeader.slice('Bearer '.length).trim();
}

function requireAdminAccess(request: Request): NextResponse | null {
  const expectedToken = process.env[ADMIN_TOKEN_ENV];
  if (!expectedToken) {
    return NextResponse.json(
      { error: 'Admin whitelist API is not configured' },
      { status: 503 }
    );
  }

  const providedToken = extractBearerToken(request);
  if (!providedToken || !constantTimeEqual(providedToken, expectedToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

function normalizeWalletEntry(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidWhitelistEntry(value: string): boolean {
  return KOINOS_ADDRESS_PATTERN.test(value) || NICKNAME_PATTERN.test(value);
}

export async function GET(request: Request) {
  const unauthorized = requireAdminAccess(request);
  if (unauthorized) return unauthorized;

  try {
    const whitelist = await ensureWhitelistFile();
    return NextResponse.json(whitelist);
  } catch (error) {
    console.error('Error reading whitelist:', error);
    // Return default whitelist data as fallback
    return NextResponse.json(defaultWhitelist);
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdminAccess(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const wallet = normalizeWalletEntry(body.wallet);
    const action = normalizeWalletEntry(body.action);

    if (!wallet || !action) {
      return NextResponse.json({ error: 'Missing wallet or action' }, { status: 400 });
    }

    if (!VALID_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!isValidWhitelistEntry(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet identifier' }, { status: 400 });
    }

    const whitelist = await ensureWhitelistFile();

    if (action === 'add') {
      if (!whitelist.whitelisted.includes(wallet)) {
        whitelist.whitelisted.push(wallet);
      }
    } else if (action === 'remove') {
      whitelist.whitelisted = whitelist.whitelisted.filter((w: string) => w !== wallet);
    }

    await fs.writeFile(whitelistPath, JSON.stringify(whitelist, null, 2));
    return NextResponse.json(whitelist);
  } catch (error) {
    console.error('Error managing whitelist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
