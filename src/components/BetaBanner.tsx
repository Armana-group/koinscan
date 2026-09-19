import { cn } from "@/lib/utils"

interface BetaBannerProps {
  message?: string
  className?: string
}

export function BetaBanner({
  message = "This is an early beta version. Some features may not work as expected.",
  className,
}: BetaBannerProps) {
  return (
    <div
      className={cn(
        "w-full text-center text-xs leading-5",
        "text-amber-700 dark:text-amber-400/80",
        className,
      )}
    >
      <span>{message}</span>
    </div>
  )
}
