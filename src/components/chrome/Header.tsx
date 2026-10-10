"use client";

import { usePathname } from "next/navigation";
import { useChrome, useShortcutLabel } from "./ChromeProvider";
import { BurgerIcon, SearchIcon } from "./icons";
import { Logo } from "./Logo";

export function Header() {
  const pathname = usePathname();
  const { openMenu, openSearch, menuOpen } = useChrome();
  const shortcut = useShortcutLabel();
  const home = pathname === "/";

  return (
    <header className={`ks-bar${home ? " home" : ""}`}>
      <Logo />
      {!home && (
        <button type="button" className="ks-search" onClick={openSearch} aria-label="Search">
          <SearchIcon />
          <span>Search</span>
          <kbd className="ks-kbd">{shortcut}</kbd>
        </button>
      )}
      <div className="ks-right">
        {!home && (
          <button type="button" className="ks-burger mobile-search" onClick={openSearch} aria-label="Search">
            <SearchIcon />
          </button>
        )}
        <button type="button" className="ks-burger" onClick={openMenu} aria-label="Open menu" aria-expanded={menuOpen}>
          <BurgerIcon />
        </button>
      </div>
    </header>
  );
}
