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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { Clock, Hash, Layers, Cpu, ArrowDown, ChevronLeft, ChevronRight, ExternalLink, Search, ArrowUp } from "lucide-react";
import Link from "next/link";

export default function BlocksPage() {
  const router = useRouter();
  const [headBlock, setHeadBlock] = useState<any>(null);
  const [blockDetail, setBlockDetail] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHeadBlock() {
      try {
        setLoading(true);
        setError(null);
        
        const headData = await getHeadBlockInfo();
        setHeadBlock(headData);

        if (headData && headData.head_topology && headData.head_topology.height) {
          const blockData = await getBlockByHeight(headData.head_topology.height);
          setBlockDetail(blockData);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching block data:", err);
        setError("Failed to fetch block data. Please try again later.");
        setLoading(false);
      }
    }

    fetchHeadBlock();
  }, []);

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    
    if (!searchValue.trim()) return;
    
    const value = searchValue.trim();
    setIsSearching(true);
    setSearchError(null);
    
    try {
      // Check if the input is a valid block height (number)
      if (/^\d+$/.test(value)) {
        router.push(`/blocks/${value}`);
        return;
      }
      
      // Check if the input could be a block hash/ID (likely a hex string)
      if (/^[0-9a-fA-F]{64}$/.test(value)) {
        router.push(`/blocks/${value}`);
        return;
      }
      
      // If not recognized format, show error
      setSearchError("Please enter a valid block height (number) or block hash");
      setTimeout(() => setSearchError(null), 3000);
    } catch (err) {
      setSearchError("Error processing search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-8">
          <h1 className="text-3xl font-bold">
            <div className="flex items-center gap-2">
              <Layers className="h-8 w-8" />
              <span>Blocks</span>
            </div>
          </h1>

          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search by block height or block hash"
                  className="pl-12 pr-14 h-14 text-lg bg-background border-2 border-border/50 rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.02)] hover:border-border focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10 transition-all"
                  disabled={isSearching}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch(e);
                    }
                  }}
                />
                {isSearching ? (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className="h-5 w-5 border-t-2 border-r-2 border-primary rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <button 
                    type="submit" 
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-muted h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                    aria-label="Search"
                    disabled={!searchValue.trim()}
                  >
                    <ArrowUp className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}
              </form>
              {searchError && <p className="mt-2 text-sm text-red-500">{searchError}</p>}
            </CardContent>
          </Card>

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
                    Latest Block
                  </CardTitle>
                  <CardDescription>
                    Most recent block in the Koinos blockchain
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">Height</dt>
                      <dd className="text-lg font-semibold">
                        {headBlock?.head_topology?.height || "Unknown"}
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">Timestamp</dt>
                      <dd>{formatTimestamp(headBlock?.head_block_time)}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">Block ID</dt>
                      <dd className="font-mono text-xs break-all">
                        {headBlock?.head_topology?.id || "Unknown"}
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">Previous Block</dt>
                      <dd className="font-mono text-xs break-all">
                        <Link 
                          href={`/blocks/${Number(headBlock?.head_topology?.height) - 1}`}
                          className="hover:text-primary hover:underline flex items-center"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous Block ({Number(headBlock?.head_topology?.height) - 1})
                        </Link>
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-sm font-medium text-muted-foreground">Last Irreversible Block</dt>
                      <dd>{headBlock?.last_irreversible_block || "Unknown"}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {blockDetail && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        Block Details
                      </CardTitle>
                      <CardDescription>
                        Technical details of block {blockDetail.block_height}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <dt className="text-sm font-medium text-muted-foreground">Block Signer</dt>
                          <dd className="font-mono text-sm break-all">
                            {blockDetail.block?.header?.signer || "Unknown"}
                          </dd>
                        </div>
                        <div className="space-y-1">
                          <dt className="text-sm font-medium text-muted-foreground">Merkle Root</dt>
                          <dd className="font-mono text-xs break-all">
                            {blockDetail.block?.header?.transaction_merkle_root || "Unknown"}
                          </dd>
                        </div>
                        <div className="space-y-1">
                          <dt className="text-sm font-medium text-muted-foreground">Network Bandwidth</dt>
                          <dd className="font-mono">
                            {blockDetail.receipt?.network_bandwidth_used || "0"} ({blockDetail.receipt?.network_bandwidth_charged || "0"} charged)
                          </dd>
                        </div>
                        <div className="space-y-1">
                          <dt className="text-sm font-medium text-muted-foreground">Compute Bandwidth</dt>
                          <dd className="font-mono">
                            {blockDetail.receipt?.compute_bandwidth_used || "0"} ({blockDetail.receipt?.compute_bandwidth_charged || "0"} charged)
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  {blockDetail.receipt?.events && blockDetail.receipt.events.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Block Events</CardTitle>
                        <CardDescription>
                          {blockDetail.receipt.events.length} event{blockDetail.receipt.events.length !== 1 ? 's' : ''} in this block
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                          {blockDetail.receipt.events.map((event: any, index: number) => (
                            <AccordionItem key={`${event.source}-${event.name}-${index}`} value={`${event.source}-${event.name}-${index}`}>
                              <AccordionTrigger className="hover:bg-muted/50 px-4 py-2 rounded-md">
                                <div className="flex flex-col items-start text-left">
                                  <div className="font-medium">{event.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    From: {truncateAddress(event.source)}
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
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => router.push(`/blocks/${Number(blockDetail.block_height) - 1}`)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous Block
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push(`/blocks/${Number(blockDetail.block_height) + 1}`)}
                      disabled={Number(blockDetail.block_height) >= Number(headBlock?.head_topology?.height)}
                    >
                      Next Block
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
} 