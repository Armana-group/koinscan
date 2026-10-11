"use client";

import { Flame } from "@/components/chrome/icons";
import { PoolLogo } from "./PoolLogo";

/** A pool's mark: its own logo when it has one, the Fogata flame otherwise. */
export function PoolMark({ poolId, name, image, large = false }: { poolId: string; name: string; image?: string; large?: boolean }) {
  const size = large ? 72 : 40;
  if (image && image.trim()) {
    return <PoolLogo poolId={poolId} name={name} image={image} size={size} className={`${large ? "ks-mark lg" : "ks-mark"} rounded-full`} />;
  }
  return <Flame className={`ks-flame${large ? " lg" : ""}`} />;
}
