/**
 * Class strings shared by the Fogata pages. The section's visual language is
 * "editorial": big type on hairlines, no outlined boxes, one solid shape per
 * screen. Keeping the recipe here means every page agrees on the column,
 * the title and the two button shapes.
 */

/**
 * The page frame for every Fogata page: one column wide enough for a 56px
 * number on phones; from 1024px it widens so a page can split into two
 * columns (splitColumns) or show a table.
 */
export const pageWide = "mx-auto w-full max-w-[520px] px-5 py-10 lg:max-w-[1080px]";

/** Two top-aligned columns from 1024px; a single stack below. */
export const splitColumns = "lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-16";

export const pageTitle = "text-[34px] font-semibold leading-none tracking-[-0.03em]";

export const backLink = "mb-7 inline-block text-[13px] text-muted-foreground hover:text-foreground";

/** The one solid shape on a screen. */
export const primaryButton =
  "inline-flex h-12 w-full items-center justify-center rounded-full bg-brand px-7 text-[15px] font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-40 disabled:hover:bg-brand";

/** Secondary action beside a primary one: outline only, foreground text. */
export const ghostButton =
  "inline-flex h-12 w-full items-center justify-center rounded-full border border-border px-7 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40 disabled:hover:bg-transparent";

/** Row action in a list (fill, cancel): a small outlined pill, so it reads as a button. */
export const rowButton =
  "inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-border px-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40 disabled:hover:bg-transparent";

/** Quiet inline action:foreground text with a faint underline, never the accent. */
export const quietLink =
  "text-foreground underline decoration-border underline-offset-[3px] transition-colors hover:decoration-foreground";

/** Small note under a field or button. */
export const footnote = "text-xs text-muted-foreground";
