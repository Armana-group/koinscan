import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Shield, Wallet } from "lucide-react";
import { toast } from "sonner";

export const ContractInfo = (props: {
  nickname: string;
  address: string;
  description: string;
  image: string;
  signer?: any;
}) => {
  const copyAddress = () => {
    navigator.clipboard.writeText(props.address);
    toast.success("Address copied to clipboard");
  };

  return (
    <Card className="w-full bg-background/80 backdrop-blur-xl border-border shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
      <CardContent className="p-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Image Section */}
          <div className="flex-shrink-0">
            <div className="relative w-12 h-12 md:w-12 md:h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500/5 to-purple-500/5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl" />
              <img 
                src={props.image} 
                alt={props.nickname || "Contract"} 
                className="w-full h-full object-cover relative z-10"
              />
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-grow space-y-4">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <code className="px-4 py-2 bg-muted rounded-xl font-mono text-sm text-foreground border border-border">
                    {props.address}
                  </code>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl hover:bg-muted transition-colors"
                      onClick={copyAddress}
                    >
                      <Copy className="w-4 h-4 text-foreground" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-9 w-9 rounded-xl hover:bg-muted transition-colors"
                      asChild
                    >
                      <a href={`https://koinosblocks.com/address/${props.address}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 text-foreground" />
                      </a>
                    </Button>
                  </div>
                </div>
                
                {/* Wallet Status */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                  props.signer 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {props.signer ? "Connected" : "Not Connected"}
                  </span>
                </div>
              </div>

              {props.description && (
                <p className="text-muted-foreground leading-relaxed max-w-3xl text-lg">
                  {props.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
