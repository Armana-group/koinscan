"use client";

import { useEffect, useState } from "react";
import { getKoinPrice, getKoinQuote, type KoinQuote } from "@/lib/price";

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

/** The KOIN price with its 24 hour change, refreshed every minute; null until known or when unavailable. */
export function useKoinQuote(): KoinQuote | null {
  const [quote, setQuote] = useState<KoinQuote | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => getKoinQuote().then((value) => active && setQuote(value));
    void load();
    const timer = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return quote;
}
