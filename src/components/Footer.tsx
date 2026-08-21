'use client';

import Link from 'next/link'
import { useLatestBlock } from '@/hooks/useLatestBlock'
import { Blocks } from 'lucide-react'

export function Footer() {
  const { blockInfo, loading } = useLatestBlock();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
  const buildCommit = process.env.NEXT_PUBLIC_BUILD_COMMIT;
  const buildLabel = appVersion && buildCommit ? `v${appVersion} · ${buildCommit}` : null;

  return (
    <footer className="w-full py-4 text-sm text-muted-foreground">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
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
        </div>
        {!loading && blockInfo && (
          <Link
            href="/blocks"
            className="flex items-center gap-2 hover:text-foreground transition-colors"
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
