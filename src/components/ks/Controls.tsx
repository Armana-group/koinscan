"use client";

import type { ReactNode } from "react";

/** Pill filters: the active one is ink on sheet. */
export function Filters<T extends string>({
  options,
  value,
  onChange,
  top = false,
  label = "Filter",
}: {
  options: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  top?: boolean;
  label?: string;
}) {
  return (
    <div className={`ks-filters${top ? " top" : ""}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className={option.value === value ? "on" : undefined} aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The small "Advanced" switch beside a filter row. */
export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" className="ks-adv" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span>{label}</span>
      <span className={`ks-sw${on ? " on" : ""}`} aria-hidden="true" />
    </button>
  );
}

/** KOIN | VHP, inside sheets. */
export function Segmented<T extends string>({ options, value, onChange, disabled }: { options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; disabled?: boolean }) {
  return (
    <div className="ks-toggle" role="group">
      {options.map((option) => (
        <button key={option.value} type="button" className={option.value === value ? "on" : undefined} aria-pressed={option.value === value} onClick={() => onChange(option.value)} disabled={disabled}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The big amount field inside deposit and trade sheets. */
export function AmountInput({
  id,
  value,
  onChange,
  unit,
  onMax,
  maxDisabled,
  disabled,
  autoFocus,
  placeholder = "0",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  onMax?: () => void;
  maxDisabled?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="ks-amount">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={`Amount in ${unit}`}
      />
      <span className="ks-unit">{unit}</span>
      {onMax && (
        <button type="button" className="ks-max" onClick={onMax} disabled={disabled || maxDisabled}>
          Max
        </button>
      )}
    </div>
  );
}

export function Field({ id, label, children, hint }: { id?: string; label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="ks-field-label">
        {label}
      </label>
      {children}
      {hint && <p className="ks-foot" style={{ marginTop: 6, fontSize: 12 }}>{hint}</p>}
    </div>
  );
}
