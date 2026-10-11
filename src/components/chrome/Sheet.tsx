"use client";

// A centred white card in the same language as the menu and search cards.
// Radix provides the focus trap and escape handling; the page behind steps
// back the same way it does for the menu.
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, type ReactNode } from "react";
import { useChrome } from "./ChromeProvider";
import { CloseIcon } from "./icons";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** A short line under the title, usually a guide link. */
  subtitle?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}

export function Sheet({ open, onOpenChange, title, subtitle, wide, children }: SheetProps) {
  const { setSheetOpen } = useChrome();

  useEffect(() => {
    if (!open) return;
    setSheetOpen(true);
    return () => setSheetOpen(false);
  }, [open, setSheetOpen]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ks-sheet-overlay" />
        <DialogPrimitive.Content className={`ks-sheet${wide ? " wide" : ""}`} aria-describedby={undefined}>
          <DialogPrimitive.Close className="ks-burger ks-close" aria-label="Close">
            <CloseIcon />
          </DialogPrimitive.Close>
          <DialogPrimitive.Title asChild>
            <h3>{title}</h3>
          </DialogPrimitive.Title>
          {subtitle && <div className="ks-guide-wrap">{subtitle}</div>}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
