"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "./ui/input";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useSearch } from "./SearchProvider";

interface NavItem {
  name: string;
  href: string;
}

const navs: NavItem[] = [
  { name: "Home", href: "/" },
  { name: "Blocks", href: "/blocks" },
  { name: "Tokens", href: "/tokens" },
  { name: "Contracts", href: "/contracts" },
  { name: "Network", href: "/network" },
  { name: "dApps", href: "/dapps" },
];

export function NavigationWithSearch() {
  const { searchQuery, setSearchQuery, isSearching, handleSearch } = useSearch();
  const ref = useRef<HTMLUListElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  // States for the navigation hover effect
  const [left, setLeft] = useState(0);
  const [width, setWidth] = useState(0);
  const [opacity, setOpacity] = useState(0);
  
  // State for the search expansion
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // Collapse search when clicking outside
  useClickOutside(searchContainerRef, () => {
    if (isSearchExpanded) {
      setIsSearchExpanded(false);
    }
  });

  // Handle ESC key to collapse search
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchExpanded) {
        setIsSearchExpanded(false);
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [isSearchExpanded]);

  // Focus search input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLLIElement>) => {
    if (!isSearchExpanded) {
      const node = e.currentTarget;
      const rect = node.getBoundingClientRect();
      setLeft(node.offsetLeft);
      setWidth(rect.width);
      setOpacity(1);
    }
  };

  const handleMouseLeave = () => {
    if (!isSearchExpanded) {
      setOpacity(0);
    }
  };

  const toggleSearch = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (isSearchExpanded) {
      setSearchQuery(""); // Clear search input when closing
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    await handleSearch();
    setIsSearchExpanded(false); // Close search after submitting
  };

  return (
    <nav>
      <div
        className="relative h-10"
        ref={searchContainerRef}
      >
        <AnimatePresence mode="wait">
          {isSearchExpanded ? (
            <motion.div
              key="search"
              initial={{ width: "60px", opacity: 0 }}
              animate={{ width: "650px", opacity: 1 }}
              exit={{ width: "60px", opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute left-1/2 transform -translate-x-1/2 z-20"
            >
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by address, transaction ID, block number, or @nickname"
                  className="pl-12 pr-12 h-10 text-sm bg-background border border-border rounded-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isSearching}
                />
                <button
                  type="button"
                  onClick={toggleSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.ul
              key="navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseLeave={handleMouseLeave}
              className="absolute left-1/2 transform -translate-x-1/2 flex w-fit rounded-full border border-border bg-background/50 p-1"
              ref={ref}
            >
              {navs.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <li
                    key={item.name}
                    onMouseEnter={handleMouseEnter}
                    className="z-10 block cursor-pointer mb-0"
                  >
                    <Link
                      href={item.href}
                      className={`px-6 py-2 text-sm transition-colors duration-200 block ${
                        isActive
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground/60 hover:text-muted-foreground"
                      }`}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}
              <li
                className="z-10 block cursor-pointer mb-0"
                onMouseEnter={handleMouseEnter}
              >
                <button
                  onClick={toggleSearch}
                  className="px-6 py-2 text-sm transition-colors duration-200 flex items-center justify-center h-full text-muted-foreground/60 hover:text-muted-foreground"
                >
                  <Search className="h-4 w-4" />
                </button>
              </li>
              <motion.div
                animate={{ left, width, opacity }}
                initial={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute inset-y-1 rounded-full bg-accent"
                style={{ position: 'absolute', height: 'calc(100% - 8px)' }}
              />
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
} 