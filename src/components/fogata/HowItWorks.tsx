import type { ReactNode } from "react";

interface HowItWorksProps {
  /** Plain-language explanation, a few short paragraphs. Collapsed by default. */
  children: ReactNode;
  /** The disclosure's label. */
  label?: string;
}

export function HowItWorks({ children, label = "How it works" }: HowItWorksProps) {
  return (
    <details className="group mt-3 text-sm">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        {label}
        <span aria-hidden className="inline-block text-xs transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-2 max-w-[60ch] space-y-2 leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  );
}
