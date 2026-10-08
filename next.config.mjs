import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const resolveBuildCommit = () => {
  const envCommit =
    process.env.NEXT_PUBLIC_BUILD_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.COMMIT_SHA;

  if (envCommit) {
    return envCommit.slice(0, 7);
  }

  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/pool-logo/*': ['./src/lib/pool-logo-worker.mjs'],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_BUILD_COMMIT: resolveBuildCommit(),
  },
  images: {
    // Prevent callers from re-optimizing API responses at arbitrary sizes.
    localPatterns: [
      { pathname: '/*.png', search: '' },
      { pathname: '/*.svg', search: '' },
      { pathname: '/images/**', search: '' },
      { pathname: '/_next/static/media/**', search: '' },
    ],
    // Pool logos use the bounded /api/pool-logo endpoint. Other remote images
    // keep explicit host rules rather than exposing an unrestricted optimizer.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'walletconnect.com',
      },
      {
        protocol: 'https',
        hostname: 'koinscan.com',
        pathname: '/koinscan-logo.png',
        search: '',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "img-src 'self' data: blob: https://raw.githubusercontent.com https://githubusercontent.com https://walletconnect.com https://koinscan.com https://iili.io",
              // Any https origin so users can point the app at a custom Koinos node.
              // Plain http is limited to localhost for local node testing.
              "connect-src 'self' https: http://localhost:* wss://relay.walletconnect.com",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
