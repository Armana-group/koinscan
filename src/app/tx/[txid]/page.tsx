"use client";

import { useState, useEffect, ReactNode } from "react";
import { getTransactionDetails } from "@/lib/api";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Clock, Hash, ArrowRight, ExternalLink, User, Coins, FileText } from "lucide-react";
import { Navbar } from '@/components/Navbar';
import { JsonDisplay } from '@/components/JsonDisplay';
import { useWallet } from "@/contexts/WalletContext";

interface TransactionPageProps {
  params: {
    txid: string;
  };
}

// Helper function to get human-readable date
const formatDate = (timestamp: string | number): string => {
  if (!timestamp) return 'Unknown';
  const date = new Date(parseInt(String(timestamp)) * 1000);
  return date.toLocaleString();
};

// Helper function to format address with ellipsis
const formatAddress = (address: string): string => {
  if (!address) return 'Unknown';
  if (address.length <= 16) return address;
  return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
};

// Helper function to format amount
const formatAmount = (amount: string | number, decimals = 8): string => {
  if (!amount) return '0';
  const value = parseInt(String(amount)) / Math.pow(10, decimals);
  return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
};

export default function TransactionPage({ params }: TransactionPageProps) {
  const { txid } = params;
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { rpcNode } = useWallet();

  useEffect(() => {
    async function fetchTransaction() {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getTransactionDetails(rpcNode, txid);
        setTransaction(data);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch transaction details');
      } finally {
        setLoading(false);
      }
    }

    fetchTransaction();
  }, [txid]);

  // Simplified address shortener for the UI
  const shortenAddress = (address: string): string => {
    if (!address) return 'Unknown';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatValue = (value: string) => {
    try {
      const numValue = BigInt(value);
      const formatted = (Number(numValue) / 100000000).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8
      });
      return formatted;
    } catch (e) {
      return value;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Navbar />
        <h1 className="text-3xl font-bold mb-8">Transaction Details</h1>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Navbar />
        <h1 className="text-3xl font-bold mb-8">Transaction Details</h1>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Navbar />
        <h1 className="text-3xl font-bold mb-8">Transaction Details</h1>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Not Found</CardTitle>
            <CardDescription>Transaction {txid} could not be found</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const hasReceipt = transaction.receipt;
  const events = hasReceipt ? transaction.receipt.events || [] : [];
  const operations = transaction.transaction?.operations || [];
  
  // Detect if this is a token transfer transaction
  const isTransfer = operations.some((op: any) => {
    if (!op.call_contract) return false;
    return op.call_contract.entry_point === 'transfer';
  });
  
  // Extract transfer details if this is a transfer
  let transferInfo = null;
  if (isTransfer) {
    const transferOp = operations.find((op: any) => 
      op.call_contract && op.call_contract.entry_point === 'transfer'
    );
    
    if (transferOp) {
      const args = transferOp.call_contract.args;
      transferInfo = {
        tokenContract: transferOp.call_contract.contract_id,
        from: args.from,
        to: args.to,
        amount: args.value,
      };
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Navbar />
      <h1 className="text-3xl font-bold mb-2">Transaction Details</h1>
      <h2 className="text-xl font-medium text-muted-foreground mb-8 break-all">
        {txid}
      </h2>
      
      <div className="grid gap-6">
        {/* User-friendly Summary Card - Only for transfers */}
        {isTransfer && transferInfo && (
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Token Transfer
              </CardTitle>
              <CardDescription>
                Transaction completed {transaction.transaction?.timestamp ? formatDate(transaction.transaction.timestamp) : 'recently'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">From</div>
                  <User className="h-6 w-6 text-muted-foreground mb-2" />
                  <div className="font-medium text-center">{formatAddress(transferInfo.from)}</div>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 bg-primary/10 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Amount</div>
                  <div className="text-2xl font-bold text-center">{formatAmount(transferInfo.amount)}</div>
                  <div className="text-sm text-muted-foreground mt-1">{transferInfo.tokenContract}</div>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">To</div>
                  <User className="h-6 w-6 text-muted-foreground mb-2" />
                  <div className="font-medium text-center">{formatAddress(transferInfo.to)}</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>See technical details below</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  Status: {hasReceipt ? 'Confirmed' : 'Pending'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Transaction Overview - Now collapsible */}
        <Accordion type="single" collapsible defaultValue="overview">
          <AccordionItem value="overview">
            <AccordionTrigger className="py-4">
              <CardTitle className="text-left">Technical Overview</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-[auto_1fr] gap-y-4 gap-x-8">
                <div className="font-medium flex items-center">
                  <Hash className="w-4 h-4 text-muted-foreground mr-2" />
                  Transaction ID:
                </div>
                <div className="break-all">
                  {transaction.transaction?.id || txid}
                </div>
                
                <div className="font-medium flex items-center">
                  <Clock className="w-4 h-4 text-muted-foreground mr-2" />
                  Timestamp:
                </div>
                <div>
                  {transaction.transaction?.timestamp ? formatDate(transaction.transaction.timestamp) : 'Pending'}
                </div>
                
                <div className="font-medium">Payer:</div>
                <div className="break-all">
                  {transaction.transaction?.header?.payer || 'Unknown'}
                </div>
                
                <div className="font-medium">RC Limit:</div>
                <div>
                  {transaction.transaction?.header?.rc_limit || '-'}
                </div>
                
                <div className="font-medium">Nonce:</div>
                <div className="font-mono text-xs break-all">
                  {transaction.transaction?.header?.nonce || '-'}
                </div>
                
                <div className="font-medium">Chain ID:</div>
                <div className="font-mono text-xs break-all">
                  {transaction.transaction?.header?.chain_id || '-'}
                </div>
                
                <div className="font-medium">Signatures:</div>
                <div className="font-mono text-xs break-all">
                  {transaction.transaction?.signatures?.join(', ') || '-'}
                </div>
                
                <div className="font-medium">RC Used:</div>
                <div>
                  {transaction.receipt?.rc_used || '-'}
                </div>
                
                <div className="font-medium">Disk Storage Used:</div>
                <div>
                  {transaction.receipt?.disk_storage_used || '-'}
                </div>
                
                <div className="font-medium">Network Bandwidth Used:</div>
                <div>
                  {transaction.receipt?.network_bandwidth_used || '-'}
                </div>
                
                <div className="font-medium">Compute Bandwidth Used:</div>
                <div>
                  {transaction.receipt?.compute_bandwidth_used || '-'}
                </div>
                
                <div className="font-medium">Containing Blocks:</div>
                <div className="flex flex-col">
                  {transaction.containing_blocks?.length > 0 
                    ? transaction.containing_blocks.map((blockId: string) => (
                        <a key={blockId} href={`/blocks/${blockId}`} className="text-primary hover:underline mb-1">
                          {blockId}
                        </a>
                      ))
                    : '-'
                  }
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        {/* Operations */}
        {operations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Operations ({operations.length})</CardTitle>
              <CardDescription>
                Actions executed as part of this transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple">
                {operations.map((op: any, index: number) => {
                  const isContractCall = op.call_contract !== undefined;
                  const isUploadContract = op.upload_contract !== undefined;
                  
                  let title = 'Unknown Operation';
                  if (isContractCall) {
                    title = `Contract Call: ${op.call_contract.contract_id}`;
                  } else if (isUploadContract) {
                    title = `Upload Contract: ${op.upload_contract.contract_id || 'Unknown'}`;
                  }
                  
                  return (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Badge variant={isContractCall ? "secondary" : isUploadContract ? "outline" : "default"}>
                            {isContractCall ? "Call" : isUploadContract ? "Upload" : "Other"}
                          </Badge>
                          <span>{title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {isContractCall && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Contract:</span>
                              <span className="break-all">{op.call_contract.contract_id}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Entry Point:</span>
                              <span>{op.call_contract.entry_point}</span>
                            </div>
                            <div>
                              <span className="font-medium">Arguments:</span>
                              <div className="mt-2">
                                <JsonDisplay data={op.call_contract.args} />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {isUploadContract && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Contract ID:</span>
                              <span className="break-all">{op.upload_contract.contract_id || 'Unknown'}</span>
                            </div>
                          </div>
                        )}
                        
                        {!isContractCall && !isUploadContract && (
                          <div>
                            <span className="font-medium">Operation Data:</span>
                            <div className="mt-2">
                              <JsonDisplay data={op} />
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        )}
        
        {/* Events */}
        {events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Events ({events.length})</CardTitle>
              <CardDescription>
                Events emitted during transaction execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple">
                {events.map((event: any, index: number) => {
                  return (
                    <AccordionItem key={index} value={`event-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {event.source}
                          </Badge>
                          <span>{event.name || 'Unknown Event'}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Source:</span>
                            <span className="break-all">{event.source}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Name:</span>
                            <span>{event.name}</span>
                          </div>
                          <div>
                            <span className="font-medium">Data:</span>
                            <div className="mt-2">
                              <JsonDisplay data={event.data || {}} />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        )}
        
        {/* Network & Compute Info */}
        <Accordion type="single" collapsible>
          <AccordionItem value="resource-usage">
            <AccordionTrigger className="py-4">
              <CardTitle className="text-left">Resource Usage</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-medium">Network Bandwidth Used:</h3>
                    <div className="font-mono">{hasReceipt ? transaction.receipt.network_bandwidth_used : '-'}</div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Compute Bandwidth Used:</h3>
                    <div className="font-mono">{hasReceipt ? transaction.receipt.compute_bandwidth_used : '-'}</div>
                  </div>
                </div>
                {hasReceipt && transaction.receipt.containing_blocks && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Containing Blocks:</h3>
                    <div className="font-mono break-all">
                      {Array.isArray(transaction.receipt.containing_blocks) 
                        ? transaction.receipt.containing_blocks.join('\n') 
                        : String(transaction.receipt.containing_blocks)}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        {/* Raw Transaction Data */}
        <Accordion type="single" collapsible>
          <AccordionItem value="raw-data">
            <AccordionTrigger className="py-4">
              <CardTitle className="text-left">Debug: Raw Transaction Data</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardDescription className="mb-4">
                Complete data returned from the API for debugging purposes
              </CardDescription>
              <JsonDisplay data={transaction} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

function TransactionSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Navbar />
      <Skeleton className="h-10 w-72 mb-2" />
      <Skeleton className="h-6 w-full max-w-2xl mb-8" />
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-64" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-48" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 