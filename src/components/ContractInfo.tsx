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
    <Card className="w-full bg-white/80 backdrop-blur-xl border-0 shadow-[0_2px_4px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden hover:shadow-[0_4px_8px_rgba(0,0,0,0.08)] transition-all">
      <CardContent className="p-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Image Section */}
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500/5 to-purple-500/5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl" />
              <img 
                src={props.image} 
                alt={props.nickname || "Contract"} 
                className="w-full h-full object-cover relative z-10"
              />
              <div className="absolute bottom-3 right-3 z-20">
                <div className="p-1.5 rounded-full bg-[#1d1d1f]/5 backdrop-blur-xl">
                  <Shield className="w-4 h-4 text-[#1d1d1f]" />
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-grow space-y-4">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <code className="px-4 py-2 bg-[#f5f5f7] rounded-xl font-mono text-sm text-[#1d1d1f] border border-[#1d1d1f]/5">
                    {props.address}
                  </code>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl hover:bg-[#f5f5f7] transition-colors"
                      onClick={copyAddress}
                    >
                      <Copy className="w-4 h-4 text-[#1d1d1f]" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-9 w-9 rounded-xl hover:bg-[#f5f5f7] transition-colors"
                      asChild
                    >
                      <a href={`https://koinosblocks.com/address/${props.address}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 text-[#1d1d1f]" />
                      </a>
                    </Button>
                  </div>
                </div>
                
                {/* Wallet Status */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                  props.signer 
                    ? "bg-green-500/10 text-green-700" 
                    : "bg-[#f5f5f7] text-[#6e6e73]"
                }`}>
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {props.signer ? "Connected" : "Not Connected"}
                  </span>
                </div>
              </div>

              {props.description && (
                <p className="text-[#6e6e73] leading-relaxed max-w-3xl text-lg">
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
