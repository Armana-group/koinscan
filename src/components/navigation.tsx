"use client";

import { motion } from "framer-motion";
import React, { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface NavItem {
  name: string;
  href: string;
}

const navs: NavItem[] = [
  { name: "Explorer", href: "/" },
  { name: "Blocks", href: "/blocks" },
  { name: "Transactions", href: "/transactions" },
  { name: "Tokens", href: "/tokens" },
  { name: "Contracts", href: "/contracts" },
];

export function Navigation() {
  const ref = useRef<HTMLUListElement>(null);
  const [left, setLeft] = useState(0);
  const [width, setWidth] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const pathname = usePathname();

  const handleMouseEnter = (e: React.MouseEvent<HTMLLIElement>) => {
    const node = e.currentTarget;
    const rect = node.getBoundingClientRect();
    setLeft(node.offsetLeft);
    setWidth(rect.width);
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <nav className="flex-1">
      <ul
        onMouseLeave={handleMouseLeave}
        className="relative mx-auto flex w-fit rounded-full border border-border bg-background/50 p-1"
        ref={ref}
      >
        {navs.map((item) => {
          const isActive = pathname === item.href;
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
        <motion.div
          animate={{ left, width, opacity }}
          initial={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute inset-y-1 rounded-full bg-accent"
          style={{ position: 'absolute', height: 'calc(100% - 8px)' }}
        />
      </ul>
    </nav>
  );
} 