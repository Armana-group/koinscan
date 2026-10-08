"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { KNOWN_RPC_NODES, isKnownRpcNode, normalizeRpcOrigin } from "@/koinos/known-nodes";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

interface RpcNodePickerProps {
  compact?: boolean;
}

export function RpcNodePicker({ compact = false }: RpcNodePickerProps) {
  const { jsonRpcNode, setJsonRpcNode } = useWallet();
  const [customNode, setCustomNode] = useState("");

  const activeOrigin = normalizeRpcOrigin(jsonRpcNode) ?? jsonRpcNode;
  const activeIsCustom = Boolean(jsonRpcNode) && !isKnownRpcNode(jsonRpcNode);
  const trimmedCustom = customNode.trim();

  const applyCustomNode = () => {
    if (!trimmedCustom) return;
    setJsonRpcNode(trimmedCustom);
    setCustomNode("");
  };

  return (
    <div className={cn("space-y-2", compact ? "text-xs" : "text-sm")}>
      <div className={cn("font-medium", compact && "text-muted-foreground")}>RPC Node</div>
      <div className="space-y-1">
        {KNOWN_RPC_NODES.map((node) => {
          const isActive = node.url === activeOrigin;
          return (
            <button
              key={node.url}
              type="button"
              onClick={() => setJsonRpcNode(node.url)}
              aria-pressed={isActive}
              className={cn(
                "flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left transition-colors",
                isActive
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/60 hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{node.name}</span>
                <span className="block truncate text-muted-foreground">{node.url}</span>
              </span>
              {isActive && <Check className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {activeIsCustom && (
        <div className="rounded-md border border-dashed border-border/60 px-2 py-1.5">
          <span className="block font-medium">Custom node</span>
          <span className="block truncate text-muted-foreground">{jsonRpcNode}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={customNode}
          onChange={(e) => setCustomNode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyCustomNode();
          }}
          placeholder="https://your-node.example"
          aria-label="Custom RPC node URL"
          className={cn("flex-1", compact && "h-8 text-xs")}
        />
        <Button
          variant="secondary"
          size={compact ? "sm" : "default"}
          onClick={applyCustomNode}
          disabled={!trimmedCustom}
          className={cn(compact && "h-8 px-2")}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
