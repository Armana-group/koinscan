import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { sanitizeDecimalInput } from "@/lib/fogata";

interface AmountFieldProps {
  id: string;
  /** Short label above the number: "You sell", "Amount". */
  label: string;
  /** Token symbol shown after the number. */
  unit: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Renders a Max action in the label row when provided. */
  onMax?: () => void;
  maxDisabled?: boolean;
  /** Right side of the label row when there is no Max (a price, a balance). */
  hint?: ReactNode;
  /** `lg` on pages, `md` inside sheets. */
  size?: "lg" | "md";
  autoFocus?: boolean;
  /** The value was filled in for the user; shown muted until they edit it. */
  suggested?: boolean;
}

/**
 * A big number on a hairline. Plain text input with a decimal keyboard, so
 * there are no spinner arrows and no exponent notation; the rule under it
 * brightens on focus instead of drawing a ring.
 */
export function AmountField({
  id,
  label,
  unit,
  value,
  onChange,
  disabled,
  onMax,
  maxDisabled,
  hint,
  size = "lg",
  autoFocus,
  suggested,
}: AmountFieldProps) {
  return (
    <div className="border-b border-border pb-3 transition-colors focus-within:border-foreground">
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <label htmlFor={id}>{label}</label>
        {onMax ? (
          <button
            type="button"
            className="font-medium text-foreground disabled:opacity-40"
            onClick={onMax}
            disabled={disabled || maxDisabled}
          >
            Max
          </button>
        ) : (
          hint && <span className="tabular-nums">{hint}</span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2.5">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="0"
          aria-label={`${label} (${unit})`}
          className={cn(
            "w-full min-w-0 bg-transparent font-semibold leading-none tracking-[-0.045em] tabular-nums outline-none placeholder:text-muted-foreground/50 disabled:opacity-60",
            size === "lg" ? "text-[44px]" : "text-[40px]",
            suggested && "text-muted-foreground"
          )}
          value={value}
          onChange={(event) => onChange(sanitizeDecimalInput(event.target.value))}
          disabled={disabled}
          autoFocus={autoFocus}
        />
        <span className="text-[17px] font-medium text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
