import { NavigationWithSearch } from "./NavigationWithSearch";
import { Logo } from "./Logo";
import { WalletButton } from "./WalletButton";
import { ThemeToggle } from "./theme-toggle";
import { Menu, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { RPC_NODE_STORAGE_KEY, useWallet } from "@/contexts/WalletContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Input } from "./ui/input";
import { Provider } from "koilib";

export function Navbar() {
  const pathname = usePathname();
  const { provider, setProvider } = useWallet();
  const [newRpcNode, setNewRpcNode] = useState("");

  const handleRpcNodeChange = () => {
    if (newRpcNode) {
      // Update local storage
      localStorage.setItem(RPC_NODE_STORAGE_KEY, newRpcNode);
      
      // Update provider in WalletContext
      const newProvider = new Provider([newRpcNode]);
      setProvider(newProvider);
      
      // Clear input
      setNewRpcNode("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newRpcNode) {
      handleRpcNodeChange();
    }
  };

  return (
    <div className="bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between px-4 md:px-4 py-6">
        {/* Mobile Menu (Left) */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full -ml-1">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 mt-2">
              <div className="px-2 py-2">
                <Logo />
              </div>
              <DropdownMenuSeparator />
              <Link href="/">
                <DropdownMenuItem className={pathname === "/" ? "bg-accent" : ""}>
                  Home
                </DropdownMenuItem>
              </Link>
              <Link href="/blocks">
                <DropdownMenuItem className={pathname === "/blocks" ? "bg-accent" : ""}>
                  Blocks
                </DropdownMenuItem>
              </Link>
              <Link href="/tokens">
                <DropdownMenuItem className={pathname === "/tokens" ? "bg-accent" : ""}>
                  Tokens
                </DropdownMenuItem>
              </Link>
              <Link href="/contracts">
                <DropdownMenuItem className={pathname === "/contracts" ? "bg-accent" : ""}>
                  Contracts
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <div className="px-2 py-2 space-y-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">RPC Node</div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newRpcNode}
                      onChange={(e) => setNewRpcNode(e.target.value)}
                      placeholder={(provider as Provider)?.rpcNodes[0]}
                      className="h-8 text-xs"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRpcNodeChange}
                      className="h-8 px-2"
                      disabled={!newRpcNode}
                    >
                      Save
                    </Button>
                  </div>
                </div>
                <ThemeToggle />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop Logo (Left) */}
        <div className="hidden md:flex w-[200px] justify-start">
          <Logo />
        </div>

        {/* Desktop Navigation (Center) */}
        <div className="hidden md:flex flex-1 justify-center">
          <NavigationWithSearch />
        </div>

        {/* Wallet Button and Settings (Right) */}
        <div className="flex w-[200px] justify-end items-center gap-2">
          <WalletButton />
          <div className="hidden md:flex items-center gap-2">
            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted/50 transition-all duration-300"
                >
                  <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-72 p-4 bg-background/95 backdrop-blur-sm border border-border/80 shadow-lg rounded-xl"
                sideOffset={8}
              >
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium mb-2">RPC Node</div>
                    <div className="text-sm text-muted-foreground mb-3">{(provider as Provider)?.rpcNodes[0]}</div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newRpcNode}
                        onChange={(e) => setNewRpcNode(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter new RPC node URL"
                        className="flex-1"
                      />
                      <Button
                        onClick={handleRpcNodeChange}
                        disabled={!newRpcNode}
                        variant="secondary"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
} 