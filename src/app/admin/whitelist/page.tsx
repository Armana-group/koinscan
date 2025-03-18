'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWallet } from '@/contexts/WalletContext';

interface WhitelistData {
  whitelisted: string[];
  dev: string[];
}

export default function WhitelistAdmin() {
  const [whitelistData, setWhitelistData] = useState<WhitelistData>({ whitelisted: [], dev: [] });
  const [newWallet, setNewWallet] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { savedAddress } = useWallet();

  useEffect(() => {
    fetchWhitelist();
  }, []);

  const fetchWhitelist = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch('/api/admin/whitelist');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch whitelist');
      }
      
      setWhitelistData(data);
    } catch (err) {
      console.error('Error fetching whitelist:', err);
      setError(err instanceof Error ? err.message : 'Failed to load whitelist');
    } finally {
      setIsLoading(false);
    }
  };

  const addWallet = async () => {
    if (!newWallet) return;
    if (!savedAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${savedAddress}`,
        },
        body: JSON.stringify({ wallet: newWallet, action: 'add' }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add wallet');
      }
      
      setWhitelistData(data);
      setNewWallet('');
    } catch (err) {
      console.error('Error adding wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to add wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const removeWallet = async (wallet: string) => {
    if (!savedAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${savedAddress}`,
        },
        body: JSON.stringify({ wallet, action: 'remove' }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove wallet');
      }
      
      setWhitelistData(data);
    } catch (err) {
      console.error('Error removing wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove wallet');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Whitelist Management</h1>
      
      {!savedAddress && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Please connect your wallet to manage the whitelist
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Enter wallet address"
          value={newWallet}
          onChange={(e) => setNewWallet(e.target.value)}
          className="max-w-md"
          disabled={isLoading || !savedAddress}
        />
        <Button 
          onClick={addWallet} 
          disabled={isLoading || !savedAddress || !newWallet}
        >
          {isLoading ? 'Adding...' : 'Add Wallet'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Whitelisted Wallets</h2>
          {isLoading && whitelistData.whitelisted.length === 0 ? (
            <div className="text-gray-500">Loading...</div>
          ) : whitelistData.whitelisted.length === 0 ? (
            <div className="text-gray-500">No wallets whitelisted yet</div>
          ) : (
            <div className="space-y-2">
              {whitelistData.whitelisted.map((wallet) => (
                <div key={wallet} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-mono">{wallet}</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        disabled={isLoading || !savedAddress}
                      >
                        Remove
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Removal</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <p>Are you sure you want to remove this wallet from the whitelist?</p>
                        <p className="font-mono mt-2">{wallet}</p>
                      </div>
                      <div className="flex justify-end gap-4">
                        <Button variant="outline" onClick={() => {}}>Cancel</Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => removeWallet(wallet)}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Removing...' : 'Remove'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 