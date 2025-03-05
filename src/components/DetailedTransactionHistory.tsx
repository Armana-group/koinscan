"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

type PaginationHistoryItem = {
  transactions: DetailedTransaction[];
  formattedTransactions: any[];
};

interface DetailedTransactionHistoryProps {
  address?: string;
  contractId?: string;
  transactionType?: string;
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

export function DetailedTransactionHistory({ 
  address,
  contractId = "", 
  transactionType = ""
}: DetailedTransactionHistoryProps) {
  const [transactions, setTransactions] = useState<DetailedTransaction[]>([]);
  const [formattedTransactions, setFormattedTransactions] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalTransactionCount, setTotalTransactionCount] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  
  // Constants
  const [limit, setLimit] = useState<number>(10);
  const [ascending, setAscending] = useState<boolean>(false); // Default to descending order (newest first)
  
  // Add state for token balance
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [tokenSymbol, setTokenSymbol] = useState<string>('KOIN');
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  
  // Add state for pagination
  const [paginationHistory, setPaginationHistory] = useState<{[page: number]: {
    transactions: DetailedTransaction[],
    formattedTransactions: FormattedTransaction[]
  }}>({});
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  // Use refs to track if we've already started fetching
  const fetchingRef = useRef<boolean>(false);
  const paginationRef = useRef(paginationHistory);
  
  // Update the ref when the state changes
  useEffect(() => {
    paginationRef.current = paginationHistory;
  }, [paginationHistory]);

  // Memoize data to prevent unnecessary rerenders
  const memoizedData = useMemo(() => {
    return {
      transactions,
      formattedTransactions,
    };
  }, [transactions, formattedTransactions]);

  // Define fetchTransactions with useCallback
  const fetchTransactions = useCallback(
    async (pageNumber: number) => {
      setLoading(true);
      setError(null);

      try {
        console.log(`Fetching transactions for ${address || "all accounts"}, page ${pageNumber}, items per page: ${limit}, ascending: ${ascending}`);
        
        // Get the sequence number from the last transaction of the previous page if available
        let sequenceNumberParam: string | undefined = undefined;
        
        if (pageNumber > 1 && paginationRef.current[pageNumber - 1]?.transactions?.length > 0) {
          const lastTransaction = paginationRef.current[pageNumber - 1].transactions[paginationRef.current[pageNumber - 1].transactions.length - 1];
          
          if (lastTransaction.seq_num) {
            // Important: Decrement the sequence number to get the next page
            const seqNumAsNumber = parseInt(lastTransaction.seq_num, 10);
            if (!isNaN(seqNumAsNumber)) {
              sequenceNumberParam = (seqNumAsNumber - 1).toString();
              console.log(`Using sequence number ${sequenceNumberParam} from last transaction of previous page`);
            } else {
              console.warn(`Invalid sequence number format: ${lastTransaction.seq_num}`);
            }
          } else {
            console.warn("Last transaction doesn't have seq_num");
          }
        }

        // Make sure we're using the current limit value
        const currentLimit = limit;
        console.log(`Making API request with limit=${currentLimit}`);
        
        const response = await getDetailedAccountHistory(
          address || "",
          currentLimit,
          ascending,
          true, // irreversible
          sequenceNumberParam
        );

        console.log(`Received ${response.length} transactions for page ${pageNumber}`);
        
        // If this is the first page and we're in descending order (newest first),
        // use the seq_num of the first transaction to determine total count
        if (pageNumber === 1 && !ascending && response.length > 0 && response[0].seq_num) {
          const firstTxSeqNum = parseInt(response[0].seq_num, 10);
          if (!isNaN(firstTxSeqNum)) {
            console.log(`First transaction has seq_num ${firstTxSeqNum}, using as total count`);
            setTotalTransactionCount(firstTxSeqNum);
          }
        }
        
        // Format the transactions for display
        const formattedTransactions = await formatDetailedTransactions(response);
        
        // Enrich the transactions with timestamps
        const enrichedTransactions = await enrichTransactionsWithTimestamps(formattedTransactions);
        console.log('Enriched transactions with timestamps:', enrichedTransactions);
        
        // Only update the state if we're still on the same page
        // to avoid issues with rapid page changes
        // Add to pagination history without triggering a rerender of the fetchTransactions function
        setPaginationHistory(prev => {
          // Only update if this page data doesn't already exist
          if (!prev[pageNumber]) {
            return {
              ...prev,
              [pageNumber]: {
                transactions: response,
                formattedTransactions: enrichedTransactions,
              },
            };
          }
          return prev;
        });

        // Update hasMore flag
        setHasMore(response.length === limit);
        
        setTransactions(response);
        setFormattedTransactions(enrichedTransactions);
        
        setLoading(false);
        return response; // Return the response to allow promise chaining
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to fetch transactions');
        setLoading(false);
        throw err; // Re-throw to allow promise chaining
      }
    },
    [address, limit, ascending]
  );

  // Fetch token balance when address changes
  useEffect(() => {
    if (address) {
      fetchTokenBalance(address);
    }
  }, [address]);

  // Fetch transactions when address changes or when limit/ascending changes
  useEffect(() => {
    if (address && !fetchingRef.current) {
      fetchingRef.current = true;
      // Reset pagination when address, limit, or ascending changes
      setPage(1);
      fetchTransactions(1).finally(() => {
        fetchingRef.current = false;
      });
    }
  }, [address, fetchTransactions, limit, ascending]);

  // Fetch transactions when page changes
  useEffect(() => {
    if (address && page > 1 && !fetchingRef.current) {
      // Check if we already have data for this page
      if (paginationRef.current[page]) {
        console.log('Using cached data for page', page);
        setTransactions(paginationRef.current[page].transactions);
        setFormattedTransactions(paginationRef.current[page].formattedTransactions);
      } else {
        fetchingRef.current = true;
        // Fetch next page using sequence number from previous page
        const prevPage = page - 1;
        if (paginationRef.current[prevPage] && paginationRef.current[prevPage].transactions.length > 0) {
          // IMPORTANT: We need to use the sequence number from the LAST transaction of the previous page
          const lastTx = paginationRef.current[prevPage].transactions[paginationRef.current[prevPage].transactions.length - 1];
          const sequenceNumber = lastTx.seq_num;
          
          console.log('Fetching page', page, 'with sequence number', sequenceNumber);
          fetchTransactions(page).finally(() => {
            fetchingRef.current = false;
          });
        } else {
          console.error('No sequence number available for previous page:', prevPage);
          toast.error("Could not load next page. Missing sequence number.");
          fetchingRef.current = false;
        }
      }
    }
  }, [page, address, fetchTransactions]);

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
    } catch (e: unknown) {
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
    // Only take action if the limit actually changed
    if (newLimit !== limit) {
      console.log(`Changing transactions per page from ${limit} to ${newLimit}`);
      
      // Update the limit state
      setLimit(newLimit);
      
      // Reset all pagination and transaction state
      setPage(1);
      setPaginationHistory({});
      setTransactions([]);
      setFormattedTransactions([]);
      setHasMore(true);
      
      // Reset loading state to show loading indicator
      setLoading(true);
      
      // Ensure a fresh fetch - need small timeout to ensure state updates first
      setTimeout(() => {
        // Ensure we're not already fetching
        fetchingRef.current = false;
        
        // Fetch transactions with new limit
        if (address) {
          console.log(`Fetching first page with new limit: ${newLimit}`);
          fetchTransactions(1).catch(err => {
            console.error('Error fetching transactions with new limit:', err);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      }, 0);
    }
  };

  // Handle filter change
  const handleFilterChange = (value: string) => {
    setSelectedFilter(value);
    setPage(1);
    setPaginationHistory({});
    setTransactions([]);
    setFormattedTransactions([]);
    setHasMore(true);
    
    // Fetch transactions with selected filter
    fetchTransactions(1);
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
            <span>
              {totalTransactionCount 
                ? `Found ${transactions.length} of ${totalTransactionCount} transactions for address ${formatHex(address)}`
                : `Found ${transactions.length} transactions for address ${formatHex(address)}`
              }
            </span>
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
                    {totalTransactionCount 
                      ? `Showing ${formattedTransactions.length} of ${totalTransactionCount} transactions${formattedTransactions.filter(tx => tx.totalValueTransferred && parseFloat(tx.totalValueTransferred) > 0).length > 0 
                          ? ` with ${formattedTransactions.filter(tx => tx.totalValueTransferred && parseFloat(tx.totalValueTransferred) > 0).length} transfers` 
                          : ''}`
                      : `Showing ${formattedTransactions.length} transactions${formattedTransactions.filter(tx => tx.totalValueTransferred && parseFloat(tx.totalValueTransferred) > 0).length > 0 
                          ? ` with ${formattedTransactions.filter(tx => tx.totalValueTransferred && parseFloat(tx.totalValueTransferred) > 0).length} transfers` 
                          : ''}`
                    }
                  </p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  {formattedTransactions.slice(0, limit).map((tx, index) => (
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
                            {tx.events.some((e: TransactionEvent) => e.name.includes('transfer_event')) && (
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
              Page {page} · {limit} per page · {totalTransactionCount ? totalTransactionCount : formattedTransactions.length} total transactions
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