import Link from "next/link";

interface LogoProps {
  showBetaBadge?: boolean;
}

export function Logo({ showBetaBadge = false }: LogoProps) {
  return (
    <Link href="/" aria-label="KoinScan home" className="flex items-center">
      <div className="w-8 h-6 mr-1 bg-[hsl(var(--logo-color-1))]"></div>
      <div className="w-4 h-6 mr-1 bg-[hsl(var(--logo-color-2))]"></div>
      <div className={`w-2 h-6 bg-[hsl(var(--logo-color-3))] ${showBetaBadge ? "mr-3" : "mr-6"}`}></div>
      {showBetaBadge && (
        <span className="shrink-0 rounded-[3px] border border-amber-500/40 bg-amber-500/10 px-1.5 py-1 font-mono text-[9px] font-semibold leading-none tracking-[0.16em] text-amber-700 dark:text-amber-400">
          BETA
        </span>
      )}
    </Link>
  );
}
