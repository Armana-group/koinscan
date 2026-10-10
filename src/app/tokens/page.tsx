"use client";

import { Contract } from "koilib";
import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import tokenAbi from "@/koinos/abi";
import { KOIN_CONTRACT_ID, VHP_CONTRACT_ID } from "@/koinos/constants";
import { compact, fmt } from "@/lib/format";
import { getAllTokens, type KoinosToken } from "@/lib/tokens";
import { Filters } from "@/components/ks/Controls";
import { Empty, Lede, Page, RowSkeleton, Title } from "@/components/ks/Page";
import { ListMark, More, Row, TokenMark } from "@/components/ks/Row";

type Category = "all" | "native" | "wrapped" | "meme" | "gaming" | "defi" | "other";

const CATEGORIES: { value: Category; label: string; keywords: string[] }[] = [
  { value: "native", label: "Native", keywords: [] },
  { value: "wrapped", label: "Wrapped", keywords: ["wrapped", "chainge", "vortex", "btc", "eth", "usdt", "usdc"] },
  { value: "meme", label: "Meme", keywords: ["meme", "inu", "dog", "bald", "duck", "titcoin", "quack", "kat"] },
  { value: "gaming", label: "Gaming", keywords: ["game", "nft", "card", "pack", "lords", "forsaken", "faith"] },
  { value: "defi", label: "DeFi", keywords: ["defi", "swap", "pool", "finance", "koindx", "staking", "yield", "amm"] },
];

function categoryOf(token: KoinosToken): Category {
  const text = `${token.name} ${token.symbol} ${token.description}`.toLowerCase();
  if (token.address === "koin" || token.address === "vhp") return "native";
  for (const category of CATEGORIES) if (category.keywords.some((k) => text.includes(k))) return category.value;
  // "native" has no keywords: only KOIN and VHP are native.
  return "other";
}

const SHOW = 12;

export default function TokensPage() {
  const { provider } = useWallet();
  const [tokens, setTokens] = useState<KoinosToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<Category>("all");
  const [shown, setShown] = useState(SHOW);
  const [supply, setSupply] = useState<{ koin?: number; vhp?: number }>({});

  useEffect(() => {
    let active = true;
    getAllTokens()
      .then((list) => active && setTokens(list))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!provider) return;
    let active = true;
    (async () => {
      try {
        const koin = new Contract({ id: KOIN_CONTRACT_ID, provider, abi: tokenAbi });
        const vhp = new Contract({ id: VHP_CONTRACT_ID, provider, abi: tokenAbi });
        const [k, v] = await Promise.all([koin.functions.totalSupply(), vhp.functions.totalSupply()]);
        if (active) setSupply({ koin: Number(k.result?.value) / 1e8, vhp: Number(v.result?.value) / 1e8 });
      } catch (err) {
        console.info("[tokens] supply unavailable:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [provider]);

  const sorted = useMemo(() => {
    const rank = (t: KoinosToken) => (t.address === "koin" ? 0 : t.address === "vhp" ? 1 : 2);
    return [...tokens].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [tokens]);
  const filtered = category === "all" ? sorted : sorted.filter((t) => categoryOf(t) === category);
  const visible = filtered.slice(0, shown);

  const supplyText = (token: KoinosToken): [string, string] | [] => {
    if (token.address === "koin" && supply.koin) return [compact(supply.koin), "in circulation"];
    if (token.address === "vhp" && supply.vhp) return [compact(supply.vhp), "producing blocks"];
    return [];
  };

  return (
    <Page list>
      <Title>Tokens</Title>
      <Lede>
        <b>{tokens.length ? fmt(tokens.length) : "…"}</b> tokens live on Koinos. KOIN is the native token; VHP is burned to produce blocks.
      </Lede>
      <Filters
        top
        options={[{ value: "all" as Category, label: "All" }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label })), { value: "other" as Category, label: "Other" }]}
        value={category}
        onChange={(value) => {
          setCategory(value);
          setShown(SHOW);
        }}
      />
      <div className="ks-list">
        {loading && <RowSkeleton rows={6} />}
        {!loading && error && <Empty>The token list could not be loaded.</Empty>}
        {!loading && !error && visible.length === 0 && <Empty>No tokens in this group.</Empty>}
        {visible.map((token) => {
          const [amount, sub] = supplyText(token);
          return (
            <Row
              key={token.address}
              lead={<TokenMark symbol={token.symbol} address={token.address} logo={token.logoURI} />}
              title={token.name}
              detail={
                <>
                  {token.symbol}
                  <ListMark listed /> · {CATEGORIES.find((c) => c.value === categoryOf(token))?.label ?? "Other"}
                </>
              }
              amount={amount}
              amountSub={sub}
              amountTone="out"
              href={`/contracts/${token.address}`}
            />
          );
        })}
      </div>
      {filtered.length > shown && <More onClick={() => setShown((n) => n + SHOW)}>{fmt(filtered.length - shown)} more</More>}
    </Page>
  );
}
