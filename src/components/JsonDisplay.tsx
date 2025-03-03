import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface JsonDisplayProps {
  data: unknown;
}

export const JsonDisplay = ({ data }: JsonDisplayProps) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success("Copied to clipboard");
  };

  // Function to determine the type of a value for syntax highlighting
  const getValueClass = (value: unknown): string => {
    if (value === null) return "text-blue-300";
    if (typeof value === "number") return "text-amber-300";
    if (typeof value === "boolean") return "text-purple-300";
    if (typeof value === "string") {
      if (value.startsWith("0x")) return "text-green-300";
      return "text-amber-400";
    }
    return "";
  };

  const getKeyClass = (): string => {
    return "text-cyan-300";
  };

  const renderExpandedJson = (obj: unknown, level = 0): JSX.Element => {
    const indent = "  ".repeat(level);
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return <span>[<span className="text-gray-400">]</span></span>;
      
      return (
        <div className="flex flex-col">
          <span>[</span>
          {obj.map((item, index) => (
            <div key={index} className="flex">
              <span className="whitespace-pre">{indent}  </span>
              {renderExpandedJson(item, level + 1)}
              {index < obj.length - 1 && <span className="text-gray-400">,</span>}
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
      if (entries.length === 0) return <span>{"{"}<span className="text-gray-400">{"}"}</span></span>;
      
      return (
        <div className="flex flex-col">
          <span>{"{"}</span>
          {entries.map(([key, value], index) => (
            <div key={key} className="flex">
              <span className="whitespace-pre">{indent}  </span>
              <span className={getKeyClass()}>&quot;{key}&quot;</span>
              <span className="text-gray-200">: </span>
              {renderExpandedJson(value, level + 1)}
              {index < entries.length - 1 && <span className="text-gray-400">,</span>}
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
      return <span className={getValueClass(obj)}>&quot;{obj}&quot;</span>;
    }

    return <span className={getValueClass(obj)}>{JSON.stringify(obj)}</span>;
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end pb-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 rounded-md text-xs"
          onClick={copyToClipboard}
        >
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copy
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md">
        <pre className="font-mono text-sm bg-zinc-950 text-gray-100 p-4 rounded-md">
          {renderExpandedJson(data)}
        </pre>
      </div>
    </div>
  );
}; 