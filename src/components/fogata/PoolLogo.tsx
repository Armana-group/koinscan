"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface PoolLogoProps {
  name: string;
  poolId: string;
  /** The pool owner's on-chain image URL; any https host. */
  image?: string;
  /** Size and corner radius, e.g. "h-10 w-10 rounded-xl". */
  className?: string;
  /** Rendered size in CSS pixels. */
  size: number;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A pool's logo with its first letter underneath as the fallback. Logos go
 * through the pool-specific thumbnail endpoint. The on-chain URL is only used
 * to hide missing/invalid logos here; the server independently reads and validates it.
 */
export function PoolLogo(props: PoolLogoProps) {
  // A changed pool or on-chain image resets the image-error fallback.
  return <PoolLogoContent key={`${props.poolId}:${props.image}`} {...props} />;
}

function PoolLogoContent({ name, poolId, image, className, size }: PoolLogoProps) {
  const [failed, setFailed] = useState(false);
  const [retries, setRetries] = useState(0);
  const src = image?.trim() ?? "";
  const showImage = src !== "" && !failed && isHttpsUrl(src);

  useEffect(() => {
    if (!failed || retries >= 3) return;
    // Capacity or upstream failures may recover. Keep the fallback visible,
    // retry with bounded backoff, and cancel when this pool leaves the screen.
    const timer = setTimeout(() => {
      setRetries((value) => value + 1);
      setFailed(false);
    }, 30_000 * 2 ** retries);
    return () => clearTimeout(timer);
  }, [failed, retries]);

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-muted font-semibold text-muted-foreground",
        className
      )}
    >
      {(name || "P").charAt(0).toUpperCase()}
      {showImage && (
        <Image
          key={retries}
          src={`/api/pool-logo/${encodeURIComponent(poolId)}`}
          unoptimized
          alt=""
          fill
          sizes={`${size}px`}
          className="bg-background object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
