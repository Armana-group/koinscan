"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { blockByHeight as getBlockByHeight, headBlockInfo as getHeadBlockInfo } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { 
  Card, 
  CardContent, 
  CardDescription, 
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
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { Clock, Hash, Layers, ArrowUpDown, Cpu, ChevronLeft, ChevronRight, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";

interface BlockPageProps {
  params: {
    blockId: string;
  };
}

export default function BlockPage({ params }: BlockPageProps) {
  const { blockId } = params;
  const router = useRouter();
  const [block, setBlock] = useState<any>(null);
  const [headBlock, setHeadBlock] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBlockData() {
      try {
        setLoading(true);
        setError(null);

        // Get head block info to know the latest block height
        const headData = await getHeadBlockInfo();
        setHeadBlock(headData);
        
        // Get the specified block data
        const blockData = await getBlockByHeight(blockId);
        setBlock(blockData);
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching block data:", err);
        setError("Failed to fetch block data. Please try again later.");
        setLoading(false);
      }
    }

    fetchBlockData();
  }, [blockId]);

  function formatTimestamp(timestamp: string) {
    if (!timestamp) return "Unknown";
    
    // Convert timestamp to date if it's a number (assumes milliseconds)
    const date = new Date(parseInt(timestamp));
    
    return `${date.toLocaleString()} (${formatDistanceToNow(date, { addSuffix: true })})`;
  }

  function truncateAddress(address: string) {
    if (!address) return "";
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-3xl font-bold">
              <div className="flex items-center gap-2">
                <Layers className="h-8 w-8" />
                <span>Block {block?.block_height || blockId}</span>
              </div>
            </h1>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/blocks/${Number(blockId) - 1}`)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous Block
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push(`/blocks/${Number(blockId) + 1}`)}
                disabled={headBlock && Number(blockId) >= Number(headBlock?.head_topology?.height)}
              >
                Next Block
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/blocks')}
              >
                Latest Block
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-red-500">{error}</div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Block Information
                  </CardTitle>
                  <CardDescription>
                    Details for block {block?.block_height}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">Height</dt>
                      <dd className="text-lg font-semibold">
                        {block?.block_height || "Unknown"}
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">Timestamp</dt>
                      <dd>{formatTimestamp(block?.block?.header?.timestamp)}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">Block ID</dt>
                      <dd className="font-mono text-xs break-all">
                        {block?.block_id || "Unknown"}
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">Previous Block</dt>
                      <dd className="font-mono text-xs break-all">
                        <Link 
                          href={`/blocks/${Number(block?.block_height) - 1}`}
                          className="hover:text-primary hover:underline flex items-center"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          {block?.block?.header?.previous || "Unknown"}
                        </Link>
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">Block Signer</dt>
                      <dd className="font-mono text-sm break-all">
                        <Link 
                          href={`/address/${block?.block?.header?.signer}`}
                          className="hover:text-primary hover:underline"
                        >
                          {block?.block?.header?.signer || "Unknown"}
                        </Link>
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">Merkle Root</dt>
                      <dd className="font-mono text-xs break-all">
                        {block?.block?.header?.transaction_merkle_root || "Unknown"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Tabs defaultValue="events" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="events">Events</TabsTrigger>
                  <TabsTrigger value="resources">Resource Usage</TabsTrigger>
                  <TabsTrigger value="state">State Changes</TabsTrigger>
                </TabsList>
                <TabsContent value="events" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Block Events</CardTitle>
                      <CardDescription>
                        {block?.receipt?.events?.length || 0} event{(block?.receipt?.events?.length || 0) !== 1 ? 's' : ''} recorded in this block
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!block?.receipt?.events || block?.receipt?.events.length === 0 ? (
                        <div className="text-muted-foreground text-center py-4">
                          No events in this block
                        </div>
                      ) : (
                        <Accordion type="single" collapsible className="w-full">
                          {block.receipt.events.map((event: any, index: number) => (
                            <AccordionItem key={`${event.source}-${event.name}-${index}`} value={`${event.source}-${event.name}-${index}`}>
                              <AccordionTrigger className="hover:bg-muted/50 px-4 py-2 rounded-md">
                                <div className="flex flex-col items-start text-left">
                                  <div className="font-medium">{event.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    From: {truncateAddress(event.source)}
                                    {event.sequence !== undefined && ` (Sequence: ${event.sequence})`}
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pt-2 pb-4">
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">Data:</h4>
                                    <pre className="bg-muted p-2 rounded-md overflow-x-auto text-xs">
                                      {JSON.stringify(event.data, null, 2)}
                                    </pre>
                                  </div>
                                  {event.impacted && event.impacted.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-medium mb-1">Impacted Addresses:</h4>
                                      <ul className="list-disc list-inside">
                                        {event.impacted.map((address: string, i: number) => (
                                          <li key={i} className="font-mono text-xs">
                                            <Link 
                                              href={`/address/${address}`} 
                                              className="hover:text-primary hover:underline"
                                            >
                                              {address}
                                            </Link>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  <div>
                                    <Link 
                                      href={`/address/${event.source}`}
                                      className="text-primary hover:underline text-sm flex items-center"
                                    >
                                      View Contract
                                      <ArrowRight className="h-3 w-3 ml-1" />
                                    </Link>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="resources" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Resource Usage</CardTitle>
                      <CardDescription>
                        Resources consumed by this block
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <dt className="text-sm font-medium text-muted-foreground">Network Bandwidth Used</dt>
                            <dd className="font-mono">
                              {block?.receipt?.network_bandwidth_used || "0"}
                            </dd>
                          </div>
                          <div className="space-y-1">
                            <dt className="text-sm font-medium text-muted-foreground">Network Bandwidth Charged</dt>
                            <dd className="font-mono">
                              {block?.receipt?.network_bandwidth_charged || "0"}
                            </dd>
                          </div>
                          <div className="space-y-1">
                            <dt className="text-sm font-medium text-muted-foreground">Compute Bandwidth Used</dt>
                            <dd className="font-mono">
                              {block?.receipt?.compute_bandwidth_used || "0"}
                            </dd>
                          </div>
                          <div className="space-y-1">
                            <dt className="text-sm font-medium text-muted-foreground">Compute Bandwidth Charged</dt>
                            <dd className="font-mono">
                              {block?.receipt?.compute_bandwidth_charged || "0"}
                            </dd>
                          </div>
                          <div className="space-y-1">
                            <dt className="text-sm font-medium text-muted-foreground">Disk Storage Used</dt>
                            <dd className="font-mono">
                              {block?.receipt?.disk_storage_used || "0"}
                            </dd>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="state" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>State Changes</CardTitle>
                      <CardDescription>
                        State delta entries in this block
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!block?.receipt?.state_delta_entries || block?.receipt?.state_delta_entries.length === 0 ? (
                        <div className="text-muted-foreground text-center py-4">
                          No state changes in this block
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Object Space</TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead>Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {block.receipt.state_delta_entries.map((entry: any, index: number) => (
                                <TableRow key={index}>
                                  <TableCell className="font-mono text-xs">
                                    {entry.object_space ? 
                                      JSON.stringify(entry.object_space).substring(0, 30) + (JSON.stringify(entry.object_space).length > 30 ? '...' : '') 
                                      : 'N/A'}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {entry.key ? entry.key.substring(0, 20) + (entry.key.length > 20 ? '...' : '') : 'N/A'}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {entry.value ? entry.value.substring(0, 20) + (entry.value.length > 20 ? '...' : '') : 'N/A'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => router.push(`/blocks/${Number(blockId) - 1}`)}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous Block
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push(`/blocks/${Number(blockId) + 1}`)}
                  disabled={headBlock && Number(blockId) >= Number(headBlock?.head_topology?.height)}
                >
                  Next Block
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
} 