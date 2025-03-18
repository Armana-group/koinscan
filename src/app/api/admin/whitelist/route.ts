import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { hasWalletAccess } from '@/lib/beta-access';

// Update the path to be relative to the project root
const whitelistPath = path.join(process.cwd(), 'src', 'config', 'whitelist.json');

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

export async function GET() {
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
  try {
    // Verify admin access
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const adminWallet = authHeader.replace('Bearer ', '');
    if (!hasWalletAccess(adminWallet)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet, action } = await request.json();
    if (!wallet || !action) {
      return NextResponse.json({ error: 'Missing wallet or action' }, { status: 400 });
    }

    const whitelist = await ensureWhitelistFile();

    if (action === 'add') {
      if (!whitelist.whitelisted.includes(wallet)) {
        whitelist.whitelisted.push(wallet);
      }
    } else if (action === 'remove') {
      whitelist.whitelisted = whitelist.whitelisted.filter((w: string) => w !== wallet);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await fs.writeFile(whitelistPath, JSON.stringify(whitelist, null, 2));
    return NextResponse.json(whitelist);
  } catch (error) {
    console.error('Error managing whitelist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 