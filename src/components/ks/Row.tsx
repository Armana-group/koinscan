"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { hue, initials } from "@/lib/format";
import { BlockGlyph, CallGlyph, GovGlyph, PoolGlyph, SystemGlyph, TradeGlyph, UploadGlyph, UtilGlyph, WalletGlyph } from "@/components/chrome/icons";

export type AmountTone = "in" | "out" | "plain";

interface RowProps {
  /** Avatar, token mark or glyph on the left. */
  lead?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  /** Shown only when the page is in Advanced mode. */
  hash?: ReactNode;
  amount?: ReactNode;
  amountSub?: ReactNode;
  amountTone?: AmountTone;
  href?: string;
  onClick?: () => void;
  /** Hides the chevron on the right. */
  flat?: boolean;
  /** Something that replaces the amount column (e.g. a copy button). */
  right?: ReactNode;
  className?: string;
  /** A row that moved in a moment ago gets a short gold flash. */
  fresh?: boolean;
  last?: boolean;
}

/** One hairline row: lead, what, amount, chevron. */
export function Row({ lead, title, detail, hash, amount, amountSub, amountTone = "plain", href, onClick, flat, right, className = "", fresh, last }: RowProps) {
  const chev = !flat && (href || onClick);
  const classes = ["ks-row", lead ? "" : "no-lead", chev ? "" : "no-chev", fresh ? "new" : "", last ? "last" : "", className].filter(Boolean).join(" ");
  const body = (
    <>
      {lead}
      <span className="ks-what">
        <span className="ks-t">{title}</span>
        {detail && <span className="ks-d">{detail}</span>}
        {hash && <span className="ks-hash">{hash}</span>}
      </span>
      {right ?? (
        <span className={`ks-amt ${amountTone}`}>
          {amount}
          {amountSub && <span className="ks-s">{amountSub}</span>}
        </span>
      )}
      {chev ? <span className="ks-chev">›</span> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className={classes}>{body}</div>;
}

/** Initials in a circle: gold for named accounts, a stable hue for unknown ones. */
export function Avatar({ address, name, large = false }: { address: string; name?: string | null; large?: boolean }) {
  const size = large ? " lg" : "";
  if (name) return <span className={`ks-avatar gold${size}`}>{initials(name, address)}</span>;
  return (
    <span className={`ks-avatar${size}`} style={{ background: `hsl(${hue(address)} 22% 48%)` }}>
      {initials(null, address)}
    </span>
  );
}

const TOKEN_IMAGES = "https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/";

/** A token's logo in a white circle, with its initials when there is no image. */
export function TokenMark({ symbol, address, logo, large = false }: { symbol: string; address?: string; logo?: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = logo || (address ? `${TOKEN_IMAGES}${address}.png` : undefined);
  return (
    <span className={`ks-mark${large ? " lg" : ""}`}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailed(true)} loading="lazy" />
      ) : (
        <b>{symbol.slice(0, 2).toUpperCase()}</b>
      )}
    </span>
  );
}

export type GlyphName = "block" | "call" | "system" | "gov" | "util" | "pool" | "trade" | "wallet" | "upload" | "koin" | "vhp";

const GLYPHS: Record<GlyphName, () => ReactNode> = {
  block: BlockGlyph,
  call: CallGlyph,
  system: SystemGlyph,
  gov: GovGlyph,
  util: UtilGlyph,
  pool: PoolGlyph,
  trade: TradeGlyph,
  wallet: WalletGlyph,
  upload: UploadGlyph,
  koin: BlockGlyph,
  vhp: BlockGlyph,
};

/** A line glyph in a white circle. */
export function GlyphMark({ glyph, large = false }: { glyph: GlyphName; large?: boolean }) {
  if (glyph === "koin") return <TokenMark symbol="KOIN" address="koin" large={large} />;
  if (glyph === "vhp") return <TokenMark symbol="VHP" address="vhp" large={large} />;
  const Glyph = GLYPHS[glyph];
  return (
    <span className={`ks-mark glyph${large ? " lg" : ""}`}>
      <Glyph />
    </span>
  );
}

/** "Earlier" / "22 more" at the foot of a list. */
export function More({ children, onClick, href, disabled }: { children: ReactNode; onClick?: () => void; href?: string; disabled?: boolean }) {
  if (href) {
    return (
      <Link href={href} className="ks-more">
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className="ks-more" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
