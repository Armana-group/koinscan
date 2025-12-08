"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown, ChevronDown, Filter, ArrowUp, ExternalLink, Coins } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

// Category colors for gradients
const categoryGradients: Record<string, string> = {
  native: "from-amber-500/10 via-yellow-500/5 to-transparent",
  wrapped: "from-blue-500/10 via-cyan-500/5 to-transparent",
  meme: "from-pink-500/10 via-rose-500/5 to-transparent",
  gaming: "from-purple-500/10 via-violet-500/5 to-transparent",
  defi: "from-green-500/10 via-emerald-500/5 to-transparent",
  other: "from-slate-500/10 via-gray-500/5 to-transparent",
};

const categoryBadgeColors: Record<string, string> = {
  native: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  wrapped: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  meme: "bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30",
  gaming: "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30",
  defi: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
  other: "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30",
};
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Token {
  name: string;
  symbol: string;
  description: string;
  decimals: string;
  logoURI: string;
  address: string;
  allowance: boolean;
  token_website: string;
  coingecko_id: string;
  coinmarketcap_id: string;
}

// Token categories
const tokenCategories: Record<string, { name: string, keywords: string[] }> = {
  native: { 
    name: "Native", 
    keywords: ["koin", "vhp"]
  },
  wrapped: { 
    name: "Wrapped", 
    keywords: ["wrapped", "chainge", "btc", "eth", "usdt"]
  },
  meme: { 
    name: "Meme", 
    keywords: ["meme", "inu", "dog", "bald", "duck", "titcoin", "quack", "kat"]
  },
  gaming: { 
    name: "Gaming", 
    keywords: ["game", "nft", "card", "pack", "lords", "forsaken", "faith"]
  },
  defi: { 
    name: "DeFi", 
    keywords: ["defi", "swap", "pool", "finance", "koindx", "staking", "yield", "amm"]
  },
};

type SortKey = 'name' | 'symbol' | 'decimals';
type SortDirection = 'asc' | 'desc';

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [activeCategory, setActiveCategory] = useState<string>("all");
  
  // More robust image error handling
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  
  const handleImageError = (address: string) => {
    setFailedImages(prev => ({
      ...prev,
      [address]: true
    }));
  };

  useEffect(() => {
    async function fetchTokenList() {
      try {
        setLoading(true);
        const response = await fetch(
          "https://raw.githubusercontent.com/koindx/token-list/main/src/tokens/mainnet.json"
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch token list: ${response.status}`);
        }
        
        const data = await response.json();
        if (data && data.tokens && Array.isArray(data.tokens)) {
          setTokens(data.tokens);
          setFilteredTokens(data.tokens);
        } else {
          throw new Error("Invalid token list format");
        }
      } catch (error) {
        console.error("Error fetching token list:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch token list");
      } finally {
        setLoading(false);
      }
    }

    fetchTokenList();
  }, []);

  // Determine token category
  const getTokenCategory = (token: Token): string => {
    const textToCheck = `${token.name} ${token.symbol} ${token.description}`.toLowerCase();
    
    for (const [category, data] of Object.entries(tokenCategories)) {
      if (data.keywords.some(keyword => textToCheck.includes(keyword.toLowerCase()))) {
        return category;
      }
    }
    
    return "other";
  };
  
  // Count tokens by category
  const countTokensByCategory = (): Record<string, number> => {
    const counts: Record<string, number> = { all: tokens.length };
    
    tokens.forEach(token => {
      const category = getTokenCategory(token);
      counts[category] = (counts[category] || 0) + 1;
    });
    
    return counts;
  };
  
  const tokenCounts = countTokensByCategory();

  // Filter and sort tokens
  useEffect(() => {
    let result = [...tokens];
    
    // Filter by category first
    if (activeCategory !== "all") {
      result = result.filter(token => getTokenCategory(token) === activeCategory);
    }
    
    // Then filter based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (token) =>
          token.name.toLowerCase().includes(query) ||
          token.symbol.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query)
      );
    }
    
    // Sort the tokens
    result.sort((a, b) => {
      // Special case for koin and vhp
      if (a.symbol.toLowerCase() === 'koin') return -1;
      if (b.symbol.toLowerCase() === 'koin') return 1;
      if (a.symbol.toLowerCase() === 'vhp') return -1;
      if (b.symbol.toLowerCase() === 'vhp') return 1;
      
      // Handle the selected sort key
      const aValue = a[sortKey]?.toString().toLowerCase() || '';
      const bValue = b[sortKey]?.toString().toLowerCase() || '';
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
    
    setFilteredTokens(result);
  }, [searchQuery, tokens, sortKey, sortDirection, activeCategory]);

  // Handle sort change
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Toggle direction if the same key is clicked
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new key and default to ascending
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address; // For "koin", "vhp", etc.
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Koinos Tokens</h1>
            <p className="text-muted-foreground">
              Browse all tokens on the Koinos blockchain
            </p>
          </div>
          
          {/* Category Tabs */}
          <Tabs 
            defaultValue="all" 
            value={activeCategory}
            onValueChange={setActiveCategory}
            className="w-full"
          >
            <TabsList className="w-full overflow-x-auto flex flex-nowrap justify-start">
              <TabsTrigger value="all" className="flex-shrink-0">
                All ({tokenCounts.all || 0})
              </TabsTrigger>
              {Object.entries(tokenCategories).map(([category, { name }]) => (
                <TabsTrigger key={category} value={category} className="flex-shrink-0">
                  {name} ({tokenCounts[category] || 0})
                </TabsTrigger>
              ))}
              <TabsTrigger value="other" className="flex-shrink-0">
                Other ({tokenCounts.other || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Box */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Search by token name, symbol, or address"
                className="pl-12 pr-14 h-14 text-lg bg-background border-2 border-border/50 rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.02)] hover:border-border focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-muted h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                aria-label="Search"
                disabled={!searchQuery.trim()}
                onClick={() => setSearchQuery(searchQuery.trim())}
              >
                <ArrowUp className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Sort by: {sortKey.charAt(0).toUpperCase() + sortKey.slice(1)}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSort('name')}>
                  Name {sortKey === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('symbol')}>
                  Symbol {sortKey === 'symbol' && (sortDirection === 'asc' ? '▲' : '▼')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('decimals')}>
                  Decimals {sortKey === 'decimals' && (sortDirection === 'asc' ? '▲' : '▼')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-48 bg-muted animate-pulse" />
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error Loading Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Token Grid */}
          {!loading && !error && (
            <>
              <div className="text-sm text-muted-foreground">
                Showing {filteredTokens.length} of {tokens.length} tokens
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTokens.map((token, index) => {
                  const category = getTokenCategory(token);
                  return (
                    <motion.div
                      key={token.address}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
                    >
                      <Link
                        href={`/contracts/${token.address}`}
                        className="block h-full group"
                      >
                        <Card className={`overflow-hidden h-full hover:shadow-lg hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br ${categoryGradients[category]}`}>
                          <div className="flex p-5 items-start gap-4">
                            {/* Token Logo */}
                            <div className="w-14 h-14 rounded-2xl bg-background/60 backdrop-blur-sm flex-shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-border/50 group-hover:ring-border transition-all">
                              {token.logoURI && !failedImages[token.address] ? (
                                <Image
                                  src={token.logoURI}
                                  alt={token.name}
                                  width={48}
                                  height={48}
                                  className="object-contain"
                                  onError={() => handleImageError(token.address)}
                                  unoptimized={token.logoURI.includes('githubusercontent')}
                                />
                              ) : (
                                <Coins className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>

                            {/* Token Information */}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <h3 className="text-lg font-semibold leading-tight truncate group-hover:text-primary transition-colors">
                                  {token.name}
                                </h3>
                                <Badge className={`flex-shrink-0 font-mono text-xs ${categoryBadgeColors[category]}`}>
                                  {token.symbol}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1.5 font-mono truncate">
                                {formatAddress(token.address)}
                              </p>
                            </div>
                          </div>

                          {/* Description section */}
                          <div className="px-5 pb-5 pt-0">
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {token.description || "No description available"}
                            </p>

                            {/* Quick actions */}
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40">
                              <span className="text-xs text-muted-foreground">
                                {parseInt(token.decimals)} decimals
                              </span>
                              {token.token_website && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                                  <ExternalLink className="h-3 w-3" />
                                  Website
                                </span>
                              )}
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
              
              {filteredTokens.length === 0 && (
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium">No tokens found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search query
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
} 