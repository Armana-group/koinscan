import Link from "next/link";
import type { ReactNode } from "react";

/** The one column every inner page lives in. */
export function Page({ children, list = false, className = "" }: { children: ReactNode; list?: boolean; className?: string }) {
  return <div className={`ks-main${list ? " list" : ""} ${className}`}>{children}</div>;
}

/** "‹ Blocks" on the left, anything on the right. */
export function Crumb({ back, backHref, right }: { back: string; backHref: string; right?: ReactNode }) {
  return (
    <div className="ks-crumb">
      <Link href={backHref}>‹ {back}</Link>
      {right ?? <span />}
    </div>
  );
}

export function Title({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`ks-h1 ${className}`}>{children}</h1>;
}

export function Lede({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`ks-lede ${className}`}>{children}</p>;
}

export type DotTone = "ok" | "pending" | "failed" | "late" | "paused" | "quiet";

export function Dot({ tone = "ok" }: { tone?: DotTone }) {
  return <span className={`ks-dot${tone === "ok" ? "" : ` ${tone}`}`} />;
}

export function Status({ tone = "ok", children }: { tone?: DotTone; children: ReactNode }) {
  return (
    <p className="ks-status">
      <Dot tone={tone} />
      <span>{children}</span>
    </p>
  );
}

export function Section({ children, label, className = "" }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <section className={`ks-section ${className}`} aria-label={label}>
      {children}
    </section>
  );
}

export function H2({ children, count, action }: { children: ReactNode; count?: ReactNode; action?: ReactNode }) {
  const heading = (
    <h2 className="ks-h2">
      {children}
      {count !== undefined && count !== null && <span>{count}</span>}
    </h2>
  );
  if (!action) return heading;
  return (
    <div className="ks-head">
      {heading}
      {action}
    </div>
  );
}

export function Group({ children }: { children: ReactNode }) {
  return <div className="ks-group">{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="ks-empty">{children}</div>;
}

export function Foot({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`ks-foot ${className}`}>{children}</p>;
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="ks-note">{children}</p>;
}

/** Placeholder lines while a page loads. */
export function Skeleton({ lines = 3, title = true }: { lines?: number; title?: boolean }) {
  return (
    <div aria-busy="true" className="space-y-4">
      {title && <div className="ks-skel" style={{ height: 52, width: "60%" }} />}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="ks-skel" style={{ height: 18, width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function RowSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="ks-row no-chev" style={{ borderBottom: i === rows - 1 ? "1px solid var(--line)" : undefined }}>
          <span className="ks-skel" style={{ width: 40, height: 40, borderRadius: 20 }} />
          <span className="ks-skel" style={{ height: 16, width: "55%" }} />
          <span className="ks-skel" style={{ height: 16, width: 72 }} />
        </div>
      ))}
    </div>
  );
}
