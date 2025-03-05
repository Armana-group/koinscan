import { Navigation } from "./navigation";
import { Logo } from "./Logo";
import { WalletButton } from "./WalletButton";
import { ThemeToggle } from "./theme-toggle";
import { Menu } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

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
                  Explorer
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
              <div className="px-2 py-2">
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
          <Navigation />
        </div>

        {/* Wallet Button (Right) */}
        <div className="flex w-[200px] justify-end items-center gap-2">
          <WalletButton />
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
} 