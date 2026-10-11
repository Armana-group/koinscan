"use client";

// Owns the menu card and the search card: which one is open, the classes on
// <html> that drive their CSS transitions, and the keyboard shortcuts.
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useWallet } from "@/contexts/WalletContext";

interface ChromeState {
  menuOpen: boolean;
  searchOpen: boolean;
  walletOpen: boolean;
  walletCardOpen: boolean;
  openMenu: () => void;
  openSearch: () => void;
  /** Connected: the wallet card under the address chip. Otherwise the connect sheet. */
  openWallet: () => void;
  /** The connect sheet, whatever the wallet state. */
  openConnect: () => void;
  closeWallet: () => void;
  toggleWalletCard: () => void;
  closeWalletCard: () => void;
  closeAll: () => void;
  /** Sheets (dialogs) report themselves so the page steps back behind them. */
  setSheetOpen: (open: boolean) => void;
}

const ChromeContext = createContext<ChromeState | null>(null);

/** The home page marks its big search pill with this so Cmd+K focuses it there. */
export const HOME_SEARCH_ATTRIBUTE = "data-home-search";

export function ChromeProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletCardOpen, setWalletCardOpen] = useState(false);
  const sheets = useRef(0);
  const pathname = usePathname();
  const { signer } = useWallet();
  const connected = Boolean(signer);

  const closeAll = useCallback(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setWalletCardOpen(false);
  }, []);
  const openConnect = useCallback(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setWalletCardOpen(false);
    setWalletOpen(true);
  }, []);
  const openWallet = useCallback(() => {
    if (connected) {
      setMenuOpen(false);
      setSearchOpen(false);
      setWalletCardOpen(true);
    } else openConnect();
  }, [connected, openConnect]);
  const closeWallet = useCallback(() => setWalletOpen(false), []);
  const toggleWalletCard = useCallback(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setWalletCardOpen((open) => !open);
  }, []);
  const closeWalletCard = useCallback(() => setWalletCardOpen(false), []);
  const openMenu = useCallback(() => {
    setSearchOpen(false);
    setWalletCardOpen(false);
    setMenuOpen(true);
  }, []);
  const openSearch = useCallback(() => {
    setMenuOpen(false);
    setWalletCardOpen(false);
    setSearchOpen(true);
  }, []);
  const setSheetOpen = useCallback((open: boolean) => {
    sheets.current = Math.max(0, sheets.current + (open ? 1 : -1));
    document.documentElement.classList.toggle("sheet-open", sheets.current > 0);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", menuOpen);
  }, [menuOpen]);
  useEffect(() => {
    document.documentElement.classList.toggle("search-open", searchOpen);
  }, [searchOpen]);

  // A navigation closes whatever was open (the "adjust state during render" pattern).
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    if (menuOpen) setMenuOpen(false);
    if (searchOpen) setSearchOpen(false);
    if (walletCardOpen) setWalletCardOpen(false);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAll();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const homeSearch = document.querySelector<HTMLInputElement>(`[${HOME_SEARCH_ATTRIBUTE}]`);
        if (homeSearch) {
          closeAll();
          homeSearch.focus();
          homeSearch.select();
          return;
        }
        setMenuOpen(false);
        setWalletCardOpen(false);
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAll]);

  const value = useMemo(
    () => ({ menuOpen, searchOpen, walletOpen, walletCardOpen, openMenu, openSearch, openWallet, openConnect, closeWallet, toggleWalletCard, closeWalletCard, closeAll, setSheetOpen }),
    [menuOpen, searchOpen, walletOpen, walletCardOpen, openMenu, openSearch, openWallet, openConnect, closeWallet, toggleWalletCard, closeWalletCard, closeAll, setSheetOpen],
  );

  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function useChrome(): ChromeState {
  const context = useContext(ChromeContext);
  if (!context) throw new Error("useChrome must be used within ChromeProvider");
  return context;
}

const noop = () => () => {};
const shortcutOnClient = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K");
const shortcutOnServer = () => "⌘K";

/** ⌘K on Apple platforms, Ctrl K elsewhere; the server renders ⌘K. */
export function useShortcutLabel(): string {
  return useSyncExternalStore(noop, shortcutOnClient, shortcutOnServer);
}
