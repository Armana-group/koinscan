"use client";

import { useEffect, useRef, useState } from "react";
import { useChrome } from "./ChromeProvider";
import { SearchIcon } from "./icons";
import { useSearchNavigation } from "@/hooks/useSearchNavigation";

const SUGGESTIONS = ["@julian", "KOIN", "Block 40,041,420", "JGA Pool #2"];

export function SearchCard() {
  const { searchOpen, closeAll } = useChrome();
  const { go, busy } = useSearchNavigation();
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => input.current?.focus(), 30);
      return () => clearTimeout(timer);
    }
    input.current?.blur();
  }, [searchOpen]);

  const submit = async (text: string) => {
    if (await go(text)) {
      setValue("");
      closeAll();
    }
  };

  return (
    <div className="ks-finder" role="dialog" aria-label="Search" aria-hidden={!searchOpen}>
      <form
        className="ks-field"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(value);
        }}
      >
        <SearchIcon />
        <input
          ref={input}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={busy ? "Looking…" : "Address, @nickname, transaction or block"}
          aria-label="Search"
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
          tabIndex={searchOpen ? 0 : -1}
        />
        <span className="ks-esc">esc</span>
      </form>
      <div className="ks-hint">
        <em>Try</em>
        {SUGGESTIONS.map((text) => (
          <button key={text} type="button" onClick={() => void submit(text)} tabIndex={searchOpen ? 0 : -1} disabled={busy}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
