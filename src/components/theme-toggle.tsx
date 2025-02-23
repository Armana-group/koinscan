import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative inline-flex items-center justify-center rounded-full w-10 h-10 hover:bg-muted/50 transition-all duration-300"
      aria-label="Toggle theme"
    >
      <span className="relative">
        <Sun 
          className="h-[18px] w-[18px] transition-all duration-500 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" 
          strokeWidth={1.5}
        />
        <Moon 
          className="absolute top-0 left-0 h-[18px] w-[18px] transition-all duration-500 rotate-90 scale-0 dark:rotate-0 dark:scale-100" 
          strokeWidth={1.5}
        />
      </span>
    </button>
  )
} 