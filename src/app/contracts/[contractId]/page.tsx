"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Abi, Contract, Provider, Serializer, SignerInterface, utils } from "koilib";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, BookOpen, Copy, PenLine, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import styles from "../../page.module.css";
import { KoinosForm, prettyName } from "@/components/KoinosForm";
import { FooterComponent } from "@/components/FooterComponent";
import {
  BLOCK_EXPLORER,
  GOVERNANCE_CONTRACT_ID,
  NICKNAMES_CONTRACT_ID,
  RPC_NODE,
} from "@/koinos/constants";
import { ContractInfo } from "@/components/ContractInfo";
import { JsonDisplay } from "@/components/JsonDisplay";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/contexts/WalletContext";
import { cn } from "@/lib/utils";
import { abiGovernance } from "@/koinos/abis";

export default function ContractPage({
  params,
}: {
  params: { contractId: string };
}) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [methodStates, setMethodStates] = useState<Record<string, {
    args: unknown;
    loading: boolean;
    results: string;
    error?: string;
  }>>({});
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [submitText, setSubmitText] = useState<string>("");
  const { signer } = useWallet();
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<string>("");
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState({
    nickname: "",
    address: "",
    image: "",
    description: "",
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const provider = new Provider([RPC_NODE]);
        const nicknames = new Contract({
          id: NICKNAMES_CONTRACT_ID,
          provider,
          abi: utils.nicknamesAbi,
        });

        let contractId = "";
        let nickname = "";
        
        // Handle contract ID resolution
        if (params.contractId.startsWith("1")) {
          contractId = params.contractId;
          try {
            const { result } = await nicknames.functions.get_main_token({
              value: contractId,
            });
            if (result) {
              nickname = new TextDecoder().decode(
                utils.toUint8Array(result.token_id.slice(2)),
              );
            }
          } catch (error) {
            console.warn("Failed to resolve nickname for contract:", error);
          }
        } else {
          nickname = params.contractId;
          try {
            // resolve nickname
            const { result } = await nicknames.functions.get_address({
              value: params.contractId.replace("@", ""),
            });
            if (!result || !result.value) {
              throw new Error(`Contract not found for nickname: @${params.contractId}`);
            }
            contractId = result.value;
          } catch (error) {
            throw new Error(`Failed to resolve address for @${params.contractId}`);
          }
        }

        if (!contractId) {
          throw new Error("No contract address found");
        }

        let image = "https://upload.wikimedia.org/wikipedia/commons/b/bc/Unknown_person.jpg";
        let description = "";
        
        // Try to fetch metadata if nickname exists
        if (nickname) {
          try {
            const { result } = await nicknames.functions.metadata_of({
              token_id: `0x${utils.toHexString(new TextEncoder().encode(nickname))}`,
            });
            if (result && result.value) {
              const metadata = JSON.parse(result.value);
              image = metadata.image;
              description = metadata.bio;
            }
          } catch (error) {
            console.warn("Failed to fetch metadata:", error);
          }
        }

        // Initialize contract
        const c = new Contract({
          id: contractId,
          provider: new Provider([RPC_NODE]),
        });

        try {
          let abi: Abi | undefined;
          if (contractId === GOVERNANCE_CONTRACT_ID) {
            // special case to fix the abi of governance
            abi = abiGovernance;
          } else {
            abi = await c.fetchAbi({
              updateFunctions: false,
              updateSerializer: false,
            });
          }
          
          if (!abi || !abi.methods) {
            throw new Error(`No ABI found for contract ${contractId}`);
          }

          // Process ABI methods
          Object.keys(abi.methods).forEach((m) => {
            if (abi.methods[m].entry_point === undefined) {
              abi.methods[m].entry_point = Number(
                (abi.methods[m] as any)["entry-point"]
              );
            }
            if (abi.methods[m].read_only === undefined) {
              abi.methods[m].read_only = (abi.methods[m] as any)["read-only"];
            }
          });

          c.abi = abi;
          c.updateFunctionsFromAbi();
          
          if (c.abi.koilib_types) {
            c.serializer = new Serializer(c.abi.koilib_types);
          } else if (c.abi.types) {
            try {
              c.serializer = new Serializer(c.abi.types);
            } catch (serializerError) {
              console.error("Error initializing serializer:", serializerError);
              // Continue without a serializer
            }
          }
          
          setContract(c);
          setInfo({
            nickname,
            address: contractId,
            description,
            image,
          });
        } catch (error) {
          console.error("Failed to load contract ABI:", error);
          throw new Error(`Failed to load contract ABI: ${(error as Error).message}`);
        }
      } catch (error) {
        setError((error as Error).message);
        setContract(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.contractId]);

  const contractMethods = useMemo(() => {
    if (!contract) return [];
    return Object.keys(contract.abi!.methods).map((name) => ({
      name,
      prettyName: prettyName(name),
      readOnly: contract.abi!.methods[name].read_only,
    }));
  }, [contract]);

  const handleMethodSubmit = useCallback(async (methodName: string, isRead: boolean) => {
    if (!contract) return;
    
    try {
      setMethodStates(prev => ({
        ...prev,
        [methodName]: {
          ...prev[methodName],
          loading: true,
          results: "",
          error: undefined
        }
      }));

      const { read_only: readOnly } = contract.abi!.methods[methodName];
      const currentArgs = methodStates[methodName]?.args || {};

      if (isRead) {
        const { result } = await contract.functions[methodName](currentArgs);
        setMethodStates(prev => ({
          ...prev,
          [methodName]: {
            ...prev[methodName],
            loading: false,
            results: JSON.stringify(result)
          }
        }));
      } else {
        if (!signer) throw new Error("Connect wallet");

        signer.provider = contract.provider;
        contract.signer = signer;
        const { transaction, receipt } = await contract.functions[methodName](currentArgs, {
          rcLimit: 10_00000000,
        });

        toast.success("Transaction submitted", {
          description: "the transaction is in the mempool waiting to be mined",
          duration: 15000,
        });
        
        setMethodStates(prev => ({
          ...prev,
          [methodName]: {
            ...prev[methodName],
            loading: false,
            results: JSON.stringify(receipt)
          }
        }));

        await transaction!.wait();

        toast.success("Transaction mined", {
          description: (
            <span>
              see confirmation in{" "}
              <a
                target="_blank"
                href={`${BLOCK_EXPLORER}/tx/${transaction!.id!}`}
                className="text-primary hover:underline"
              >
                koinosblocks
              </a>
            </span>
          ),
          duration: 15000,
        });
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setMethodStates(prev => ({
        ...prev,
        [methodName]: {
          ...prev[methodName],
          loading: false,
          error: errorMessage
        }
      }));
      toast.error(errorMessage, {
        duration: 15000,
      });
    }
  }, [contract, signer, methodStates]);

  const handleMethodArgsChange = useCallback((methodName: string, newArgs: unknown) => {
    setMethodStates(prev => ({
      ...prev,
      [methodName]: {
        ...prev[methodName],
        args: newArgs
      }
    }));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInputRef.current?.value) {
      router.push(`/contracts/${searchInputRef.current.value}`);
    }
  };

  // Add a copy to clipboard function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-[980px] mx-auto space-y-2">
          {/* Contract Info Section */}
          {!error && contract && (
            <div className="space-y-8">
              <div className="text-center space-y-4 py-8">
                <h1 className="text-5xl font-semibold text-foreground">
                  {info.nickname ? `@${info.nickname}` : "Smart Contract"}
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  {info.description || "Interact with this smart contract on the Koinos blockchain"}
                </p>
              </div>
              
              <ContractInfo {...info} signer={signer} />
            </div>
          )}
          
          {/* Function Groups */}
          {error ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Card className="max-w-md w-full p-8 bg-background/80 backdrop-blur-xl border-border shadow-sm rounded-2xl">
                <div className="flex flex-col items-center gap-6">
                  <div className="rounded-full bg-red-500/10 p-4">
                    <svg
                      className="h-8 w-8 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-red-500 text-center">Contract Not Found</div>
                    <div className="text-center text-muted-foreground mt-2">{error}</div>
                  </div>
                  
                  <form onSubmit={handleSearch} className="w-full space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        ref={searchInputRef}
                        className="pl-9 bg-background"
                        placeholder="Try another contract address or @nickname"
                        defaultValue=""
                      />
                    </div>
                    <Button 
                      type="submit"
                      variant="outline" 
                      className="w-full"
                    >
                      Search Contract
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </div>
              </Card>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-lg text-muted-foreground">Loading contract...</div>
            </div>
          ) : contract ? (
            <div className="space-y-6">
              {/* Read Functions */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                    Functions{" "}
                    <span className="text-muted-foreground flex items-center">
                      ({contractMethods?.length || 0})
                      <span className="flex items-center gap-1 ml-2">
                        <Badge variant="outline" className="text-xs py-0 h-5 bg-blue-500/10 text-blue-600 border-0">
                          {contractMethods?.filter(m => m.readOnly).length || 0} Read
                        </Badge>
                        <Badge variant="outline" className="text-xs py-0 h-5 bg-purple-500/10 text-purple-600 border-0">
                          {contractMethods?.filter(m => !m.readOnly).length || 0} Write
                        </Badge>
                      </span>
                    </span>
                  </h2>
                </div>
                <div className="space-y-4">
                  {contractMethods?.map((method) => (
                    <Card 
                      key={method.name} 
                      className="group bg-background/80 backdrop-blur-xl border-border shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all"
                    >
                      <CardHeader 
                        className="p-6 cursor-pointer"
                        onClick={() => {
                          setSelectedMethod(selectedMethod === method.name ? "" : method.name);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {selectedMethod === method.name ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <div>
                              <CardTitle className="text-xl font-semibold text-foreground">
                                {method.prettyName}
                              </CardTitle>
                              <CardDescription className="mt-1 text-muted-foreground">
                                {contract.abi?.methods[method.name].description || "No description available"}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge 
                            className={cn(
                              "rounded-full border-0 px-3",
                              method.readOnly 
                                ? "bg-blue-500/10 text-blue-600" 
                                : "bg-purple-500/10 text-purple-600"
                            )}
                          >
                            {method.readOnly ? "Read" : "Write"}
                          </Badge>
                        </div>
                      </CardHeader>
                      {selectedMethod === method.name && (
                        <CardContent className="p-6 pt-0">
                          <div className="rounded-xl p-4">
                            <KoinosForm
                              contract={contract}
                              protobufType={method.name}
                              onChange={(newArgs) => handleMethodArgsChange(method.name, newArgs)}
                            />
                          </div>
                          {!method.readOnly && signer ? (
                            <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span>Signing as: {signer.getAddress()}</span>
                            </div>
                          ) : !method.readOnly ? (
                            <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              <span>Please connect your wallet to execute this function</span>
                            </div>
                          ) : null}
                          <Button 
                            type="button"
                            className={cn(
                              "mt-4 w-full rounded-full h-12 text-base font-medium",
                              method.readOnly
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : signer
                                ? "bg-purple-600 text-white hover:bg-purple-700"
                                : "bg-background text-muted-foreground hover:bg-border"
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              handleMethodSubmit(method.name, Boolean(method.readOnly));
                            }}
                            disabled={(!signer && !method.readOnly) || methodStates[method.name]?.loading}
                          >
                            {methodStates[method.name]?.loading ? (
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                <span>{method.readOnly ? "Reading..." : "Executing..."}</span>
                              </div>
                            ) : (
                              <>
                                {method.readOnly
                                  ? "Read Data"
                                  : signer
                                  ? "Execute Transaction"
                                  : "Connect Wallet"}
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </Button>
                          {methodStates[method.name]?.results && (
                            <div className="mt-6 animate-in fade-in slide-in-from-top-4">
                              <div className="text-sm font-medium text-foreground mb-2">
                                {method.readOnly ? "Result" : "Receipt"}
                              </div>
                              <div className="rounded-xl p-4 overflow-x-auto relative">
                                <JsonDisplay data={JSON.parse(methodStates[method.name].results)} />
                              </div>
                            </div>
                          )}

                          {/* Error display */}
                          {methodStates[method.name]?.error && (
                            <div className="mt-6 animate-in fade-in slide-in-from-top-4">
                              <div className="text-sm font-medium text-red-500 mb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4" />
                                  Error
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 rounded-md text-xs opacity-80 hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30"
                                  onClick={() => copyToClipboard(methodStates[method.name].error || "")}
                                >
                                  <Copy className="h-3.5 w-3.5 mr-1" />
                                  Copy
                                </Button>
                              </div>
                              <div className="rounded-xl p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                                <div className="font-mono text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap break-words">
                                  {methodStates[method.name].error}
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <FooterComponent />
        </div>
      </main>
    </>
  );
}
