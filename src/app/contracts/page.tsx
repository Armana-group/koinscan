"use client";

import { useState, useRef } from "react";
import { Search } from "lucide-react";
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
    category: "token",
  },
  {
    id: "vhp",
    name: "VHP",
    description: "Virtual Hash Power token",
    address: "18tWNU7E4yuQzz7hMVpceb9ixmaWLVyQsr",
    category: "token",
  },
  {
    id: "pob",
    name: "PoB",
    description: "Proof of Burn consensus algorithm",
    address: "159myq5YUhhoVWu3wsHKHiJYKPKGUrGiyv",
    category: "consensus",
  },
  {
    id: "claim",
    name: "Claim",
    description: "Koin claiming contract",
    address: "18zw3ZokdfHtudzaWAUnU4tUvKzKiJeN76",
    category: "utility",
  },
  {
    id: "governance",
    name: "Governance",
    description: "Governance mechanism (proposals)",
    address: "19qj51eTbSFJYU7ZagudkpxPgNSzPMfdPX",
    category: "governance",
  },
  {
    id: "name_service",
    name: "Name Service",
    description: "Contract discovery service",
    address: "19WxDJ9Kcvx4VqQFkpwVmwVEy1hMuwXtQE",
    category: "utility",
  },
  {
    id: "resources",
    name: "Resources",
    description: "Blockchain resources contract (MANA)",
    address: "1HGN9h47CzoFwU2bQZwe6BYoX4TM6pXc4b",
    category: "system",
  },
];

// Get unique categories
const categories = ["all", ...Array.from(new Set(contracts.map((contract) => contract.category)))];

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
      
    const matchesCategory = selectedCategory === "all" || contract.category === selectedCategory;
    
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
            <div className="flex flex-col md:flex-row gap-4">
              <form onSubmit={handleSearchSubmit} className="flex-grow flex">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search by name, description, or contract address"
                    className="pl-12 bg-background pr-24"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    ref={searchInputRef}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <Button 
                      type="submit" 
                      variant="ghost" 
                      className="h-full px-4 rounded-l-none"
                      disabled={!searchQuery.trim()}
                    >
                      Search
                    </Button>
                  </div>
                </div>
              </form>
              
              {/* Category filter */}
              <div className="flex flex-wrap gap-2">
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
            
            {/* Search instructions */}
            <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
              <p>
                <strong>Tip:</strong> Enter a contract address and click Search (or press Enter) to explore any 
                contract on the blockchain, even if it&apos;s not in the list below.
              </p>
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
                            <CardTitle>{contract.name}</CardTitle>
                            <motion.div 
                              className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground capitalize"
                              whileHover={{ scale: 1.1 }}
                            >
                              {contract.category}
                            </motion.div>
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
                          <Button variant="outline" className="w-full">View Contract</Button>
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