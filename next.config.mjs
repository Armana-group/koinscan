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
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_BUILD_COMMIT: resolveBuildCommit(),
  },
  images: {
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
              "img-src 'self' data: blob: https://raw.githubusercontent.com https://githubusercontent.com https://walletconnect.com https://koinscan.com",
              "connect-src 'self' https://api.koinos.io https://api.koinosblocks.com https://rest.koinos.io https://raw.githubusercontent.com wss://relay.walletconnect.com https://relay.walletconnect.com",
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
