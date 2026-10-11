// The handful of line icons the chrome and the pages use. Inline so they
// pick up currentColor and need no icon library.

type IconProps = { className?: string; strokeWidth?: number };

export function SearchIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function BurgerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M4 9h16M4 15h16" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ArrowIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className={className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function BlockGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M12 2l8 4.6v9.2L12 20.4 4 15.8V6.6z" />
      <path d="M12 11v9.4M12 11l8-4.4M12 11L4 6.6" />
    </svg>
  );
}

export function CallGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M8 10l2 2-2 2M12 14h4" />
    </svg>
  );
}

export function SystemGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function GovGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M4 20h16M6 20V10M10 20V10M14 20V10M18 20V10M3 10l9-6 9 6z" />
    </svg>
  );
}

export function UtilGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M14 7l3 3-8 8H6v-3z" />
      <path d="M13 8l3 3" />
    </svg>
  );
}

export function PoolGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" />
    </svg>
  );
}

export function TradeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
    </svg>
  );
}

export function WalletGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18M16 14h2" />
    </svg>
  );
}

export function UploadGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <path d="M12 16V5M12 5l-4 4M12 5l4 4M5 19h14" />
    </svg>
  );
}

/** The Fogata flame drawn in the three logo colours. */
export function Flame({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="ks-flame-gradient" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#522fe3" />
          <stop offset=".55" stopColor="#e05252" />
          <stop offset="1" stopColor="#e4b80c" />
        </linearGradient>
      </defs>
      <path fill="url(#ks-flame-gradient)" d="M33 4c2 10 13 15 13 30a14 14 0 0 1-28 0c0-6 3-11 7-14 .5 5 3 8 6 9 1-9-2-16 2-25z" />
      <path fill="#fff" opacity=".9" d="M32 32c1 5 6 7 6 13a6 6 0 0 1-12 0c0-3 1.5-5 3-6 .3 2 1.2 3.4 2.6 4 .6-4-.8-7 .4-11z" />
    </svg>
  );
}
