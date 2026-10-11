"use client";

import { useEffect, useState } from "react";
import { getKoinPrice } from "@/lib/price";

/** The KOIN price in USD, refreshed every minute; null until known or when unavailable. */
export function useKoinPrice(): number | null {
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => getKoinPrice().then((value) => active && setPrice(value));
    void load();
    const timer = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return price;
}
