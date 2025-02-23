import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Shield, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Contract, Provider, utils } from "koilib";
import { RPC_NODE } from "@/koinos/constants";

export const ContractInfo = (props: {
  nickname: string;
  address: string;
  description: string;
  image: string;
  signer?: any;
}) => {
  const [balance, setBalance] = useState<string | null>(null);
  const [decimals, setDecimals] = useState<number>(8); // Default to 8 decimals
  const [symbol, setSymbol] = useState<string>("");

  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (props.signer) {
        try {
          console.log("Fetching token info for address:", props.address);
          console.log("Signer address:", props.signer.getAddress());
          
          const provider = new Provider([RPC_NODE]);
          const contract = new Contract({
            id: props.address,
            provider,
            abi: utils.tokenAbi
          });

          // Fetch symbol
          try {
            const { result: symbolResult } = await contract.functions.symbol({});
            if (symbolResult?.value) {
              setSymbol(symbolResult.value);
              console.log("Token symbol:", symbolResult.value);
            }
          } catch (error) {
            console.warn("Failed to fetch symbol:", error);
          }

          // Fetch decimals
          try {
            const { result: decimalsResult } = await contract.functions.decimals({});
            if (decimalsResult?.value !== undefined) {
              setDecimals(decimalsResult.value);
              console.log("Token decimals:", decimalsResult.value);
            }
          } catch (error) {
            console.warn("Failed to fetch decimals:", error);
          }

          // Fetch balance
          try {
            const signerAddress = props.signer.getAddress();
            console.log("Fetching balance for address:", signerAddress);
            
            const { result } = await contract.functions.balanceOf({
              owner: signerAddress
            });
            
            console.log("Balance result:", result);
            
            if (result?.value) {
              setBalance(result.value);
              console.log("Setting balance to:", result.value);
            } else {
              console.log("No balance value in result");
              // Try alternative balance field name
              if (result?.balance) {
                setBalance(result.balance);
                console.log("Setting balance from alternative field to:", result.balance);
              }
            }
          } catch (error) {
            console.error("Failed to fetch balance:", error);
            
            // Try alternative balance endpoint
            try {
              console.log("Trying alternative balance endpoint...");
              const { result } = await contract.functions.balance({
                owner: props.signer.getAddress()
              });
              
              console.log("Alternative balance result:", result);
              
              if (result?.value) {
                setBalance(result.value);
                console.log("Setting balance from alternative endpoint to:", result.value);
              } else if (result?.balance) {
                setBalance(result.balance);
                console.log("Setting balance from alternative endpoint field to:", result.balance);
              }
            } catch (altError) {
              console.error("Failed to fetch balance from alternative endpoint:", altError);
              toast.error("Failed to fetch balance");
            }
          }
        } catch (error) {
          console.error("Failed to initialize contract:", error);
          toast.error("Failed to load token information");
        }
      } else {
        console.log("No signer available");
        setBalance(null);
      }
    };

    fetchTokenInfo();
  }, [props.signer, props.address]);

  const copyAddress = () => {
    navigator.clipboard.writeText(props.address);
    toast.success("Address copied to clipboard");
  };

  const formatBalance = (balance: string, decimals: number) => {
    try {
      const value = BigInt(balance);
      const divisor = BigInt(10 ** decimals);
      const integerPart = value / divisor;
      const fractionalPart = value % divisor;
      
      let formattedFractional = fractionalPart.toString().padStart(decimals, '0');
      // Remove trailing zeros
      formattedFractional = formattedFractional.replace(/0+$/, '');
      
      return formattedFractional 
        ? `${integerPart}.${formattedFractional} ${symbol}`
        : `${integerPart} ${symbol}`;
    } catch (error) {
      console.error("Failed to format balance:", error);
      return `${balance} ${symbol}`;
    }
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
                    {props.signer ? (
                      <div className="flex items-center gap-2">
                        <span>Connected</span>
                        {balance && (
                          <span className="px-2 py-0.5 bg-green-500/20 rounded-full text-xs">
                            {formatBalance(balance, decimals)}
                          </span>
                        )}
                      </div>
                    ) : "Not Connected"}
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
