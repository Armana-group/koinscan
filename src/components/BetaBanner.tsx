"use client";

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface BetaBannerProps {
  message?: string
  className?: string
}

export function BetaBanner({
  message = "This is an early beta version. Some features may not work as expected.",
  className,
}: BetaBannerProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Only render on client to avoid hydration issues
  if (!isMounted) {
    return null
  }

  return (
    <div
      className={cn(
        "w-full px-4 py-2 text-sm text-center",
        "text-amber-700 dark:text-amber-400/80",
        className,
      )}
    >
      <span>{message}</span>
    </div>
  )
} 