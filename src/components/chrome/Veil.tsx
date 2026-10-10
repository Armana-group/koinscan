"use client";

import { useChrome } from "./ChromeProvider";

export function Veil() {
  const { closeAll } = useChrome();
  return <div className="ks-veil" onClick={closeAll} aria-hidden="true" />;
}
