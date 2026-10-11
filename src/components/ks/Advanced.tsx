"use client";

import { useState, type ReactNode } from "react";
import * as toast from "@/lib/toast";

/** The one disclosure per page. */
export function Advanced({ children, label = "Advanced", defaultOpen = false }: { children: ReactNode; label?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`ks-advanced${open ? " open" : ""}`}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="ks-c">›</span> {label}
      </button>
      <div className="ks-body">{children}</div>
    </section>
  );
}

/** Key on the left, value on the right, hairline above. */
export function KV({ k, children, mono = false }: { k: ReactNode; children: ReactNode; mono?: boolean }) {
  return (
    <div className="ks-kv">
      <span className="ks-k">{k}</span>
      <span className={`ks-v${mono ? " ks-mono" : ""}`}>{children}</span>
    </div>
  );
}

export function Lines({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ks-lines ${className}`}>{children}</div>;
}

export function Mono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`ks-mono ${className}`}>{children}</span>;
}

/** A tiny "copy" pill that confirms itself. */
export function CopyButton({ value, label = "copy", what = "Copied" }: { value: string; label?: string; what?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="ks-copy"
      aria-label={`Copy ${value}`}
      onClick={() => {
        navigator.clipboard.writeText(value).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          },
          () => toast.error(`${what} could not be copied`),
        );
      }}
    >
      {done ? "copied" : label}
    </button>
  );
}

/** "View raw JSON ›" that reveals a pre block. */
export function RawJson({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="ks-rawlink" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {open ? "Hide raw JSON ‹" : "View raw JSON ›"}
      </button>
      {open && <pre className="ks-raw">{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
