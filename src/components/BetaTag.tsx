import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BetaTagProps {
  className?: string;
}

export function BetaTag({ className }: BetaTagProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "align-middle text-[10px] font-semibold uppercase tracking-wide",
        "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        className
      )}
    >
      Beta
    </Badge>
  );
}
