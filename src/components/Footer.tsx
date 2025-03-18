'use client';

import Link from 'next/link'
import { useLatestBlock } from '@/hooks/useLatestBlock'
import { formatDistanceToNow } from 'date-fns'
import { Blocks } from 'lucide-react'

export function Footer() {
  const { blockInfo, loading } = useLatestBlock();

  const formattedTime = blockInfo?.head_block_time
    ? formatDistanceToNow(new Date(parseInt(blockInfo.head_block_time)), { addSuffix: true })
    : '';

  return (
    <footer className="w-full py-4 text-sm text-muted-foreground">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <p>
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