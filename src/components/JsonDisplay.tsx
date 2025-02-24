import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface JsonDisplayProps {
  data: unknown;
}

export const JsonDisplay = ({ data }: JsonDisplayProps) => {
  const [isCompact, setIsCompact] = useState(false);

  const formatValue = (value: unknown): string => {
    if (typeof value === "string" && value.startsWith("0x")) {
      // Truncate long hex strings
      return value.length > 10 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
    }
    return JSON.stringify(value);
  };

  const renderCompactArray = (arr: unknown[]) => {
    return (
      <div className="flex flex-wrap gap-2">
        {arr.map((item, index) => (
          <div key={index} className="bg-muted px-2 py-1 rounded text-sm">
            {formatValue(item)}
          </div>
        ))}
      </div>
    );
  };

  const renderExpandedJson = (obj: unknown, level = 0): JSX.Element => {
    if (Array.isArray(obj)) {
      return (
        <div className="space-y-1">
          {obj.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-muted-foreground">{index}:</span>
              {renderExpandedJson(item, level + 1)}
            </div>
          ))}
        </div>
      );
    }

    if (obj && typeof obj === "object") {
      return (
        <div className="space-y-1">
          {Object.entries(obj).map(([key, value]) => (
            <div key={key} className="flex items-start gap-2">
              <span className="text-muted-foreground">{key}:</span>
              {renderExpandedJson(value, level + 1)}
            </div>
          ))}
        </div>
      );
    }

    return <span>{formatValue(obj)}</span>;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-2 border-b">
        <Label htmlFor="format-switch" className="text-sm text-muted-foreground">
          Compact View
        </Label>
        <Switch
          id="format-switch"
          checked={isCompact}
          onCheckedChange={setIsCompact}
        />
      </div>
      <div className="font-mono text-sm overflow-x-auto">
        {isCompact ? (
          <div className="space-y-2">
            {Object.entries(data as object).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1">
                <div className="text-muted-foreground">{key}:</div>
                <div className="pl-4">
                  {Array.isArray(value) ? (
                    renderCompactArray(value)
                  ) : (
                    <span>{formatValue(value)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          renderExpandedJson(data)
        )}
      </div>
    </div>
  );
}; 