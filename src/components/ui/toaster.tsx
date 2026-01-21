"use client"

import { useTheme } from "next-themes"
import { Toaster as HotToaster } from "react-hot-toast"
import { useEffect, useState } from "react"

export function Toaster() {
  const { theme = "system" } = useTheme()
  const [isDark, setIsDark] = useState(false)
  
  useEffect(() => {
    // Only access window object on client side
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const updateIsDark = () => {
      setIsDark(
        theme === "dark" || 
        (theme === "system" && darkModeQuery.matches)
      )
    }
    
    updateIsDark()
    darkModeQuery.addEventListener("change", updateIsDark)
    
    return () => {
      darkModeQuery.removeEventListener("change", updateIsDark)
    }
  }, [theme])

  return (
    <HotToaster
      position="bottom-center"
      toastOptions={{
        className: "!bg-background !text-foreground border-border shadow-lg",
        style: {
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          maxWidth: '420px',
        },
        success: {
          iconTheme: {
            primary: '#f5a623', // brand gold (logo-color-2)
            secondary: isDark ? '#1f2937' : '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444', // red
            secondary: isDark ? '#1f2937' : '#ffffff',
          },
        },
      }}
    />
  )
} 