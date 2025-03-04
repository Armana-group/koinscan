"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  getDetailedAccountHistory, 
  formatDetailedTransactions, 
  enrichTransactionsWithTimestamps,
  DetailedTransaction,
  TransactionEvent,
  getTokenBalance
} from '@/lib/api';
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
import { 
  ArrowLeft, 
  ArrowRight, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Layers,
  Hash,
  Coins
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface DetailedTransactionHistoryProps {
  address?: string;
}

interface FormattedOperation {
  type: string;
  contract?: string;
  method?: string | number;
  args?: Record<string, any>;
}

interface FormattedTransaction {
  id: string;
  payer: string;
  timestamp: string;
  blockHeight?: string;
  blockId?: string;
  operations: FormattedOperation[];
  events: TransactionEvent[];
  rc_used: string;
  signatures: string[];
  totalValueTransferred: string;
  tokenSymbol: string;
}

export function DetailedTransactionHistory({ address }: DetailedTransactionHistoryProps) {
  const [transactions, setTransactions] = useState<DetailedTransaction[]>([]);
  const [formattedTransactions, setFormattedTransactions] = useState<FormattedTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(10);
  const [ascending, setAscending] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  
  // Add state for token balance
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [tokenSymbol, setTokenSymbol] = useState<string>('KOIN');
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  
  // Add state for pagination
  const [paginationHistory, setPaginationHistory] = useState<{[page: number]: {
    transactions: DetailedTransaction[],
    formattedTransactions: FormattedTransaction[],
    sequenceNumber?: string
  }}>({});
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);

  // Fetch token balance when address changes
  useEffect(() => {
    if (address) {
      fetchTokenBalance(address);
    }
  }, [address]);

  // Fetch transactions when address changes or when limit/ascending changes
  useEffect(() => {
    if (address) {
      // Reset pagination when address, limit, or ascending changes
      setPage(1);
      setPaginationHistory({});
      setHasMore(true);
      setTotalTransactions(0);
      fetchTransactions(address);
    }
  }, [address, limit, ascending]);

  // Fetch transactions when page changes
  useEffect(() => {
    if (address && page > 1) {
      // Check if we already have data for this page
      if (paginationHistory[page]) {
        setTransactions(paginationHistory[page].transactions);
        setFormattedTransactions(paginationHistory[page].formattedTransactions);
      } else {
        // Fetch next page using sequence number from previous page
        const prevPage = paginationHistory[page - 1];
        if (prevPage && prevPage.transactions.length > 0) {
          const lastTx = prevPage.transactions[prevPage.transactions.length - 1];
          // Get the sequence number for pagination
          const sequenceNumber = lastTx.seq_num;
          fetchTransactions(address, sequenceNumber);
        }
      }
    }
  }, [page]);

  const fetchTransactions = async (accountAddress: string, sequenceNumber?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDetailedAccountHistory(accountAddress, limit, ascending, true, sequenceNumber);
      
      if (data && Array.isArray(data)) {
        setTransactions(data);
        const formatted = formatDetailedTransactions(data);
        
        // Enrich transactions with timestamp information
        const enriched = await enrichTransactionsWithTimestamps(formatted);
        setFormattedTransactions(enriched);
        
        // Update pagination history
        setPaginationHistory(prev => ({
          ...prev,
          [page]: {
            transactions: data,
            formattedTransactions: enriched,
            sequenceNumber: sequenceNumber
          }
        }));
        
        // Update hasMore flag
        setHasMore(data.length === limit);
        
        // Update total transactions count
        setTotalTransactions(prev => prev + data.length);
      } else {
        setTransactions([]);
        setFormattedTransactions([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching detailed transactions:', err);
      setError('Failed to fetch transactions. Please try again.');
      toast.error("Failed to fetch transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add function to fetch token balance
  const fetchTokenBalance = async (accountAddress: string) => {
    setLoadingBalance(true);
    try {
      const balance = await getTokenBalance(accountAddress);
      // The API already returns the balance in KOIN format, no need to convert
      setTokenBalance(balance);
    } catch (err) {
      console.error('Error fetching token balance:', err);
      toast.error("Failed to fetch token balance. Please try again.");
    } finally {
      setLoadingBalance(false);
    }
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatHex = (hex: string) => {
    if (!hex) return '';
    if (hex.startsWith('0x')) {
      return shortenAddress(hex);
    }
    return shortenAddress(hex);
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return 'Unknown';
    try {
      // Koinos timestamps are in milliseconds since epoch
      const date = new Date(parseInt(timestamp));
      return date.toLocaleString();
    } catch (e: any) {
      return 'Invalid date';
    }
  };

  const formatValue = (value: string) => {
    try {
      // Format the value as a number with commas
      const numValue = BigInt(value);
      // Convert to a more readable format (e.g., if this is in the smallest unit like satoshis)
      // Assuming 8 decimal places for tokens like KOIN
      const formatted = (Number(numValue) / 100000000).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8
      });
      return formatted;
    } catch (e) {
      return value;
    }
  };

  const renderOperationSummary = (operation: FormattedOperation) => {
    if (operation.type === 'Contract Call') {
      if (operation.method === 'transfer' && operation.args) {
        const { from, to, value } = operation.args;
        return (
          <span>
            Transfer {value} from {shortenAddress(from || '')} to {shortenAddress(to || '')}
          </span>
        );
      }
      return `${operation.method} on contract ${shortenAddress(operation.contract || '')}`;
    }
    return operation.type;
  };

  const renderEventSummary = (event: TransactionEvent) => {
    if (event.name.includes('transfer_event') && event.data) {
      const { from, to, value } = event.data;
      return (
        <span>
          Transfer {value} from {shortenAddress(from || '')} to {shortenAddress(to || '')}
        </span>
      );
    }
    return event.name;
  };

  // Update the limit handler
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
  };

  if (!address) return null;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Transaction History</CardTitle>
          {loadingBalance ? (
            <Skeleton className="h-6 w-32" />
          ) : (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Balance</div>
              <div className="text-xl font-bold">{tokenBalance} {tokenSymbol}</div>
            </div>
          )}
        </div>
        <CardDescription>
          {transactions.length > 0 && (
            <span>Found {transactions.length} transactions for address {formatHex(address)}</span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAscending(!ascending)}
            >
              {ascending ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Oldest First
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Newest First
                </>
              )}
            </Button>
            {transactions.length > 0 && (
              <span className="text-sm text-muted-foreground">
                Showing {formattedTransactions.length} of {transactions.length} transactions
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLimit(5)}
              className={limit === 5 ? "bg-primary text-primary-foreground" : ""}
            >
              5
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLimit(10)}
              className={limit === 10 ? "bg-primary text-primary-foreground" : ""}
            >
              10
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLimit(20)}
              className={limit === 20 ? "bg-primary text-primary-foreground" : ""}
            >
              20
            </Button>
          </div>
        </div>

        {/* Add limit selector */}
        <div className="flex items-center space-x-2 mb-4">
          <Label htmlFor="limit">Transactions per page:</Label>
          <Select
            value={limit.toString()}
            onValueChange={(value: string) => handleLimitChange(parseInt(value))}
          >
            <SelectTrigger id="limit" className="w-[180px]">
              <SelectValue placeholder="Select limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
              <>
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold flex items-center">
                      <span className="mr-2">Transaction Summary</span>
                    </h3>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Showing {formattedTransactions.length} of {totalTransactions}+ transactions with {formattedTransactions.filter(tx => tx.totalValueTransferred && parseFloat(tx.totalValueTransferred) > 0).length} transfers
                  </p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  {formattedTransactions.map((tx, index) => (
                    <AccordionItem key={tx.id} value={tx.id}>
                      <AccordionTrigger className="hover:bg-muted/50 px-4 py-2 rounded-md">
                        <div className="flex w-full justify-between items-center">
                          <div className="font-mono text-sm flex items-center">
                            <Hash className="h-3 w-3 mr-1 text-muted-foreground" />
                            {formatHex(tx.id)}
                          </div>
                          <div className="flex items-center space-x-4">
                            {tx.totalValueTransferred !== '0' && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                {formatValue(tx.totalValueTransferred)} {tx.tokenSymbol}
                              </Badge>
                            )}
                            {tx.timestamp && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDate(tx.timestamp)}
                              </div>
                            )}
                            {tx.blockHeight && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Layers className="h-3 w-3 mr-1" />
                                Block #{tx.blockHeight}
                              </div>
                            )}
                            {tx.events.some(e => e.name.includes('transfer_event')) && (
                              <Badge variant="outline" className="bg-primary/10">
                                Transfer
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {tx.events.length} events
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="p-4 space-y-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Transaction Details</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="font-medium">ID:</div>
                              <div className="font-mono break-all">
                                <a 
                                  href={`https://koinosblocks.com/tx/${tx.id}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center"
                                >
                                  {tx.id}
                                  <ExternalLink size={12} className="ml-1" />
                                </a>
                              </div>
                              <div className="font-medium">Payer:</div>
                              <div className="font-mono">
                                <a 
                                  href={`https://koinosblocks.com/address/${tx.payer}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center"
                                >
                                  {tx.payer}
                                  <ExternalLink size={12} className="ml-1" />
                                </a>
                              </div>
                              <div className="font-medium">Timestamp:</div>
                              <div>{formatDate(tx.timestamp)}</div>
                              {tx.blockHeight && (
                                <>
                                  <div className="font-medium">Block Height:</div>
                                  <div className="font-mono">
                                    <a 
                                      href={`https://koinosblocks.com/block/${tx.blockId}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center"
                                    >
                                      {tx.blockHeight}
                                      <ExternalLink size={12} className="ml-1" />
                                    </a>
                                  </div>
                                </>
                              )}
                              {tx.totalValueTransferred !== '0' && (
                                <>
                                  <div className="font-medium">Total Value Transferred:</div>
                                  <div>{formatValue(tx.totalValueTransferred)} {tx.tokenSymbol}</div>
                                </>
                              )}
                              <div className="font-medium">RC Used:</div>
                              <div>{tx.rc_used}</div>
                            </div>
                          </div>

                          {tx.operations.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Operations</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Contract</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Arguments</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {tx.operations.map((op: FormattedOperation, opIndex: number) => (
                                    <TableRow key={opIndex}>
                                      <TableCell>
                                        {op.type}
                                      </TableCell>
                                      <TableCell className="font-mono">
                                        {op.contract ? (
                                          <a 
                                            href={`https://koinosblocks.com/address/${op.contract}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline flex items-center"
                                          >
                                            {shortenAddress(op.contract)}
                                            <ExternalLink size={12} className="ml-1" />
                                          </a>
                                        ) : '-'}
                                      </TableCell>
                                      <TableCell>
                                        {op.method || '-'}
                                      </TableCell>
                                      <TableCell className="max-w-xs truncate">
                                        {op.args ? (
                                          <pre className="text-xs overflow-auto max-h-20">
                                            {JSON.stringify(op.args, null, 2)}
                                          </pre>
                                        ) : '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}

                          {tx.events.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Events</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Data</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {tx.events.map((event: TransactionEvent, eventIndex: number) => (
                                    <TableRow key={eventIndex}>
                                      <TableCell>{event.name}</TableCell>
                                      <TableCell className="font-mono">
                                        <a 
                                          href={`https://koinosblocks.com/address/${event.source}`} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline flex items-center"
                                        >
                                          {shortenAddress(event.source)}
                                          <ExternalLink size={12} className="ml-1" />
                                        </a>
                                      </TableCell>
                                      <TableCell className="max-w-xs truncate">
                                        <pre className="text-xs overflow-auto max-h-20">
                                          {JSON.stringify(event.data, null, 2)}
                                        </pre>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </>
            )}
          </>
        )}
      </CardContent>

      {transactions.length > 0 && (
        <CardFooter className="flex justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Page {page} · {limit} per page · {totalTransactions}+ total transactions
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
              disabled={!hasMore || loading}
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