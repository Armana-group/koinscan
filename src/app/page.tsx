"use client";

import { useRef } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { AuroraText } from "@/components/magicui/aurora-text";
import { motion } from "framer-motion";

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Handle search submit
  const handleSearch = () => {
    if (inputRef.current?.value.trim()) {
      router.push(`/contracts/${inputRef.current.value.trim()}`);
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
              className="max-w-3xl w-full space-y-12 text-center pt-[15vh]"
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
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
