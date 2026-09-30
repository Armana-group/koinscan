import { cn } from "@/lib/utils";

interface WordTabsProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
  /** `lg` on pages, `md` inside sheets. */
  size?: "lg" | "md";
}

/**
 * Two or three words with an underline under the active one. Replaces the
 * segmented control: the choice is a word, not a widget.
 */
export function WordTabs<T extends string>({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
  size = "lg",
}: WordTabsProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex gap-6 font-medium", size === "lg" ? "text-[15px]" : "text-sm")}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative pb-2 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
              active
                ? "text-foreground after:bg-foreground"
                : "text-muted-foreground/70 hover:text-foreground after:bg-transparent",
              "disabled:opacity-60"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
