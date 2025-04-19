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
        "bg-amber-100 text-amber-800 dark:bg-indigo-900/30 dark:text-yellow-300",
        className,
      )}
    >
      <span>{message}</span>
    </div>
  )
} 