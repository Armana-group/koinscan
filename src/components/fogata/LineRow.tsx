import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface LineRowProps {
  label: ReactNode;
  children?: ReactNode;
  /** Makes the whole row a link; adds a chevron. */
  href?: string;
  /** Makes the whole row a button; adds a chevron. */
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A key on the left, a value on the right, a hairline underneath. Wrap a run
 * of them in <LineList> to get the top rule.
 */
export function LineRow({ label, children, href, onClick, disabled, className }: LineRowProps) {
  const base = cn(
    "flex w-full items-center justify-between gap-6 border-b border-border py-3.5 text-left text-sm",
    className
  );
  const body = (
    <>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="inline-flex min-w-0 items-center gap-2 text-right">
        {children}
        {(href || onClick) && (
          <span aria-hidden className="text-muted-foreground/60">›</span>
        )}
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cn(base, "transition-colors hover:text-foreground")}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(base, "transition-colors hover:text-foreground disabled:opacity-50")}
      >
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}

export function LineList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border-t border-border", className)}>{children}</div>;
}
