'use client';

import { useState, useEffect } from 'react';
import { getHeadBlockInfo } from '@/lib/api';

export function useLatestBlock(refreshInterval = 12000) {
  const [blockInfo, setBlockInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLatestBlock() {
      try {
        const data = await getHeadBlockInfo();
        setBlockInfo(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching latest block:', err);
        setError('Failed to fetch latest block');
      } finally {
        setLoading(false);
      }
    }

    // Fetch immediately
    fetchLatestBlock();

    // Set up polling
    const interval = setInterval(fetchLatestBlock, refreshInterval);

    // Cleanup
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { blockInfo, loading, error };
} 