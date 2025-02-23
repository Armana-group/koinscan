import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const ContractInfo = (props: {
  nickname: string;
  address: string;
  description: string;
  image: string;
}) => {
  const copyAddress = () => {
    navigator.clipboard.writeText(props.address);
    toast.success("Address copied to clipboard");
  };

  return (
    <Card className="w-full bg-background/60 backdrop-blur-lg border-border/50">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Image Section */}
          <div className="flex-shrink-0">
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-0.5">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-xl" />
              <img 
                src={props.image} 
                alt={props.nickname || "Contract"} 
                className="w-full h-full object-cover rounded-full relative z-10"
              />
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-grow space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-1">
                {props.nickname ? `@${props.nickname}` : "Koinos address"}
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <code className="px-2 py-1 bg-muted rounded-md font-mono">
                  {props.address ? props.address.slice(0, 20) + "..." : "loading..."}
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={copyAddress}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  asChild
                >
                  <a href={`https://koinosblocks.com/address/${props.address}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {props.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
