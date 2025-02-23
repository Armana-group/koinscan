import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, CircleDot } from 'lucide-react';

interface JsonDisplayProps {
  data: unknown;
  initialExpanded?: boolean;
}

interface JsonNodeProps extends JsonDisplayProps {
  level?: number;
  isLast?: boolean;
}

const JsonNode = ({ data, level = 0, isLast = true, initialExpanded = true }: JsonNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const type = Array.isArray(data) ? 'array' : typeof data;
  const isExpandable = type === 'object' || type === 'array';
  
  const formattedValue = useMemo(() => {
    if (data === null) return 'null';
    if (data === undefined) return 'undefined';
    if (typeof data === 'string') return `"${data}"`;
    return String(data);
  }, [data]);

  const toggleExpand = () => {
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
  };

  if (!isExpandable) {
    return (
      <div 
        className="flex items-center py-1"
        style={{ paddingLeft: `${level * 1.5}rem` }}
      >
        <CircleDot className="w-4 h-4 text-white/30 mr-2" />
        <span className={`${typeof data === 'string' ? 'text-emerald-400' : 'text-sky-400'}`}>
          {formattedValue}
        </span>
        {!isLast && <span className="text-white/50">,</span>}
      </div>
    );
  }

  const entries = Object.entries(data as object);

  return (
    <div>
      <div 
        className="flex items-center py-1 cursor-pointer select-none"
        style={{ paddingLeft: `${level * 1.5}rem` }}
        onClick={toggleExpand}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-white/30 mr-2" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white/30 mr-2" />
        )}
        <span className="text-fuchsia-400">
          {type === 'array' ? '[' : '{'}
        </span>
        {!isExpanded && (
          <span className="text-white/50 ml-1">
            {entries.length} {type === 'array' ? 'items' : 'properties'}
          </span>
        )}
      </div>
      
      {isExpanded && (
        <>
          {entries.map(([key, value], index) => (
            <div key={key} className="flex">
              <div 
                className="py-1 select-none"
                style={{ paddingLeft: `${(level + 1) * 1.5}rem` }}
              >
                <span className="text-amber-400">{type === 'array' ? index : key}</span>
                <span className="text-white/50 mx-2">:</span>
              </div>
              <div className="flex-1">
                <JsonNode
                  data={value}
                  level={level + 1}
                  isLast={index === entries.length - 1}
                  initialExpanded={level < 2}
                />
              </div>
            </div>
          ))}
          <div 
            className="py-1"
            style={{ paddingLeft: `${level * 1.5}rem` }}
          >
            <span className="text-fuchsia-400">
              {type === 'array' ? ']' : '}'}
            </span>
            {!isLast && <span className="text-white/50">,</span>}
          </div>
        </>
      )}
    </div>
  );
};

export const JsonDisplay = ({ data, initialExpanded = true }: JsonDisplayProps) => {
  return (
    <div className="font-mono text-sm bg-muted/50 dark:bg-muted/90 text-foreground rounded-xl p-4 overflow-x-auto">
      <JsonNode data={data} initialExpanded={initialExpanded} />
    </div>
  );
}; 