import { Copy, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as toast from "@/lib/toast";
import { useState } from "react";

interface JsonDisplayProps {
  data: unknown;
}

export const JsonDisplay = ({ data }: JsonDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    toast.success("Copied to clipboard");
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // Function to determine the type of a value for syntax highlighting
  const getValueClass = (value: unknown): string => {
    if (value === null) return "text-stone-400";
    if (typeof value === "number") return "text-amber-300";
    if (typeof value === "boolean") return "text-stone-300";
    if (typeof value === "string") {
      if (value.startsWith("0x")) return "text-stone-200";
      return "text-amber-200";
    }
    return "";
  };

  const getKeyClass = (): string => {
    return "text-stone-300";
  };

  const renderExpandedJson = (obj: unknown, level = 0): JSX.Element => {
    const indent = "  ".repeat(level);
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return <span>[<span className="text-stone-500">]</span></span>;
      
      return (
        <div className="flex flex-col">
          <span>[</span>
          {obj.map((item, index) => (
            <div key={index} className="flex flex-wrap">
              <span className="whitespace-pre">{indent}  </span>
              {renderExpandedJson(item, level + 1)}
              {index < obj.length - 1 && <span className="text-stone-500">,</span>}
            </div>
          ))}
          <div>
            <span className="whitespace-pre">{indent}</span>
            <span>]</span>
          </div>
        </div>
      );
    }

    if (obj && typeof obj === "object") {
      const entries = Object.entries(obj);
      if (entries.length === 0) return <span>{"{"}<span className="text-stone-500">{"}"}</span></span>;
      
      return (
        <div className="flex flex-col">
          <span>{"{"}</span>
          {entries.map(([key, value], index) => (
            <div key={key} className="flex flex-wrap">
              <span className="whitespace-pre">{indent}  </span>
              <span className={getKeyClass()}>&quot;{key}&quot;</span>
              <span className="text-stone-400">: </span>
              {renderExpandedJson(value, level + 1)}
              {index < entries.length - 1 && <span className="text-stone-500">,</span>}
            </div>
          ))}
          <div>
            <span className="whitespace-pre">{indent}</span>
            <span>{"}"}</span>
          </div>
        </div>
      );
    }

    if (typeof obj === "string") {
      // Break long strings with a CSS class for better readability
      return <span className={`${getValueClass(obj)} break-all`}>&quot;{obj}&quot;</span>;
    }

    return <span className={getValueClass(obj)}>{JSON.stringify(obj)}</span>;
  };

  // Simplified view for collapsed state
  const renderCollapsedPreview = (obj: unknown): JSX.Element => {
    if (Array.isArray(obj)) {
      return <span>Array [{obj.length} items]</span>;
    }
    
    if (obj && typeof obj === "object") {
      const entries = Object.entries(obj);
      return <span>Object {`{${entries.length} ${entries.length === 1 ? 'key' : 'keys'}}`}</span>;
    }
    
    if (typeof obj === "string") {
      if (obj.length > 50) {
        return <span>&quot;{obj.substring(0, 50)}...&quot;</span>;
      }
      return <span>&quot;{obj}&quot;</span>;
    }
    
    return <span>{JSON.stringify(obj)}</span>;
  };

  return (
    <div className="w-full rounded-md bg-slate-950 border-stone-800 dark:bg-slate-950 dark:border-stone-800">
      <div className="flex items-center justify-between p-2 border-b border-stone-800 bg-stone-900 dark:bg-slate-950 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-stone-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-stone-400" />
            )}
          </Button>
          <div className="text-sm text-stone-400">JSON</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs font-normal text-stone-300 hover:text-stone-100 dark:text-stone-300 dark:hover:text-stone-100"
          onClick={copyToClipboard}
        >
          <Copy className="h-3.5 w-3.5 mr-1" />
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      {expanded ? (
        <div className="overflow-x-auto p-4 text-sm">
          <pre
            style={{
              maxWidth: "100%",
              wordWrap: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            {renderExpandedJson(data)}
          </pre>
        </div>
      ) : (
        <div className="p-4 text-sm truncate">
          {renderCollapsedPreview(data)}
        </div>
      )}
    </div>
  );
}; 