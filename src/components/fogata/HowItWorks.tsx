"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface HowItWorksProps {
  /** Plain-language explanation shown in the dialog. */
  children: ReactNode;
  /** The trigger label and dialog title. */
  label?: string;
}

export function HowItWorks({ children, label = "How it works" }: HowItWorksProps) {
  return (
    <Dialog>
      <div className="mt-3 text-sm">
        <DialogTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {label}
            <span aria-hidden className="text-xs">›</span>
          </button>
        </DialogTrigger>
      </div>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-[22px] sm:max-w-xl sm:rounded-[22px]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="pr-6">{label}</DialogTitle>
        </DialogHeader>
        <DialogDescription asChild>
          <div className="min-h-0 space-y-3 overflow-y-auto leading-relaxed">{children}</div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
