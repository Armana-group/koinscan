"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface PoolLogoProps {
  name: string;
  /** The pool owner's on-chain image URL; any https host. */
  image?: string;
  /** Size and corner radius, e.g. "h-10 w-10 rounded-xl". */
  className?: string;
  /** Rendered size in CSS pixels, for the optimizer. */
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
 * through Next's image optimizer (next.config allows any https host), so the
 * pool owner's server never sees visitors' IPs, the file is resized and
 * cached, and SVG is refused.
 */
export function PoolLogo({ name, image, className, size }: PoolLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = image?.trim() ?? "";
  const showImage = src !== "" && !failed && isHttpsUrl(src);

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
          src={src}
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
