"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { KNOWN_RPC_NODES, isKnownRpcNode, normalizeRpcOrigin } from "@/koinos/known-nodes";
import { short } from "@/lib/format";
import { useChrome } from "./ChromeProvider";
import { CloseIcon } from "./icons";

const LINKS = [
  { name: "Home", href: "/" },
  { name: "Blocks", href: "/blocks" },
  { name: "Tokens", href: "/tokens" },
  { name: "Contracts", href: "/contracts" },
  { name: "Network", href: "/network" },
  { name: "Fogata", href: "/fogata" },
];

const toolRow =
  "flex w-full items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5 text-left text-[13px] hover:bg-raised";

export function MenuCard() {
  const pathname = usePathname();
  const { menuOpen, closeAll, openWallet } = useChrome();
  const { signer, savedAddress, jsonRpcNode, setJsonRpcNode, setRpcNode } = useWallet();
  const [nodeOpen, setNodeOpen] = useState(false);
  const [customNode, setCustomNode] = useState("");

  const address = signer?.getAddress() ?? savedAddress;
  const connected = Boolean(signer);
  const activeOrigin = normalizeRpcOrigin(jsonRpcNode) ?? jsonRpcNode;
  const activeNode = KNOWN_RPC_NODES.find((node) => node.url === activeOrigin);
  const nodeLabel = activeNode ? activeNode.name : jsonRpcNode ? "Custom node" : "Default";

  const version = process.env.NEXT_PUBLIC_APP_VERSION;
  const commit = process.env.NEXT_PUBLIC_BUILD_COMMIT;
  const build = version && commit ? `v${version} · ${commit}` : null;

  const applyCustomNode = () => {
    const value = customNode.trim();
    if (!value) return;
    setJsonRpcNode(value);
    setCustomNode("");
  };

  return (
    <nav className="ks-panel" aria-label="Site" aria-hidden={!menuOpen}>
      <button type="button" className="ks-burger ks-close" aria-label="Close menu" onClick={closeAll} tabIndex={menuOpen ? 0 : -1}>
        <CloseIcon />
      </button>
      <div className="ks-links">
        {LINKS.map((link) => {
          const on = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href} className={on ? "on" : undefined} tabIndex={menuOpen ? 0 : -1} onClick={closeAll}>
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="ks-tools">
        <button type="button" className={toolRow} onClick={openWallet} tabIndex={menuOpen ? 0 : -1}>
          <span className="text-sub">Wallet</span>
          <span className="flex items-center gap-2 font-normal text-ink">
            {address && <span className={`ks-dot${connected ? "" : " pending"}`} style={{ width: 7, height: 7 }} />}
            {address ? short(address) : "Connect"}
            <span className="text-faint">›</span>
          </span>
        </button>
        <button type="button" className={toolRow} onClick={() => setNodeOpen((open) => !open)} aria-expanded={nodeOpen} tabIndex={menuOpen ? 0 : -1}>
          <span className="text-sub">Node</span>
          <span className="flex items-center gap-2 font-normal text-ink">
            {nodeLabel}
            <span className="text-faint" style={{ display: "inline-block", transform: nodeOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
              ›
            </span>
          </span>
        </button>
        {nodeOpen && (
          <div className="rounded-[14px] bg-sheet p-2">
            {KNOWN_RPC_NODES.map((node) => {
              const on = node.url === activeOrigin;
              return (
                <button
                  key={node.url}
                  type="button"
                  onClick={() => {
                    // Trusted nodes serve both APIs, so history and balances follow the pick.
                    setJsonRpcNode(node.url);
                    setRpcNode(node.url);
                  }}
                  aria-pressed={on}
                  className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[13px] hover:bg-raised ${on ? "font-normal text-ink" : "text-sub"}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{node.name}</span>
                    <span className="block truncate text-[11px] text-faint">{node.url}</span>
                  </span>
                  {on && <span className="ks-dot" style={{ width: 7, height: 7 }} />}
                </button>
              );
            })}
            {jsonRpcNode && !isKnownRpcNode(jsonRpcNode) && (
              <div className="px-3 py-2 text-[13px] text-ink">
                Custom node
                <span className="block truncate text-[11px] text-faint">{jsonRpcNode}</span>
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 px-1 pb-1">
              <input
                className="ks-input"
                style={{ height: 36, background: "#fff", fontSize: 12 }}
                value={customNode}
                onChange={(event) => setCustomNode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyCustomNode();
                }}
                placeholder="https://your-node.example"
                aria-label="Custom RPC node URL"
              />
              <button type="button" className="ks-btn ghost md" onClick={applyCustomNode} disabled={!customNode.trim()}>
                Use
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="ks-note">
        <b>KoinScan</b>
        Koinos block explorer by Armana · beta
        <span className="block">This is an early beta version. Some features may not work as expected.</span>
        <span className="mt-1 block text-faint">
          {build && <span>{build} · </span>}
          <Link href="/changelog" tabIndex={menuOpen ? 0 : -1} onClick={closeAll}>
            Changelog
          </Link>
        </span>
      </footer>
    </nav>
  );
}
