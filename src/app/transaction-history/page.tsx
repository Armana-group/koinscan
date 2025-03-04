"use client";

import { useState } from 'react';
import { DetailedTransactionHistory } from '@/components/DetailedTransactionHistory';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export default function TransactionHistoryPage() {
  const [address, setAddress] = useState<string>('');
  const [searchedAddress, setSearchedAddress] = useState<string>('');

  const handleSearch = () => {
    setSearchedAddress(address);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Koinos Transaction History</h1>
      
      <div className="mb-8">
        <div className="flex gap-2 max-w-xl">
          <Input
            placeholder="Enter Koinos address (e.g., 12mutMcqqWavhfri2yXWSv77oh7PVY2WSS)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Example: 12mutMcqqWavhfri2yXWSv77oh7PVY2WSS
        </p>
      </div>

      {searchedAddress && (
        <DetailedTransactionHistory address={searchedAddress} />
      )}
    </div>
  )
} 