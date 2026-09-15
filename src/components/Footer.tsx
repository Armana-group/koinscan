'use client';

import Link from 'next/link'

export function Footer() {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
  const buildCommit = process.env.NEXT_PUBLIC_BUILD_COMMIT;
  const buildLabel = appVersion && buildCommit ? `v${appVersion} · ${buildCommit}` : null;

  return (
    <footer className="w-full py-4 text-sm text-muted-foreground">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
          <p className="leading-none">
            © 2025{' '}
            <Link
              href="https://armana.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Armana
            </Link>
          </p>
          {buildLabel && (
            <span className="text-xs leading-none text-muted-foreground/60" aria-label={`Build ${buildLabel}`}>
              {buildLabel}
            </span>
          )}
        </div>
      </div>
    </footer>
  )
}
