"use client";

import { useState, useRef } from "react";
import { Search, ArrowUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, stagger } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// List of contracts
const contracts = [
  {
    id: "koin",
    name: "Koin",
    description: "Koin token",
    address: "15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL",
    categories: ["token", "system"],
  },
  {
    id: "vhp",
    name: "VHP",
    description: "Virtual Hash Power token",
    address: "18tWNU7E4yuQzz7hMVpceb9ixmaWLVyQsr",
    categories: ["token", "system"],
  },
  {
    id: "pob",
    name: "PoB",
    description: "Proof of Burn consensus algorithm",
    address: "159myq5YUhhoVWu3wsHKHiJYKPKGUrGiyv",
    categories: ["consensus", "system"],
  },
  {
    id: "claim",
    name: "Claim",
    description: "Koin claiming contract",
    address: "18zw3ZokdfHtudzaWAUnU4tUvKzKiJeN76",
    categories: ["utility", "system"],
  },
  {
    id: "governance",
    name: "Governance",
    description: "Governance mechanism (proposals)",
    address: "19qj51eTbSFJYU7ZagudkpxPgNSzPMfdPX",
    categories: ["governance", "system"],
  },
  {
    id: "name_service",
    name: "Name Service",
    description: "Contract discovery service",
    address: "19WxDJ9Kcvx4VqQFkpwVmwVEy1hMuwXtQE",
    categories: ["utility", "system"],
  },
  {
    id: "resources",
    name: "Resources",
    description: "Blockchain resources contract (MANA)",
    address: "1HGN9h47CzoFwU2bQZwe6BYoX4TM6pXc4b",
    categories: ["system"],
  },
];

// Get unique categories
const categories = ["all", ...Array.from(new Set(contracts.flatMap((contract) => contract.categories)))];

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Filter contracts based on search query and category
  const filteredContracts = contracts.filter((contract) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      contract.name.toLowerCase().includes(query) ||
      contract.description.toLowerCase().includes(query) ||
      contract.address.toLowerCase().includes(query);
      
    const matchesCategory = selectedCategory === "all" || contract.categories.includes(selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  // Handle search form submission to navigate to contract details
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    // Navigate to the contract details page using the search query as the contract address
    router.push(`/contracts/${searchQuery.trim()}`);
  };

  // Animation variants for container and items
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    show: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Contracts Directory</h1>
              <p className="text-muted-foreground">
                Explore common contracts on the Koinos blockchain or search for any contract address
              </p>
            </div>
            
            {/* Search and filter */}
            <div className="flex flex-col gap-4">
              <form onSubmit={handleSearchSubmit} className="w-full relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  type="text"
                  placeholder="Search by name, description, or contract address"
                  className="pl-12 pr-14 h-14 text-lg bg-background border-2 border-border/50 rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.02)] hover:border-border focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10 transition-all w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  ref={searchInputRef}
                />
                <button 
                  type="submit" 
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-muted h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                  aria-label="Search"
                  disabled={!searchQuery.trim()}
                >
                  <ArrowUp className="h-5 w-5 text-muted-foreground" />
                </button>
              </form>
              
              {/* Category filter */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {categories.map((category) => (
                  <motion.div
                    key={category}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Button
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="capitalize"
                    >
                      {category}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
            
            
            {/* Contract cards with animation */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              <AnimatePresence mode="popLayout">
                {filteredContracts.map((contract, index) => (
                  <motion.div
                    key={contract.id}
                    layout
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    custom={index}
                  >
                    <Link 
                      href={`/contracts/${contract.address}`}
                      className="transition-transform hover:scale-[1.02] block h-full"
                    >
                      <Card className="h-full flex flex-col">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-2xl">{contract.name}</CardTitle>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {contract.categories.map((category) => (
                                <motion.div 
                                  key={`${contract.id}-${category}`}
                                  className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground capitalize"
                                  whileHover={{ scale: 1.1 }}
                                >
                                  {category}
                                </motion.div>
                              ))}
                            </div>
                          </div>
                          <CardDescription>{contract.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <div className="mt-2">
                            <div className="text-sm font-medium text-muted-foreground">Address:</div>
                            <div className="text-sm font-mono truncate">{contract.address}</div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button variant="outline" className="">View Contract</Button>
                        </CardFooter>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
            
            {/* Show message when no results with option to search for address directly */}
            {filteredContracts.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 space-y-4"
              >
                <p className="text-muted-foreground">No contracts found matching &ldquo;{searchQuery}&rdquo;</p>
                {searchQuery.trim() && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Want to explore this as a contract address?</p>
                    <Button 
                      onClick={() => router.push(`/contracts/${searchQuery.trim()}`)}
                      variant="default"
                    >
                      Explore {searchQuery.substring(0, 10)}... as a contract
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </>
  );
} 