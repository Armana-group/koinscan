"use client";

import type { ReactNode } from "react";

export interface StackPart {
  label: ReactNode;
  value: number;
  colour: string;
}

/** One bar split into parts, with a key showing each part's share. */
export function StackBar({ parts, label }: { parts: readonly StackPart[]; label: string }) {
  const total = parts.reduce((sum, p) => sum + Math.max(0, p.value), 0) || 1;
  return (
    <div className="ks-stack-bar">
      <div className="bar" role="img" aria-label={label}>
        {parts.map((p, i) => (
          <i key={i} style={{ flexGrow: Math.max(0, p.value), background: p.colour }} />
        ))}
      </div>
      <ul>
        {parts.map((p, i) => (
          <li key={i}>
            <i style={{ background: p.colour }} />
            <span>{p.label}</span>
            <em>{((100 * Math.max(0, p.value)) / total).toFixed(1)}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
