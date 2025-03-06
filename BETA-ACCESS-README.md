# Beta Access System

This document provides an overview of the wallet-based gated access system implemented for the early beta phase of this application.

## Overview

The beta access system restricts application access to a whitelist of wallet addresses. When a user visits the site, they're redirected to a beta access page where they can connect their wallet. If their wallet address is on the whitelist, they gain access to the application. Otherwise, they remain on the beta access page.

## How It Works

1. **Configuration**: All beta access settings are managed in `src/config/beta-access.ts`.
2. **Middleware**: The `src/middleware.ts` file checks if a user has access before allowing them to view protected pages.
3. **Beta Access Page**: The `src/app/beta-access/page.tsx` file provides the UI for users to connect their wallets and check access.
4. **Wallet Integration**: The wallet components are integrated with the beta access system to automatically check access when a wallet is connected.

## Managing Beta Access

### Adding Allowed Wallets

To add wallet addresses to the whitelist, edit the `src/config/beta-access.ts` file:

```typescript
export const WHITELISTED_WALLETS: string[] = [
  "15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL", // Example
  "1newwalletaddress",                   // Add new addresses here
];
```

For development purposes, you can also add addresses to the `DEV_WALLETS` array.

### Disabling Beta Access Restriction

When you're ready to open the application to the public, simply set `BETA_ACCESS_ENABLED` to `false` in `src/config/beta-access.ts`:

```typescript
export const BETA_ACCESS_ENABLED = false;
```

This will immediately disable all beta access restrictions while keeping the code in place if you need to reimpose restrictions later.

### Re-enabling Beta Access Restriction

If you need to restrict access again in the future:

1. Set `BETA_ACCESS_ENABLED` back to `true`
2. Update the wallet lists as needed

## Technical Implementation

The beta access system consists of the following components:

1. **Configuration (`src/config/beta-access.ts`)**: Central configuration for the beta access system.
2. **Middleware (`src/middleware.ts`)**: Intercepts all requests and checks if the user has access.
3. **Beta Access Page (`src/app/beta-access/page.tsx`)**: Landing page for users without access.
4. **Utilities (`src/lib/beta-access.ts`)**: Helper functions for managing beta access state.
5. **Wallet Integration**: Automatic checking of wallet addresses against the whitelist.

### Access State Storage

The beta access state is stored in both:
- `localStorage` for client-side checks
- Cookies for server-side middleware checks

This ensures that once a user proves they have access, they don't need to reconnect their wallet on every visit.

## Troubleshooting

### Clearing Access State

If you need to force a user to reconnect their wallet:
- Clear the site cookies
- Clear local storage for the site
- Reload the page

### Testing the System

To test if the system is working correctly:
1. Add your wallet to the whitelist
2. Connect your wallet and ensure you can access the site
3. Remove your wallet from the whitelist and clear your cookies/localStorage
4. Verify you're redirected to the beta access page 