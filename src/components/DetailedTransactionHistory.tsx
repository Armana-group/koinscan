"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  getDetailedAccountHistory, 
  formatDetailedTransactions, 
  enrichTransactionsWithTimestamps,
  DetailedTransaction,
  TransactionEvent,
  getTokenBalance,
  shortenAddress,
  TransactionAction
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
  Coins,
  RotateCw,
  ArrowUpRight,
  ArrowDownLeft,
  Flame,
  Plus,
  Repeat,
  Lock,
  Unlock,
  AppWindow,
  Filter,
  AlertCircle,
  ArrowRightLeft,
  BadgeIcon,
  Component,
  FileUpIcon,
  FileUp,
  VoteIcon,
  BarChart4,
  Minus
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
import {
  Alert,
  AlertTitle,
  AlertDescription
} from "@/components/ui/alert";
import { formatTokenAmount, getTokenBySymbol } from '@/lib/tokens';
import { useWallet } from '@/contexts/WalletContext';

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
  tokenTransfers?: Record<string, string>;
  tags: string[];
  primaryTag?: string;
  actions?: TransactionAction[];
}

// Custom styles to remove all borders
const noBorderStyles = {
  borderWidth: "0 !important",
  borderColor: "transparent !important",
  boxShadow: "none !important"
};

// Add a consistent button style object
const buttonBaseStyle = {
  borderWidth: "0 !important",
  borderColor: "transparent !important",
  boxShadow: "none !important",
  height: "32px",
  padding: "0 12px",
  borderRadius: "6px",
  transition: "all 0.2s ease"
};

// Style for filter buttons in "default" state
const activeButtonStyle = {
  ...buttonBaseStyle,
  backgroundColor: "var(--primary) !important",
  color: "white !important",
  textShadow: "0px 0px 1px rgba(0, 0, 0, 0.5)",
  border: "1px solid var(--primary) !important",
  fontWeight: "600",
  boxShadow: "0 0 0 1px var(--primary), 0 0 0 3px rgba(var(--primary-rgb), 0.25) !important"
};

// Style for filter buttons in "outline" state
const inactiveButtonStyle = {
  ...buttonBaseStyle,
  backgroundColor: "rgba(255, 255, 255, 0.05) !important",
  color: "hsl(var(--muted-foreground)) !important",
  border: "1px solid rgba(255, 255, 255, 0.1) !important",
  fontWeight: "400"
};

// Add specific styles for count tags
const countTagStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "9999px",
  padding: "0 6px",
  fontSize: "10px",
  height: "18px",
  marginLeft: "4px",
  transition: "all 0.2s ease"
};

// Active count tag style
const activeCountTagStyle = {
  ...countTagStyle,
  backgroundColor: "rgba(255, 255, 255, 0.25)",
  color: "white",
  fontWeight: "600"
};

// Inactive count tag style
const inactiveCountTagStyle = {
  ...countTagStyle,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  color: "hsl(var(--muted-foreground))",
  fontWeight: "400"
};

// CSS variables for consistent styling
const cssVariables = {
  "--primary-button-bg": "var(--primary)",
  "--primary-button-text": "white",
  "--secondary-button-bg": "transparent",
  "--secondary-button-text": "var(--foreground)",
  "--button-border-radius": "6px",
  "--button-height": "32px",
  "--button-font-size": "12px",
  "--primary-rgb": "37, 99, 235" // RGB value equivalent of blue-600
};

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
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  
  // Constants
  const [limit, setLimit] = useState<number>(10);
  const [ascending, setAscending] = useState<boolean>(false); // Default to descending order (newest first)
  
  // Add state for token balances
  const [koinBalance, setKoinBalance] = useState<string>('0');
  const [vhpBalance, setVhpBalance] = useState<string>('0');
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  
  // Maintain tokenBalance and tokenSymbol for backward compatibility
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [tokenSymbol, setTokenSymbol] = useState<string>('KOIN');
  
  // Add state for pagination
  const [paginationHistory, setPaginationHistory] = useState<{[page: number]: {
    transactions: DetailedTransaction[],
    formattedTransactions: FormattedTransaction[]
  }}>({});
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  // Use refs to track if we've already started fetching
  const fetchingRef = useRef<boolean>(false);
  const paginationRef = useRef(paginationHistory);
  const { rpcNode } = useWallet();
  
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
          rpcNode,
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
        const formattedTransactions = await formatDetailedTransactions(response, address);
        console.log(`Formatted transactions with address: ${address}`, formattedTransactions);
        
        // Enrich the transactions with timestamps
        const enrichedTransactions = await enrichTransactionsWithTimestamps(rpcNode, formattedTransactions);
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
        // Don't set error for empty wallets - instead we'll just show a friendly message
        // when transactions.length === 0
        setTransactions([]);
        setFormattedTransactions([]);
        setLoading(false);
        return []; // Return empty array to allow promise chaining
      }
    },
    [address, limit, ascending, rpcNode]
  );

  // Update function to fetch both token balances
  const fetchTokenBalances = async (accountAddress: string) => {
    setLoadingBalance(true);
    try {
      // Fetch KOIN balance
      const koinBalanceValue = await getTokenBalance(rpcNode, accountAddress, 'koin');
      setKoinBalance(koinBalanceValue);
      setTokenBalance(koinBalanceValue); // Keep this for backward compatibility
      
      // Fetch VHP balance
      const vhpBalanceValue = await getTokenBalance(rpcNode, accountAddress, 'vhp');
      setVhpBalance(vhpBalanceValue);
    } catch (err) {
      console.error('Error fetching token balances:', err);
      toast.error("Failed to fetch token balances. Please try again.");
    } finally {
      setLoadingBalance(false);
    }
  };

  // Fetch transactions when address changes or when limit/ascending changes
  useEffect(() => {
    console.log('[DetailedTransactionHistory] useEffect triggered:', { address, rpcNode, fetchingRef: fetchingRef.current });
    if (address && rpcNode && !fetchingRef.current) {
      console.log('[DetailedTransactionHistory] Starting fetch for address:', address);
      fetchingRef.current = true;
      // Reset pagination when address, limit, or ascending changes
      setPage(1);
      fetchTransactions(1).finally(() => {
        fetchingRef.current = false;
        console.log('[DetailedTransactionHistory] Fetch completed');
      });
    } else {
      console.log('[DetailedTransactionHistory] Skipping fetch - conditions not met:', {
        hasAddress: !!address,
        hasRpcNode: !!rpcNode,
        isFetching: fetchingRef.current
      });
    }
  }, [address, fetchTransactions, limit, ascending, rpcNode]);

  // Fetch transactions when page changes
  useEffect(() => {
    // Skip if no address or we're on the first page (which is handled by the other useEffect)
    if (!address || page <= 0) return;
    
    console.log(`Page state changed to: ${page}`);
    
    // If we're on page 1, the first useEffect handles it
    if (page === 1) return;
    
    // Check if we already have data for this page in our cache
    if (paginationRef.current[page]) {
      console.log('Using cached data for page', page);
      setTransactions(paginationRef.current[page].transactions);
      setFormattedTransactions(paginationRef.current[page].formattedTransactions);
      return;
    }
    
    // We need to fetch data for this page
    // Don't fetch if we're already fetching
    if (fetchingRef.current) {
      console.log('Already fetching, skipping duplicate fetch');
      return;
    }
    
    console.log(`Fetching data for page ${page}`);
    fetchingRef.current = true;
    
    // Check if we have data for the previous page to get the sequence number
    const prevPage = page - 1;
    if (paginationRef.current[prevPage] && 
        paginationRef.current[prevPage].transactions && 
        paginationRef.current[prevPage].transactions.length > 0) {
      
      // IMPORTANT: We need to use the sequence number from the LAST transaction of the previous page
      const lastTx = paginationRef.current[prevPage].transactions[paginationRef.current[prevPage].transactions.length - 1];
      
      if (lastTx.seq_num) {
        console.log('Fetching page', page, 'with sequence number from previous page:', lastTx.seq_num);
        fetchTransactions(page)
          .then(() => {
            console.log(`Finished loading page ${page}`);
          })
          .catch((err) => {
            console.error(`Error loading page ${page}:`, err);
            toast.error(`Failed to load page ${page}. Please try again.`);
          })
          .finally(() => {
            fetchingRef.current = false;
          });
      } else {
        console.error('No sequence number available for the last transaction of previous page:', prevPage);
        toast.error("Could not load next page. Missing sequence number.");
        fetchingRef.current = false;
      }
    } else {
      // If we don't have data for the previous page, try to fetch this page directly
      // This is a fallback and might not work correctly in all cases
      console.warn(`No data for previous page ${prevPage}, fetching page ${page} directly`);
      fetchTransactions(page)
        .finally(() => {
          fetchingRef.current = false;
        });
    }
  }, [page, address, fetchTransactions]);

  // Replace fetchTokenBalance with fetchTokenBalances in useEffect
  useEffect(() => {
    if (address && rpcNode) {
      fetchTokenBalances(address);
    }
  }, [address, rpcNode]);

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

  const formatValue = (value: string, tokenSymbol: string = 'KOIN') => {
    try {
      // For simplicity, we'll use a default decimals of 8
      // This is synchronous and won't cause issues with React rendering
      const decimals = 8;
      
      // Use our token service formatting function
      return formatTokenAmount(value, decimals);
    } catch (e) {
      console.error('Error formatting value:', e);
      return value;
    }
  };

  const renderOperationSummary = (operation: FormattedOperation) => {
    if (operation.type === 'Contract Call') {
      if (operation.method === 'transfer' && operation.args) {
        const { from, to, value } = operation.args;
        return (
          <span>
            Transfer {formatValue(value)} from {shortenAddress(from || '')} to {shortenAddress(to || '')}
          </span>
        );
      } 
      else if (operation.method === 'balanceOf' && operation.args) {
        const { owner } = operation.args;
        return (
          <span>
            Check balance of {shortenAddress(owner || '')}
          </span>
        );
      }
      else if (operation.method === 'mint' && operation.args) {
        const { to, value } = operation.args;
        return (
          <span>
            Mint {formatValue(value)} to {shortenAddress(to || '')}
          </span>
        );
      }
      else if (operation.method === 'burn' && operation.args) {
        const { from, value } = operation.args;
        return (
          <span>
            Burn {formatValue(value)} from {shortenAddress(from || '')}
          </span>
        );
      }
      else if (operation.method === 'name' || operation.method === 'symbol' || operation.method === 'decimals' || operation.method === 'totalSupply') {
        return (
          <span>
            Query token {operation.method}
          </span>
        );
      }
      else if (operation.method === 'propose' && operation.args) {
        return (
          <span>
            Create governance proposal
          </span>
        );
      }
      else if (operation.method === 'vote' && operation.args) {
        return (
          <span>
            Vote on proposal
          </span>
        );
      }
      else if (typeof operation.method === 'string' && operation.method.startsWith('method(')) {
        return `Call ${operation.method} on contract ${shortenAddress(operation.contract || '')}`;
      }
      
      return `${operation.method} on contract ${shortenAddress(operation.contract || '')}`;
    }
    return operation.type;
  };

  const renderEventSummary = (event: TransactionEvent) => {
    if (event.name.includes('transfer_event') && event.data) {
      const { from, to, value } = event.data;
      const contract = shortenAddress(event.source || '');
      
      // Try to determine token symbol
      let tokenSymbol = 'tokens';
      if (event.source) {
        const tokenContracts: Record<string, string> = {
          '15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL': 'KOIN',
          '1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju': 'VHP',
          // Add more token contracts as needed
        };
        
        if (tokenContracts[event.source]) {
          tokenSymbol = tokenContracts[event.source];
        }
      }
      
      return (
        <span>
          Transfer {formatValue(value)} {tokenSymbol} from {shortenAddress(from || '')} to {shortenAddress(to || '')}
        </span>
      );
    }
    
    // Handle mint events
    if (event.name.includes('mint_event') && event.data) {
      const { to, value } = event.data;
      const contract = shortenAddress(event.source || '');
      return (
        <span>
          Mint {formatValue(value)} to {shortenAddress(to || '')}
        </span>
      );
    }
    
    // Handle burn events
    if (event.name.includes('burn_event') && event.data) {
      const { from, value } = event.data;
      const contract = shortenAddress(event.source || '');
      return (
        <span>
          Burn {formatValue(value)} from {shortenAddress(from || '')}
        </span>
      );
    }
    
    // Format the event name for better readability
    const formattedName = event.name
      .replace('koinos.contracts.', '')
      .replace('_event', ' event')
      .replace(/\./g, ' ');
      
    return (
      <span className="capitalize">
        {formattedName}
      </span>
    );
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

  // Define tag-related state
  const [availableTags, setAvailableTags] = useState<{tag: string, count: number}[]>([]);

  // Update filter handler to work with the simplified filter options
  const handleFilterChange = (filterType: string) => {
    console.log(`Filter selection change: ${filterType}`);
    
    // Special case for "all" which clears all other filters
    if (filterType === "all") {
      setSelectedFilters([]);
      setPage(1);
      setTimeout(() => fetchTransactions(1), 0);
      return;
    }
    
    // Handle the specific filter options
    let newFilters: string[] = [];
    
    switch (filterType) {
      case "sent":
        newFilters = selectedFilters.includes('sent') 
          ? selectedFilters.filter(f => f !== 'sent')
          : [...selectedFilters.filter(f => f !== 'received' && f !== 'mint' && f !== 'interacted'), 'sent'];
        break;
        
      case "received":
        newFilters = selectedFilters.includes('received') 
          ? selectedFilters.filter(f => f !== 'received')
          : [...selectedFilters.filter(f => f !== 'sent' && f !== 'mint' && f !== 'interacted'), 'received'];
        break;
        
      case "mint":
        newFilters = selectedFilters.includes('mint') 
          ? selectedFilters.filter(f => f !== 'mint')
          : [...selectedFilters.filter(f => f !== 'sent' && f !== 'received' && f !== 'interacted'), 'mint'];
        break;
        
      case "dapps":
        newFilters = selectedFilters.includes('interacted') 
          ? selectedFilters.filter(f => f !== 'interacted')
          : [...selectedFilters.filter(f => f !== 'sent' && f !== 'received' && f !== 'mint'), 'interacted'];
        break;
        
      default:
        // For any other filter type, just toggle it
        newFilters = selectedFilters.includes(filterType)
          ? selectedFilters.filter(f => f !== filterType)
          : [...selectedFilters, filterType];
    }
    
    setSelectedFilters(newFilters);
    
    // Reset to first page
    setPage(1);
    
    // Wait for state updates
    setTimeout(() => fetchTransactions(1), 0);
  };

  // Extract all unique tags from transactions
  useEffect(() => {
    if (formattedTransactions.length > 0) {
      // Count occurrences of each tag
      const tagCounts: Record<string, number> = {};
      
      formattedTransactions.forEach((tx: FormattedTransaction) => {
        if (tx.tags && tx.tags.length > 0) {
          tx.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });
      
      // Convert to array and sort by count (descending)
      const sortedTags = Object.entries(tagCounts)
        .map(([tag, count]): {tag: string, count: number} => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
      
      setAvailableTags(sortedTags);
    }
  }, [formattedTransactions]);
  
  // Simplified filtered transactions logic
  const filteredTransactions = useMemo(() => {
    console.log(`Calculating filtered transactions with selectedFilters:`, selectedFilters);
    
    if (selectedFilters.length === 0) {
      return formattedTransactions; // Show all when no filters selected
    }
    
    return formattedTransactions.filter(tx => {
      // Transaction matches if any of its tags match any selected filter
      return tx.tags && tx.tags.some((tag: string) => selectedFilters.includes(tag));
    });
  }, [formattedTransactions, selectedFilters]);

  // New helper function to get the appropriate icon for a transaction type
  const getTransactionIcon = (actionType: string) => {
    switch (actionType) {
      case 'sent':
        return <ArrowUpRight className="h-5 w-5 text-orange-500" />;
      case 'received':
        return <ArrowDownLeft className="h-5 w-5 text-green-500" />;
      case 'staked':
        return <Lock className="h-5 w-5 text-blue-500" />;
      case 'unstaked':
        return <Unlock className="h-5 w-5 text-blue-500" />;
      case 'minted':
        return <Plus className="h-5 w-5 text-purple-500" />;
      case 'burned':
        return <Flame className="h-5 w-5 text-red-500" />;
      case 'swapped':
        return <Repeat className="h-5 w-5 text-indigo-500" />;
      case 'interacted':
        return <AppWindow className="h-5 w-5 text-slate-500" />;
      default:
        return <Layers className="h-5 w-5 text-slate-500" />;
    }
  };

  // Helper to get appropriate color classes based on transaction type
  const getTransactionColorClasses = (actionType: string) => {
    switch (actionType) {
      case 'sent':
        return 'border-orange-200 dark:border-orange-900';
      case 'received':
        return 'border-green-200 dark:border-green-900';
      case 'staked':
      case 'unstaked':
        return 'border-blue-200 dark:border-blue-900';
      case 'minted':
        return 'border-purple-200 dark:border-purple-900';
      case 'burned':
        return 'border-red-200 dark:border-red-900';
      case 'swapped':
        return 'border-indigo-200 dark:border-indigo-900';
      default:
        return 'border-slate-200 dark:border-slate-800';
    }
  };

  // Format relative time like "2 hours ago" or "Yesterday"
  const formatRelativeTime = (timestamp: string) => {
    if (!timestamp) return '';
    
    const date = new Date(parseInt(timestamp));
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    
    // Fall back to regular date format for older dates
    return formatDate(timestamp);
  };

  // Minimal TransactionRow component
  const TransactionRow: React.FC<{
    tx: FormattedTransaction;
    isExpanded: boolean;
    toggleExpand: () => void;
  }> = ({ tx, isExpanded, toggleExpand }) => {
    const actions = tx.actions || [];
    const primaryAction = actions[0] || { type: 'other', description: 'Transaction' };

    // Get the primary token transfer for display
    const primaryTransfer = primaryAction.tokenTransfers?.[0];
    const isReceive = primaryTransfer?.isPositive;
    const isSend = primaryTransfer && !primaryTransfer.isPositive;

    // Determine transaction type icon and styling
    const getTypeIcon = () => {
      switch(primaryAction.type) {
        case 'token_transfer':
          return isReceive ? ArrowDownLeft : ArrowUpRight;
        case 'token_mint':
          return Plus;
        case 'token_burn':
          return Flame;
        case 'contract_interaction':
          return Component;
        case 'contract_upload':
          return FileUp;
        case 'governance':
          return BarChart4;
        default:
          return Layers;
      }
    };

    const TypeIcon = getTypeIcon();

    // Get amount color class
    const getAmountColor = () => {
      if (primaryAction.type === 'token_mint' || isReceive) return 'text-green-600 dark:text-green-400';
      if (primaryAction.type === 'token_burn' || isSend) return 'text-orange-600 dark:text-orange-400';
      return 'text-foreground';
    };

    // Get icon color class
    const getIconColor = () => {
      if (primaryAction.type === 'token_mint' || isReceive) return 'text-green-600 dark:text-green-400';
      if (primaryAction.type === 'token_burn') return 'text-red-500';
      if (isSend) return 'text-orange-600 dark:text-orange-400';
      if (primaryAction.type === 'contract_interaction') return 'text-purple-600 dark:text-purple-400';
      if (primaryAction.type === 'governance') return 'text-indigo-600 dark:text-indigo-400';
      return 'text-muted-foreground';
    };

    // Format amount with +/- prefix
    const formatAmount = () => {
      if (!primaryTransfer) return null;
      const prefix = isReceive ? '+' : '-';
      return `${prefix}${primaryTransfer.formattedAmount} ${primaryTransfer.token.symbol}`;
    };

    // Get counterparty address
    const getCounterparty = () => {
      if (!primaryTransfer) return null;
      if (isReceive) return primaryTransfer.from;
      return primaryTransfer.to;
    };

    // Get counterparty label
    const getCounterpartyLabel = () => {
      if (!primaryTransfer) return null;
      return isReceive ? 'from' : 'to';
    };

    // Get token image URL
    const getTokenImage = () => {
      if (primaryTransfer?.token.logoURI) return primaryTransfer.token.logoURI;
      if (primaryTransfer?.token.address) {
        const symbol = primaryTransfer.token.symbol?.toLowerCase();
        if (symbol === 'koin' || symbol === 'vhp') {
          return `https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/${symbol}.png`;
        }
      }
      return null;
    };

    const tokenImage = getTokenImage();
    const counterparty = getCounterparty();
    const counterpartyLabel = getCounterpartyLabel();
    const amount = formatAmount();
    const relativeTime = tx.timestamp ? formatRelativeTime(tx.timestamp) : '...';

    // Get action label for non-transfer transactions
    const getActionLabel = () => {
      switch(primaryAction.type) {
        case 'token_mint': return 'Minted';
        case 'token_burn': return 'Burned';
        case 'contract_interaction': return primaryAction.dappName || 'Contract';
        case 'contract_upload': return 'Deployed';
        case 'governance': return 'Governance';
        default: return primaryAction.description || 'Transaction';
      }
    };

    return (
      <div className={`border-b border-border/50 last:border-b-0 ${isExpanded ? 'bg-muted/30' : ''}`}>
        {/* Main row - minimal design */}
        <div
          className="py-4 px-2 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors"
          onClick={toggleExpand}
        >
          {/* Left: Icon + Amount/Action */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Type Icon */}
            <div className="flex-shrink-0">
              <TypeIcon className={`h-5 w-5 ${getIconColor()}`} />
            </div>

            {/* Token Icon (if available) */}
            {tokenImage && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden bg-muted">
                <img
                  src={tokenImage}
                  alt={primaryTransfer?.token.symbol || 'token'}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            {/* Amount or Action */}
            <div className="min-w-0 flex-1">
              {amount ? (
                <div className={`font-semibold text-base ${getAmountColor()}`}>
                  {amount}
                </div>
              ) : (
                <div className="font-medium text-base">
                  {getActionLabel()}
                </div>
              )}

              {/* Counterparty */}
              {counterparty && (
                <div className="text-xs text-muted-foreground truncate">
                  {counterpartyLabel} {shortenAddress(counterparty)}
                </div>
              )}
            </div>
          </div>

          {/* Right: Time + Expand */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <span className="text-xs text-muted-foreground">{relativeTime}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Expanded details - clean grid */}
        {isExpanded && (
          <div className="px-2 pb-4 pt-2 border-t border-border/30">
            <div className="grid gap-3 text-sm">
              {/* Transaction ID */}
              <div className="flex items-start gap-2">
                <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="font-mono text-xs break-all text-muted-foreground">{tx.id}</span>
              </div>

              {/* All token transfers */}
              {actions.map((action, i) =>
                action.tokenTransfers?.map((transfer, j) => (
                  <div key={`${i}-${j}`} className="flex items-center gap-2 pl-6">
                    <span className={`font-medium ${transfer.isPositive ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {transfer.isPositive ? '+' : '-'}{transfer.formattedAmount} {transfer.token.symbol}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {transfer.isPositive ? 'from' : 'to'} {shortenAddress(transfer.isPositive ? transfer.from : transfer.to)}
                    </span>
                  </div>
                ))
              )}

              {/* Mana used */}
              <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
                <Flame className="h-3 w-3" />
                <span>{formatTokenAmount(tx.rc_used, 8)} mana</span>
              </div>

              {/* Block info */}
              {tx.blockId && (
                <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
                  <Layers className="h-3 w-3" />
                  <span>Block {shortenAddress(tx.blockId)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!address) return null;

  return (
    <Card className="bg-transparent shadow-none border-none" style={{...noBorderStyles, ...cssVariables}}>
      <CardHeader className="px-0">
        <CardTitle>Transaction History</CardTitle>
        <CardDescription className="flex flex-col sm:flex-row justify-between items-start gap-3 text-muted-foreground">
          <div>
            <div className="flex items-center gap-1">
              <span className="font-medium">KOIN balance:</span>
              {loadingBalance ? (
                <Skeleton className="h-4 w-20 bg-muted" />
              ) : (
                <span>{koinBalance} KOIN</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">VHP balance:</span>
              {loadingBalance ? (
                <Skeleton className="h-4 w-20 bg-muted" />
              ) : (
                <span>{vhpBalance} VHP</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="per-page" className="text-sm">Items per page:</label>
            <Select value={limit.toString()} onValueChange={(val) => handleLimitChange(parseInt(val))}>
              <SelectTrigger 
                id="per-page" 
                className="h-7 w-16 text-xs bg-background rounded-md border-none flex items-center justify-between"
                style={{
                  ...noBorderStyles,
                  height: "28px",
                  borderRadius: "6px",
                  backgroundColor: "transparent",
                  padding: "0 8px",
                  fontSize: "12px"
                }}
              >
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 pb-2">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
              <div className="text-center py-8">
                <div className="mb-4">
                  <Coins className="h-12 w-12 mx-auto text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-medium mb-2">No transactions found</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  This wallet address has not yet participated in any transactions on the blockchain. When transactions occur, they will appear here automatically.
                </p>
                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSelectedFilters([]);
                      fetchTransactions(1);
                    }}
                    className="h-8 text-xs flex items-center justify-center rounded-md bg-background border-none"
                    style={inactiveButtonStyle}
                  >
                    Refresh
                  </Button>
                </div>
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

                <div className="flex flex-col space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">View:</span>
                      <Select value={selectedFilters.length > 0 ? "filtered" : "all"} onValueChange={handleFilterChange}>
                        <SelectTrigger 
                          className="h-8 text-xs bg-background rounded-md border-none flex items-center justify-between"
                          style={{
                            ...noBorderStyles,
                            height: "28px",
                            borderRadius: "6px",
                            backgroundColor: "transparent",
                            padding: "0 8px",
                            fontSize: "12px"
                          }}
                        >
                          <SelectValue placeholder={selectedFilters.length > 0 ? `Filtered (${selectedFilters.length})` : "All transactions"} />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="all">All transactions</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="mint">Mint</SelectItem>
                          <SelectItem value="dapps">dApps</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setAscending(!ascending)}
                        className="h-8 text-xs flex items-center justify-center rounded-md bg-background border-none"
                        style={inactiveButtonStyle}
                      >
                        {ascending ? (
                          <ChevronUp className="h-4 w-4 mr-1" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-1" />
                        )}
                        {ascending ? "Oldest first" : "Newest first"}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fetchTransactions(1)}
                        className="h-8 w-8 flex items-center justify-center rounded-md bg-background border-none p-0"
                        style={inactiveButtonStyle}
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Button
                      variant={selectedFilters.length === 0 ? "default" : "outline"}
                      size="sm"
                      className={`h-8 text-xs flex items-center justify-center rounded-md 
                        ${selectedFilters.length === 0 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "bg-muted/30 hover:bg-muted/50 text-muted-foreground"}`}
                      onClick={() => handleFilterChange("all")}
                    >
                      All types
                    </Button>
                    
                    <Button
                      variant={selectedFilters.includes('sent') ? "default" : "outline"}
                      size="sm"
                      className={`h-8 text-xs flex items-center justify-center rounded-md 
                        ${selectedFilters.includes('sent') 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "bg-muted/30 hover:bg-muted/50 text-muted-foreground"}`}
                      onClick={() => handleFilterChange("sent")}
                    >
                      <ArrowUpRight className="h-3 w-3 mr-1 text-orange-500" />
                      Sent
                      {(availableTags.find(t => t.tag === 'sent')?.count || 0) > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] 
                          ${selectedFilters.includes('sent') 
                            ? "bg-white/20 text-white" 
                            : "bg-muted/50 text-muted-foreground"}`}>
                          {availableTags.find(t => t.tag === 'sent')?.count || 0}
                        </span>
                      )}
                    </Button>
                    
                    <Button
                      variant={selectedFilters.includes('received') ? "default" : "outline"}
                      size="sm"
                      className={`h-8 text-xs flex items-center justify-center rounded-md 
                        ${selectedFilters.includes('received') 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "bg-muted/30 hover:bg-muted/50 text-muted-foreground"}`}
                      onClick={() => handleFilterChange("received")}
                    >
                      <ArrowDownLeft className="h-3 w-3 mr-1 text-green-500" />
                      Received
                      {(availableTags.find(t => t.tag === 'received')?.count || 0) > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] 
                          ${selectedFilters.includes('received') 
                            ? "bg-white/20 text-white" 
                            : "bg-muted/50 text-muted-foreground"}`}>
                          {availableTags.find(t => t.tag === 'received')?.count || 0}
                        </span>
                      )}
                    </Button>
                    
                    <Button
                      variant={selectedFilters.includes('mint') ? "default" : "outline"}
                      size="sm"
                      className={`h-8 text-xs flex items-center justify-center rounded-md 
                        ${selectedFilters.includes('mint') 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "bg-muted/30 hover:bg-muted/50 text-muted-foreground"}`}
                      onClick={() => handleFilterChange("mint")}
                    >
                      <Plus className="h-3 w-3 mr-1 text-emerald-500" />
                      Mint
                      {(availableTags.find(t => t.tag === 'mint')?.count || 0) > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] 
                          ${selectedFilters.includes('mint') 
                            ? "bg-white/20 text-white" 
                            : "bg-muted/50 text-muted-foreground"}`}>
                          {availableTags.find(t => t.tag === 'mint')?.count || 0}
                        </span>
                      )}
                    </Button>
                    
                    <Button
                      variant={selectedFilters.includes('interacted') ? "default" : "outline"}
                      size="sm"
                      className={`h-8 text-xs flex items-center justify-center rounded-md 
                        ${selectedFilters.includes('interacted') 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "bg-muted/30 hover:bg-muted/50 text-muted-foreground"}`}
                      onClick={() => handleFilterChange("dapps")}
                    >
                      <AppWindow className="h-3 w-3 mr-1 text-slate-500" />
                      dApps
                      {(availableTags.find(t => t.tag === 'interacted')?.count || 0) > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] 
                          ${selectedFilters.includes('interacted') 
                            ? "bg-white/20 text-white" 
                            : "bg-muted/50 text-muted-foreground"}`}>
                          {availableTags.find(t => t.tag === 'interacted')?.count || 0}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Transaction List */}
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  {loading && page === 1 ? (
                    <div className="divide-y divide-border/50">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="py-4 px-2 flex items-center gap-3">
                          <div className="w-5 h-5 bg-muted rounded animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                            <div className="h-3 bg-muted rounded w-24 animate-pulse" />
                          </div>
                          <div className="h-3 bg-muted rounded w-16 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : filteredTransactions.length === 0 && transactions.length > 0 ? (
                    <div className="text-center py-12 px-4">
                      <Filter className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">No matching transactions</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFilters([]);
                          fetchTransactions(1);
                        }}
                        className="text-xs"
                      >
                        Clear filters
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {filteredTransactions.map((tx, index) => (
                        <TransactionRow
                          key={tx.id || index}
                          tx={tx}
                          isExpanded={expandedRows[tx.id] || false}
                          toggleExpand={() => setExpandedRows(prev => ({
                            ...prev,
                            [tx.id]: !prev[tx.id]
                          }))}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between mt-6 pt-4" style={noBorderStyles}>
        <div className="text-sm text-muted-foreground">
          Page {page} • {limit} per page • 
          {loading ? (
            <span className="ml-1">Loading...</span>
          ) : (
            <span className="ml-1">
              {totalTransactionCount && totalTransactionCount > 0 
                ? `${Math.min((page - 1) * limit + 1, totalTransactionCount)} - ${Math.min(page * limit, totalTransactionCount || 0)} of ${totalTransactionCount}` 
                : 'No transactions'}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('Previous page clicked. Current page:', page);
              if (page > 1 && !loading) {
                fetchingRef.current = false;  // Reset fetching state before changing page
                setPage(page - 1);
              }
            }}
            disabled={page <= 1 || loading}
            className="h-8 text-xs flex items-center justify-center rounded-md bg-background border-none"
            style={inactiveButtonStyle}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('Next page clicked. Current page:', page);
              console.log('Transaction count:', transactions.length, 'Items per page:', limit);
              if (transactions.length === limit && !loading) {
                fetchingRef.current = false;  // Reset fetching state before changing page
                setPage(page + 1);
              }
            }}
            disabled={transactions.length < limit || loading}
            className="h-8 text-xs flex items-center justify-center rounded-md bg-background border-none"
            style={inactiveButtonStyle}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}