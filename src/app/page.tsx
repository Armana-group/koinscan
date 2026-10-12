"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { HOME_SEARCH_ATTRIBUTE, useShortcutLabel } from "@/components/chrome/ChromeProvider";
import { Glow } from "@/components/chrome/Glow";
import { ArrowIcon, SearchIcon } from "@/components/chrome/icons";
import { useHead } from "@/hooks/useHead";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSearchNavigation } from "@/hooks/useSearchNavigation";
import { fmt } from "@/lib/format";
import { useNameOf } from "@/components/ks/Named";
import { RollingNumber } from "@/components/ks/RollingNumber";
import { useWallet } from "@/contexts/WalletContext";
import { useEffect } from "react";
import { useKoinQuote } from "@/hooks/useKoinPrice";
import { readSigner } from "@/koinos/chain-reads";
import { KOIN_CONTRACT_ID } from "@/koinos/constants";
import { formatChange, formatKoinUsd } from "@/lib/price";

// What KoinScan is for, one word each; the home line links them to their pages.
const MODES = [
  { word: "Explore", href: "/blocks", cta: "Open Blocks", detail: "Every block, transaction, account and contract on Koinos, told in plain words." },
  { word: "Mine", href: "/fogata", cta: "Open Fogata", detail: "Join a Fogata pool. It runs the node and burns for you; you're paid in KOIN." },
  { word: "Trade", href: "/fogata/trade", cta: "Open Trade", detail: "Sell VHP for KOIN, or buy VHP. Pools fill orders before they burn any KOIN." },
];

export default function Home() {
  const input = useRef<HTMLInputElement>(null);
  const { go, busy } = useSearchNavigation();
  const shortcut = useShortcutLabel();
  const head = useHead(1500);
  const { provider } = useWallet();
  const nameOf = useNameOf();
  const [value, setValue] = useState("");
  const [askedProducer, setProducer] = useState<string>("");
  // The full hint only fits on wide screens; narrower phones get shorter wording so it isn't cut off.
  const phone = useMediaQuery("(max-width: 760px)");
  const narrow = useMediaQuery("(max-width: 374px)");
  const hint = narrow ? "Search Koinos" : phone ? "Address, @name, tx or block" : "Search an address, @nickname, transaction or block";

  // Who produced the head block, for the live line. The shared head already
  // says; a custom node is asked directly.
  useEffect(() => {
    if (!provider || !head || head.signer) return;
    let active = true;
    readSigner(provider, head)
      .then((signer) => {
        if (active && signer) setProducer(signer);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [provider, head]);

  const producer = head?.signer ?? askedProducer;

  const submit = async (text: string) => {
    if (await go(text)) setValue("");
  };

  const quote = useKoinQuote();
  const suggestions = ["@julian", head ? `Block ${fmt(head.height)}` : "Block 40,041,420", "KOIN"];

  return (
    <section className="ks-home">
      <Glow home />
      <div className="ks-stack">
        <h1>Hello, Koinos</h1>
        <p className="ks-sub ks-modes">
          {MODES.map((mode, index) => (
            <span key={mode.href}>
              <Link href={mode.href}>
                {index === 0 ? mode.word : mode.word.toLowerCase()}
                {/* A hover card on pointer devices; on touch the word is just a link. */}
                <span className="ks-mode-card" aria-hidden>
                  <span className="t">{mode.word}</span>
                  <span className="d">{mode.detail}</span>
                  <span className="go">{mode.cta} ›</span>
                </span>
              </Link>
              {index < MODES.length - 1 ? ", " : "."}
            </span>
          ))}
        </p>
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
          {shortcut && <kbd className="ks-kbd">{shortcut}</kbd>}
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
        <div className="ks-home-price">
          {quote ? (
            <Link href={`/contracts/${KOIN_CONTRACT_ID}`}>
              KOIN <b>{formatKoinUsd(quote.usd)}</b>
              {quote.change !== null && <span className={quote.change >= 0 ? "up" : "down"}>{formatChange(quote.change)}</span>}
            </Link>
          ) : (
            "\u00a0"
          )}
        </div>
        {/* Block and producer share a line split at the centre, so a long or changing name never moves the block number. */}
        <div className="ks-blockline">
          <span className="ks-block">
            {/* Keyed on the height so the dot pings once per new block. */}
            <span key={head?.height} className={head ? "ks-dot ks-ping" : "ks-dot"} />
            {head ? (
              <span>
                Block{" "}
                <b>
                  <RollingNumber value={fmt(head.height)} />
                </b>
                , just now
              </span>
            ) : (
              <span>Connecting to the chain…</span>
            )}
          </span>
          <span className="ks-producer">
            {producer ? (
              <span key={producer}>
                Produced by <b>{nameOf(producer)}</b>
              </span>
            ) : (
              "\u00a0"
            )}
          </span>
        </div>
      </div>
    </section>
  );
}
