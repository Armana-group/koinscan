import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, GitCommitHorizontal } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { changelogEntries } from "@/content/changelog";

export const metadata: Metadata = {
  title: "Changelog | KoinScan",
  description: "A public record of improvements to the KoinScan block explorer.",
};

export default function ChangelogPage() {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 pb-16 pt-8 md:pb-24 md:pt-14">
        <div className="mx-auto max-w-5xl">
          <header className="max-w-3xl border-b border-border/70 pb-10 md:pb-14">
            <div className="mb-5 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <span className="grid grid-cols-3 gap-0.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 bg-red-500/80" />
                <span className="h-2.5 w-2.5 bg-amber-400/80" />
                <span className="h-2.5 w-1.5 bg-violet-500/80" />
              </span>
              Product ledger
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl md:text-6xl">
              What changed, and why it matters.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
              A public record of improvements to KoinScan&apos;s accuracy,
              reliability, and blockchain coverage.
            </p>
          </header>

          <ol className="relative mt-10 space-y-10 md:mt-14 md:space-y-14">
            <div
              className="absolute bottom-3 left-[7px] top-3 w-px bg-border md:left-[176px]"
              aria-hidden="true"
            />
            {changelogEntries.map((entry) => (
              <li
                key={`${entry.date}-${entry.commits.join("-")}`}
                className="relative grid grid-cols-[16px_minmax(0,1fr)] gap-5 md:grid-cols-[145px_32px_minmax(0,1fr)] md:gap-4"
              >
                <time
                  dateTime={entry.date}
                  className="hidden pt-1 text-right font-mono text-xs leading-5 text-muted-foreground md:block"
                >
                  {entry.displayDate}
                </time>

                <div className="relative z-10 mt-1.5 h-[15px] w-[15px] border-4 border-background bg-violet-500 ring-1 ring-violet-500/50" aria-hidden="true" />

                <article className="rounded-2xl border border-border/70 bg-card/50 p-5 shadow-sm sm:p-7 md:p-8">
                  <div className="mb-4 flex flex-wrap items-center gap-3 md:hidden">
                    <time dateTime={entry.date} className="font-mono text-xs text-muted-foreground">
                      {entry.displayDate}
                    </time>
                    <span className="h-1 w-1 rounded-full bg-border" aria-hidden="true" />
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-violet-500">
                      Released
                    </span>
                  </div>

                  <div className="hidden items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-violet-500 md:flex">
                    <span className="h-1.5 w-1.5 bg-violet-500" aria-hidden="true" />
                    Released
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-foreground md:text-3xl">
                    {entry.title}
                  </h2>
                  <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                    {entry.summary}
                  </p>
                  <p className="mt-4 font-mono text-xs text-muted-foreground">
                    <span className="uppercase tracking-[0.14em]">
                      {entry.contributors.length === 1 ? "Contributor" : "Contributors"}
                    </span>{" "}
                    <span className="text-foreground/80">
                      {entry.contributors.join(", ")}
                    </span>
                  </p>

                  <ul className="mt-6 space-y-3 border-t border-border/60 pt-6">
                    {entry.changes.map((change) => (
                      <li key={change} className="flex gap-3 text-sm leading-6 text-foreground/85 sm:text-base">
                        <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-5">
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {entry.commits.length === 1 ? "Related commit" : "Related commits"}
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
                      {entry.commits.map((commit) => (
                        <Link
                          key={commit}
                          href={`https://github.com/Armana-group/koinscan/commit/${commit}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-2 font-mono text-xs text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <GitCommitHorizontal className="h-4 w-4 text-muted-foreground" />
                          {commit}
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </>
  );
}
