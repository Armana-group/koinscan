"use client";

import { useRef, useState, Suspense } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { AuroraText } from "@/components/magicui/aurora-text";
import { motion } from "framer-motion";
import dynamic from 'next/dynamic';
import type { TransactionHistory as TransactionHistoryType } from '@/components/TransactionHistory';

// Dynamically import the TransactionHistory component
const TransactionHistory = dynamic(
  () => import('@/components/TransactionHistory').then(mod => mod.TransactionHistory),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full p-8 rounded-lg border border-border">
        <div className="h-8 w-32 bg-muted rounded-md animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    )
  }
);

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [searchAddress, setSearchAddress] = useState<string>("");

  // Handle search submit
  const handleSearch = () => {
    if (inputRef.current?.value.trim()) {
      const value = inputRef.current.value.trim();
      
      // Check if this is a Koinos address (simple validation)
      if (value.length >= 30) {
        // Likely an address, set it for transaction history
        setSearchAddress(value);
      } else if (value.length > 0) {
        // Only navigate to contract details if it's not an address
        router.push(`/contracts/${value}`);
      }
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="container mx-auto px-4">
          <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center">
            <motion.div 
              className="max-w-5xl w-full space-y-12 text-center pt-10"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="space-y-4" variants={itemVariants}>
                <h1 className="text-5xl font-bold tracking-tight text-foreground">
                  <AuroraText>Explore the Koinos blockchain</AuroraText>
                </h1>
                <p className="text-xl text-muted-foreground">
                  Search for transactions, blocks, accounts, and smart contracts
                </p>
              </motion.div>

              <motion.div className="relative group" variants={itemVariants}>
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search by address, transaction hash, block, or token"
                    className="pl-12 h-14 text-lg bg-background border-2 border-border/50 rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.02)] hover:border-border focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10 transition-all"
                    ref={inputRef}
                    onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSearch();
                      }
                    }}
                  />
                  <button type="submit" className="hidden">Search</button>
                </form>
              </motion.div>

              {/* Transaction History Section */}
              <motion.div 
                className="w-full" 
                variants={itemVariants}
                initial={{ opacity: 0, y: 30 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { delay: 0.3, duration: 0.5 }
                }}
              >
                <Suspense fallback={
                  <div className="w-full p-8 rounded-lg border border-border">
                    <div className="h-8 w-32 bg-muted rounded-md animate-pulse mb-4" />
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
                      ))}
                    </div>
                  </div>
                }>
                  <TransactionHistory initialAddress={searchAddress} />
                </Suspense>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
