'use client';

import Link from 'next/link'
import { useLatestBlock } from '@/hooks/useLatestBlock'
import { Blocks } from 'lucide-react'
import { BetaBanner } from '@/components/BetaBanner'

export function Footer() {
  const { blockInfo, loading } = useLatestBlock();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
  const buildCommit = process.env.NEXT_PUBLIC_BUILD_COMMIT;
  const buildLabel = appVersion && buildCommit ? `v${appVersion} · ${buildCommit}` : null;

  return (
    <footer className="w-full py-4 text-sm text-muted-foreground">
      <div className="container mx-auto grid items-center gap-3 px-4 text-center lg:grid-cols-[1fr_auto_1fr] lg:text-left">
        <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 lg:justify-self-start">
          <p className="leading-none">
            © 2025{' '}
            <Link
              href="https://armana.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Armana
            </Link>
          </p>
          {buildLabel && (
            <span className="text-xs leading-none text-muted-foreground/60" aria-label={`Build ${buildLabel}`}>
              {buildLabel}
            </span>
          )}
          <Link
            href="/changelog"
            className="text-xs leading-none text-muted-foreground/70 transition-colors hover:text-foreground hover:underline"
          >
            Changelog
          </Link>
        </div>
        <BetaBanner className="max-w-xl justify-self-center px-2" />
        {!loading && blockInfo && (
          <Link
            href="/blocks"
            className="flex items-center justify-self-center gap-2 transition-colors hover:text-foreground lg:justify-self-end"
          >
            <Blocks className="h-4 w-4" />
            <span>
              Latest Block: {blockInfo.head_topology?.height}
              {/* {formattedTime && <span className="ml-2 text-xs">({formattedTime})</span>} */}
            </span>
          </Link>
        )}
      </div>
    </footer>
  )
} 
