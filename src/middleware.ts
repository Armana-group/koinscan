import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BETA_ACCESS_ENABLED, PUBLIC_PATHS, BETA_ACCESS_KEY, ALLOWED_WALLETS } from './config/beta-access';

export function middleware(request: NextRequest) {
  // Skip if beta access is disabled
  if (!BETA_ACCESS_ENABLED) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow access to public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if the user has an access token in cookies
  const betaAccessCookie = request.cookies.get(BETA_ACCESS_KEY);
  
  if (betaAccessCookie) {
    try {
      const accessData = JSON.parse(betaAccessCookie.value);
      // Verify the access is valid and the wallet is still allowed
      if (accessData.hasAccess && 
          accessData.walletAddress && 
          ALLOWED_WALLETS.includes(accessData.walletAddress)) {
        return NextResponse.next();
      }
    } catch (error) {
      console.error('Error parsing beta access cookie:', error);
    }
  }

  // If client-side localStorage check failed and they have a previously valid wallet address
  // We'll handle the redirect on the beta-access page itself
  // This is especially important for wallet reconnection

  // No valid access, redirect to beta access page
  const betaAccessUrl = new URL('/beta-access', request.url);
  return NextResponse.redirect(betaAccessUrl);
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /beta-access (our beta access page)
     * 4. /images (static files)
     * 5. /favicon.ico, /sitemap.xml, /robots.txt (static files)
     */
    '/((?!api|_next|beta-access|images|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}; 