"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface PoolLogoProps {
  poolId: string;
  name: string;
  /** The pool owner's on-chain image URL. */
  image?: string;
  /** Size and corner radius, e.g. "h-10 w-10 rounded-xl". */
  className?: string;
}

/** A short, stable tag for the image URL, so a changed logo gets a new cache key. */
function urlTag(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * A pool's logo with its first letter underneath as the fallback. The image
 * comes from /api/pool-logo, which fetches the URL set on-chain for listed
 * pools only, so any https host works while visitors' IPs stay with us.
 */
export function PoolLogo({ poolId, name, image, className }: PoolLogoProps) {
  const [failed, setFailed] = useState(false);
  const url = image?.trim() ?? "";
  const showImage = url.startsWith("https://") && !failed;

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-muted font-semibold text-muted-foreground",
        className
      )}
    >
      {(name || "P").charAt(0).toUpperCase()}
      {showImage && (
        /* Served by our own route, which already sizes and checks the file */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/api/pool-logo/${poolId}?v=${urlTag(url)}`}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full bg-background object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
