"use client";

import { NavigationWithSearch } from "./NavigationWithSearch";
import { Logo } from "./Logo";
import { WalletButton } from "./WalletButton";
import { ThemeToggle } from "./theme-toggle";
import { RpcNodePicker } from "./RpcNodePicker";
import { Menu, Settings } from "lucide-react";
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

const menuItems = [
  { name: "Home", href: "/" },
  { name: "Blocks", href: "/blocks" },
  { name: "Tokens", href: "/tokens" },
  { name: "Contracts", href: "/contracts" },
  { name: "Network", href: "/network" },
  { name: "Fogata", href: "/fogata" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="w-full bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between px-4 py-4 md:px-8">
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
                <Logo showBetaBadge />
              </div>
              <DropdownMenuSeparator />
              {menuItems.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

                return (
                  <Link key={item.name} href={item.href}>
                    <DropdownMenuItem className={isActive ? "bg-accent" : ""}>
                      {item.name}
                    </DropdownMenuItem>
                  </Link>
                );
              })}
              <DropdownMenuSeparator />
              <div className="px-2 py-2 space-y-2">
                <RpcNodePicker compact />
                <ThemeToggle />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop Logo (Left) */}
        <div className="hidden md:flex w-[200px] justify-start">
          <Logo showBetaBadge />
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
                  className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted/50 transition-colors duration-300"
                >
                  <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 p-4 bg-background/95 backdrop-blur-sm border border-border/80 shadow-lg rounded-xl"
                sideOffset={8}
              >
                <RpcNodePicker />
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
