import { cn } from "@/lib/utils";

export interface ShareSegment {
  label: string;
  /** Percent of the whole, 0–100. */
  share: number;
  /** Extra detail for the hover title, e.g. "35.4K VHP". */
  detail?: string;
}

interface ShareBarProps {
  /** Named parts of the whole, in display order. The remainder is the track. */
  segments: ShareSegment[];
  remainderLabel: string;
  className?: string;
}

/**
 * One thin proportion bar: the named segments in foreground on a muted
 * track that stands for the rest of the whole. Segments are told apart by
 * order and the legend beneath, not by hue; a 2px surface gap separates
 * neighbours, and a sliver is held at 4px so it stays visible.
 */
export function ShareBar({ segments, remainderLabel, className }: ShareBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.share, 0);
  const remainder = Math.max(0, 100 - total);
  const summary = [...segments.map((s) => `${s.label} ${s.share.toFixed(1)}%`), `${remainderLabel} ${remainder.toFixed(1)}%`].join(", ");

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={summary}
        className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        {segments.map((segment) => (
          <span
            key={segment.label}
            title={[segment.label, segment.detail, `${segment.share.toFixed(1)}%`].filter(Boolean).join(" · ")}
            className="block h-full min-w-[4px] rounded-full bg-foreground"
            style={{ width: `${segment.share}%` }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
        {segments.map((segment) => (
          <li key={segment.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span className="text-foreground">{segment.label}</span> {segment.share.toFixed(1)}%
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full bg-muted")} />
          {remainderLabel} {remainder.toFixed(1)}%
        </li>
      </ul>
    </div>
  );
}
