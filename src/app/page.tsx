"use client";

import { useRef, useState } from "react";
import { HOME_SEARCH_ATTRIBUTE, useShortcutLabel } from "@/components/chrome/ChromeProvider";
import { Glow } from "@/components/chrome/Glow";
import { ArrowIcon, SearchIcon } from "@/components/chrome/icons";
import { useHead } from "@/hooks/useHead";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSearchNavigation } from "@/hooks/useSearchNavigation";
import { fmt } from "@/lib/format";
import { useNameOf } from "@/components/ks/Named";
import { useWallet } from "@/contexts/WalletContext";
import { useEffect } from "react";

export default function Home() {
  const input = useRef<HTMLInputElement>(null);
  const { go, busy } = useSearchNavigation();
  const shortcut = useShortcutLabel();
  const head = useHead(1500);
  const { provider } = useWallet();
  const nameOf = useNameOf();
  const [value, setValue] = useState("");
  const [producer, setProducer] = useState<string>("");
  // The full hint only fits on wide screens; narrower phones get shorter wording so it isn't cut off.
  const phone = useMediaQuery("(max-width: 760px)");
  const narrow = useMediaQuery("(max-width: 374px)");
  const hint = narrow ? "Search Koinos" : phone ? "Address, @name, tx or block" : "Search an address, @nickname, transaction or block";

  // Who produced the head block, for the live line.
  useEffect(() => {
    if (!provider || !head) return;
    let active = true;
    provider
      .getBlocks(head.height, 1, head.id, { returnBlock: true, returnReceipt: false })
      .then((items) => {
        const signer = items[0]?.block?.header?.signer;
        if (active && signer) setProducer(signer);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [provider, head]);

  const submit = async (text: string) => {
    if (await go(text)) setValue("");
  };

  const suggestions = ["@julian", head ? `Block ${fmt(head.height)}` : "Block 40,041,420", "KOIN"];

  return (
    <section className="ks-home">
      <Glow home />
      <div className="ks-stack">
        <h1>Hello, Koinos</h1>
        <p className="ks-sub">Explore, mine, trade.</p>
        <form
          className="ks-pill"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(value);
          }}
        >
          <input
            ref={input}
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={busy ? "Looking…" : hint}
            aria-label="Search"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            {...{ [HOME_SEARCH_ATTRIBUTE]: "" }}
          />
          <kbd className="ks-kbd">{shortcut}</kbd>
          <SearchIcon className="ks-ic" />
          <button type="submit" className="ks-go" aria-label="Search" disabled={busy || !value.trim()}>
            <ArrowIcon />
          </button>
        </form>
        <div className="ks-under">
          {suggestions.map((text) => (
            <button key={text} type="button" onClick={() => void submit(text)} disabled={busy}>
              {text}
            </button>
          ))}
        </div>
      </div>
      <div className="ks-livebar">
        <span className="ks-dot" />
        {head ? (
          <span>
            Block <b>{fmt(head.height)}</b>, just now{producer && (
              <>
                , produced by <b>{nameOf(producer)}</b>
              </>
            )}
          </span>
        ) : (
          <span>Connecting to the chain…</span>
        )}
      </div>
    </section>
  );
}
