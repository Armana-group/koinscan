"use client";

import { useRef } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { AuroraText } from "@/components/magicui/aurora-text";

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="container mx-auto px-4">
          <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center">
            <div className="max-w-3xl w-full space-y-12 text-center">
              <div className="space-y-4">
                <h1 className="text-5xl font-bold tracking-tight text-foreground">
                  <AuroraText>Explore the Koinos blockchain</AuroraText>
                </h1>
                <p className="text-xl text-muted-foreground">
                  Search for transactions, blocks, accounts, and smart contracts
                </p>
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  type="text"
                  placeholder="Search by address, transaction hash, block, or token"
                  className="pl-12 h-14 text-lg bg-background border-2 border-border/50 rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.02)] hover:border-border focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10 transition-all"
                  ref={inputRef}
                  onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                    if (event.key === "Enter" && inputRef.current?.value.trim()) {
                      router.push(`/contracts/${inputRef.current.value}`);
                    }
                  }}
                />
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "Latest blocks",
                    "Recent transactions",
                    "Top tokens",
                    "Active contracts",
                  ].map((item) => (
                    <button
                      key={item}
                      className="px-4 py-2 rounded-full bg-background border border-border text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
