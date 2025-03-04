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
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [balance, setBalance] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  
  // Constants
  const ITEMS_PER_PAGE = 10;
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
        console.log(`Fetching transactions for ${address || "all accounts"}, page ${pageNumber}, items per page: ${ITEMS_PER_PAGE}, ascending: ${ascending}`);
        
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

        const response = await getDetailedAccountHistory(
          address || "",
          ITEMS_PER_PAGE,
          ascending,
          true, // irreversible
          sequenceNumberParam
        );

        console.log(`Received ${response.length} transactions for page ${pageNumber}`);
        
        // Format the transactions for display
        const formattedTransactions = await formatDetailedTransactions(response);
        
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
                formattedTransactions,
              },
            };
          }
          return prev;
        });

        // Update hasMore flag
        setHasMore(response.length === ITEMS_PER_PAGE);
        
        setTransactions(response);
        setFormattedTransactions(formattedTransactions);
        setTotalTransactions(prev => prev + response.length);
        
        setLoading(false);
        return response; // Return the response to allow promise chaining
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to fetch transactions');
        setLoading(false);
        throw err; // Re-throw to allow promise chaining
      }
    },
    [address, ITEMS_PER_PAGE, ascending]
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
      setPaginationHistory({});
      setHasMore(true);
      setTotalTransactions(0);
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
    setLimit(newLimit);
  };

  // Handle filter change
  const handleFilterChange = (value: string) => {
    setSelectedFilter(value);
    setPage(1);
    setPaginationHistory({});
    setTransactions([]);
    setFormattedTransactions([]);
    setTotalTransactions(0);
    
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
            <span>Found {memoizedData.transactions.length} transactions for address {formatHex(address)}</span>
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
            {memoizedData.transactions.length > 0 && (
              <span className="text-sm text-muted-foreground">
                Showing {memoizedData.formattedTransactions.length} of {memoizedData.transactions.length} transactions
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