"use client";

// Pieces shared by the create-pool and manage-pool sheets.

export interface Beneficiary {
  address: string;
  percentage: number;
}

const KOIN_SCALE = 1e8;

export function toBaseUnits(amount: string): string {
  const value = parseFloat(amount);
  if (Number.isNaN(value) || value <= 0) return "0";
  return Math.floor(value * KOIN_SCALE).toString();
}

/** The first problem with the pool parameters, or null when they are fine. */
export function validatePoolParams({ name, days, beneficiaries }: { name: string; days: string; beneficiaries: Beneficiary[] }): string | null {
  const period = Number(days);
  const total = beneficiaries.reduce((sum, b) => sum + b.percentage, 0);
  if (!name.trim()) return "Pool name is required";
  if (!Number.isFinite(period) || period <= 0) return "Payout period must be greater than zero";
  if (beneficiaries.some((b) => !b.address.trim() || !Number.isFinite(b.percentage) || b.percentage <= 0)) return "Each beneficiary needs an address and a positive percentage";
  if (total > 100_000) return "Beneficiary percentages cannot exceed 100%";
  return null;
}

export function BeneficiariesEditor({ beneficiaries, onChange, disabled }: { beneficiaries: Beneficiary[]; onChange: (next: Beneficiary[]) => void; disabled?: boolean }) {
  const total = beneficiaries.reduce((sum, b) => sum + b.percentage, 0) / 1000;
  return (
    <div>
      <div className="ks-head" style={{ marginTop: 16, marginBottom: 6 }}>
        <span className="ks-field-label" style={{ margin: 0 }}>
          Beneficiaries · {total}% fee
        </span>
        <button type="button" className="ks-btn ghost sm" onClick={() => onChange([...beneficiaries, { address: "", percentage: 0 }])} disabled={disabled}>
          Add
        </button>
      </div>
      {beneficiaries.length === 0 && <p className="ks-foot" style={{ marginTop: 0 }}>No fee. Add a beneficiary to take a share of the rewards.</p>}
      {beneficiaries.map((beneficiary, index) => (
        <div key={index} className="flex items-center gap-2" style={{ marginTop: 8 }}>
          <input
            aria-label={`Beneficiary ${index + 1} address`}
            placeholder="Beneficiary address"
            className="ks-input"
            value={beneficiary.address}
            onChange={(e) => onChange(beneficiaries.map((item, i) => (i === index ? { ...item, address: e.target.value } : item)))}
            disabled={disabled}
          />
          <input
            aria-label={`Beneficiary ${index + 1} percentage`}
            type="text"
            inputMode="decimal"
            placeholder="%"
            className="ks-input"
            style={{ width: 88, flex: "none" }}
            value={beneficiary.percentage / 1000}
            onChange={(e) => onChange(beneficiaries.map((item, i) => (i === index ? { ...item, percentage: Math.round(Number(e.target.value) * 1000) } : item)))}
            disabled={disabled}
          />
          <button type="button" className="ks-copy" aria-label={`Remove beneficiary ${index + 1}`} onClick={() => onChange(beneficiaries.filter((_, i) => i !== index))} disabled={disabled}>
            remove
          </button>
        </div>
      ))}
    </div>
  );
}
