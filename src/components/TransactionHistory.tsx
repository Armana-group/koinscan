"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getAddressHistory, formatTransactions } from '@/lib/api';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { useWallet } from '@/contexts/WalletContext';

interface Transaction {
  id: string;
  payer: string;
  timestamp: string;
  formattedOperations: Array<{
    type: string;
    contract?: string;
    method?: string;
    args?: Record<string, any>;
    data?: any;
  }>;
}

interface TransactionHistoryProps {
  initialAddress?: string;
}

export function TransactionHistory({ initialAddress }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const { provider } = useWallet();

  const fetchTransactions = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Making API call to getAddressHistory...');
      const data = await getAddressHistory(provider!,address, limit, false, true);
      console.log('Received transaction data:', data);
      
      if (data && Array.isArray(data)) {
        const formattedData = formatTransactions(data);
        console.log('Formatted transaction data:', formattedData);
        setTransactions(formattedData);
      } else {
        console.log('No transaction data received');
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to fetch transactions. Please try again.');
      toast.error("Failed to fetch transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [limit, provider]);

  // Fetch transactions when initialAddress changes
  useEffect(() => {
    if (initialAddress) {
      console.log('Initial address updated:', initialAddress);
      fetchTransactions(initialAddress);
    }
  }, [initialAddress, fetchTransactions]);

  const formatDate = (timestamp: string) => {
    if (timestamp === 'Unknown') return 'Unknown';
    try {
      return new Date(parseInt(timestamp)).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const renderOperationSummary = (operation: any) => {
    if (operation.type === 'Contract Call') {
      if (operation.method === 'transfer' && operation.args) {
        const { from, to, value } = operation.args;
        return (
          <span>
            Transfer {value} from {shortenAddress(from)} to {shortenAddress(to)}
          </span>
        );
      }
      return `${operation.method} on contract ${shortenAddress(operation.contract)}`;
    }
    return operation.type;
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (!initialAddress) return null;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Transaction History</CardTitle>
        <CardDescription>
          Showing transactions for {shortenAddress(initialAddress)}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found for this address
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Payer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono">
                          <div className="flex items-center">
                            {shortenAddress(tx.id)}
                            <a 
                              href={`/tx/${tx.id}`}
                              className="ml-2 text-primary hover:text-primary/80"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(tx.timestamp)}</TableCell>
                        <TableCell>
                          {tx.formattedOperations.length > 0 
                            ? renderOperationSummary(tx.formattedOperations[0])
                            : 'Unknown operation'}
                        </TableCell>
                        <TableCell className="font-mono">{shortenAddress(tx.payer)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>

      {transactions.length > 0 && (
        <CardFooter className="flex justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Showing {limit} transactions
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (page > 1) setPage(page - 1);
              }}
              disabled={page === 1 || loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={transactions.length < limit || loading}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
} 