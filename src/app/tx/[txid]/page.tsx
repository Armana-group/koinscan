"use client";

import { useState, useEffect } from "react";
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
import { Clock, Hash, ArrowRight, ExternalLink } from "lucide-react";

interface TransactionPageProps {
  params: {
    txid: string;
  };
}

export default function TransactionPage({ params }: TransactionPageProps) {
  const { txid } = params;
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransaction() {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getTransactionDetails(txid);
        if (data) {
          setTransaction(data);
        } else {
          setError("Transaction not found");
        }
      } catch (err: any) {
        console.error("Error fetching transaction:", err);
        setError(err.message || "Failed to load transaction details");
      } finally {
        setLoading(false);
      }
    }

    if (txid) {
      fetchTransaction();
    }
  }, [txid]);

  const formatDate = (timestamp: string) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = new Date(parseInt(timestamp));
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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
    return <TransactionSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
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

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Transaction Details</h1>
      <h2 className="text-xl font-medium text-muted-foreground mb-8 break-all">
        {txid}
      </h2>
      
      <div className="grid gap-6">
        {/* Transaction Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex flex-col sm:flex-row justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Transaction ID:</span>
                </div>
                <div className="break-all">
                  {transaction.transaction?.id || txid}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Timestamp:</span>
                </div>
                <div>
                  {transaction.block_time ? formatDate(transaction.block_time) : 'Pending'}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Payer:</span>
                </div>
                <div className="break-all">
                  {transaction.transaction?.header?.payer || 'Unknown'}
                </div>
              </div>
              
              {hasReceipt && (
                <div className="flex flex-col sm:flex-row justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">RC Used:</span>
                  </div>
                  <div>
                    {transaction.receipt.rc_used || '0'}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Operations ({operations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {operations.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No operations found</div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {operations.map((op: any, index: number) => {
                  const isContractCall = op.call_contract;
                  const isUploadContract = op.upload_contract;
                  
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
                              <pre className="bg-muted p-2 rounded mt-2 overflow-auto">
                                {JSON.stringify(op.call_contract.args, null, 2)}
                              </pre>
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
                          <pre className="bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(op, null, 2)}
                          </pre>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
        
        {/* Events */}
        {hasReceipt && events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Events ({events.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {events.map((event: any, index: number) => {
                  const isTransferEvent = event.name === 'token.transfer_event';
                  
                  return (
                    <AccordionItem key={index} value={`event-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Badge variant={isTransferEvent ? "default" : "secondary"}>
                            {isTransferEvent ? "Transfer" : event.name?.split('.')?.pop() || 'Event'}
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
                          
                          {isTransferEvent && event.data && (
                            <div className="mt-4 p-3 border rounded-md bg-muted">
                              <div className="flex items-center justify-between">
                                <div className="text-sm">{shortenAddress(event.data.from)}</div>
                                <ArrowRight className="w-4 h-4 mx-2" />
                                <div className="text-sm">{shortenAddress(event.data.to)}</div>
                              </div>
                              <div className="text-center mt-2 font-bold">
                                {formatValue(event.data.value)} KOIN
                              </div>
                            </div>
                          )}
                          
                          {(!isTransferEvent || !event.data) && (
                            <div>
                              <span className="font-medium">Data:</span>
                              <pre className="bg-muted p-2 rounded mt-2 overflow-auto">
                                {JSON.stringify(event.data || {}, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {event.impacted && event.impacted.length > 0 && (
                            <div>
                              <span className="font-medium">Impacted Addresses:</span>
                              <div className="mt-2 space-y-1">
                                {event.impacted.map((address: string, i: number) => (
                                  <div key={i} className="flex items-center justify-between">
                                    <span className="break-all">{address}</span>
                                    <a href={`/address/${address}`} className="text-primary flex items-center">
                                      <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TransactionSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
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