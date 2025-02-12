"use client";

import { ConfigProvider } from "antd";
import theme from "./theme";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Navigation } from "@/components/navigation";
import { AuroraText } from "@/components/magicui/aurora-text";

export default function Home() {
  return (
    <ConfigProvider theme={theme}>
      <div className="min-h-screen bg-background transition-colors duration-300">
        <div className="container mx-auto px-4">
          {/* Navigation */}
          <div className="pt-8">
            <Navigation />
          </div>

          {/* Main Content */}
          <main className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center -mt-16">
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
          </main>

          {/* Theme Toggle */}
          <div className="fixed bottom-8 left-8">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
