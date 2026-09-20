import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const views = [
  { key: "pools", label: "Pools", href: "/fogata" },
  { key: "trade", label: "Trade", href: "/fogata/trade" },
] as const;

interface SectionNavProps {
  active: (typeof views)[number]["key"];
  /** Plain-language explanation shown under a collapsed "How it works" disclosure. */
  children: ReactNode;
}

export function SectionNav({ active, children }: SectionNavProps) {
  return (
    <div className="mt-5">
      <nav
        aria-label="Fogata"
        className="inline-grid grid-cols-2 gap-0.5 rounded-[9px] bg-muted p-[3px]"
      >
        {views.map((view) => {
          const isActive = view.key === active;
          return (
            <Link
              key={view.key}
              href={view.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-[7px] px-6 py-1.5 text-center text-sm transition-colors",
                isActive
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {view.label}
            </Link>
          );
        })}
      </nav>
      <details className="group mt-4 text-sm">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          How it works
          <span aria-hidden className="inline-block text-xs transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="mt-2 max-w-[60ch] space-y-2 leading-relaxed text-muted-foreground">
          {children}
        </div>
      </details>
    </div>
  );
}
