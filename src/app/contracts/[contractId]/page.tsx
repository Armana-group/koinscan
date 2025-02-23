"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Contract, Provider, Serializer, SignerInterface, utils } from "koilib";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, PenLine, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import styles from "../../page.module.css";
import { KoinosForm, prettyName } from "../../../components/KoinosForm";
import { HeaderComponent } from "@/components/HeaderComponent";
import { FooterComponent } from "@/components/FooterComponent";
import {
  BLOCK_EXPLORER,
  NICKNAMES_CONTRACT_ID,
  RPC_NODE,
} from "@/koinos/constants";
import { ContractInfo } from "@/components/ContractInfo";
import { JsonDisplay } from "@/components/JsonDisplay";
import { useRouter } from "next/navigation";

export default function ContractPage({
  params,
}: {
  params: { contractId: string };
}) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [submitText, setSubmitText] = useState<string>("");
  const [args, setArgs] = useState<unknown>({});
  const [signer, setSigner] = useState<SignerInterface | undefined>(undefined);
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
          const abi = await c.fetchAbi({
            updateFunctions: false,
            updateSerializer: false,
          });
          
          if (!abi || !abi.methods) {
            throw new Error(`No ABI found for contract ${contractId}`);
          }

          // Process ABI methods
          Object.keys(abi.methods).forEach((m) => {
            if (abi.methods[m].entry_point === undefined) {
              abi.methods[m].entry_point = Number(
                abi.methods[m]["entry-point" as "entry_point"],
              );
            }
            if (abi.methods[m].read_only === undefined) {
              abi.methods[m].read_only = abi.methods[m]["read-only" as "read_only"];
            }
          });

          c.abi = abi;
          c.updateFunctionsFromAbi();
          
          if (c.abi.koilib_types) {
            c.serializer = new Serializer(c.abi.koilib_types);
          } else if (c.abi.types) {
            c.serializer = new Serializer(c.abi.types);
          }
          
          setContract(c);
          setInfo({
            nickname,
            address: contractId,
            description,
            image,
          });
        } catch (error) {
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
    return Object.keys(contract.abi!.methods).map((name) => {
      return {
        name,
        prettyName: prettyName(name),
        readOnly: contract.abi!.methods[name].read_only,
      };
    });
  }, [contract]);

  const handleMethodSubmit = useCallback(async (methodName: string, isRead: boolean) => {
    if (!contract) return;
    
    try {
      setSelectedMethod(methodName);
      setResults("");
      setCode("");
      setSubmitText(isRead ? "Read" : "Send");
      setLoading(true);

      const { read_only: readOnly } = contract.abi!.methods[methodName];

      if (readOnly) {
        const { result } = await contract.functions[methodName](args);
        setResults(JSON.stringify(result));
      } else {
        if (!signer) throw new Error("Connect wallet");

        contract.signer = signer;
        const { transaction, receipt } = await contract.functions[methodName](args, {
          rcLimit: 10_00000000,
        });

        toast.success("Transaction submitted", {
          description: "the transaction is in the mempool waiting to be mined",
          duration: 15000,
        });
        setResults(JSON.stringify(receipt));

        await transaction!.wait();

        toast.success("Transaction mined", {
          description: (
            <span>
              see confirmation in{" "}
              <a
                target="_blank"
                href={`https://koinosblocks.com/tx/${transaction!.id!}`}
                className="text-primary hover:underline"
              >
                koinosblocks
              </a>
            </span>
          ),
          duration: 15000,
        });
      }
      setLoading(false);
    } catch (error) {
      toast.error((error as Error).message, {
        duration: 15000,
      });
      setLoading(false);
    }
  }, [args, signer, contract]);

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="container mx-auto space-y-8">
        <HeaderComponent onChange={(s) => setSigner(s)} />
        {!error && contract && <ContractInfo {...info} />}
        
        {/* Function Groups */}
        {error ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md w-full p-8">
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
                
                <div className="w-full space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      ref={searchInputRef}
                      className="pl-9 bg-background"
                      placeholder="Try another contract address or @nickname"
                      defaultValue=""
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && searchInputRef.current?.value) {
                          router.push(`/contracts/${searchInputRef.current.value}`);
                        }
                      }}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      if (searchInputRef.current?.value) {
                        router.push(`/contracts/${searchInputRef.current.value}`);
                      }
                    }}
                  >
                    Search Contract
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-lg text-muted-foreground">Loading contract...</div>
          </div>
        ) : contract ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Read Functions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-semibold">Read Functions</h2>
              </div>
              <div className="space-y-4">
                {contractMethods
                  ?.filter((method) => method.readOnly)
                  .map((method) => (
                    <Card key={method.name} className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 transition-all hover:shadow-lg">
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg font-medium">{method.prettyName}</CardTitle>
                            <CardDescription className="mt-1 text-sm text-muted-foreground">
                              {contract.abi?.methods[method.name].description || "No description available"}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                            Read
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <KoinosForm
                          contract={contract}
                          protobufType={method.name}
                          onChange={(newArgs) => {
                            if (selectedMethod === method.name) {
                              setArgs(newArgs);
                            }
                          }}
                        />
                        <Button 
                          className="mt-4 w-full"
                          variant="outline"
                          onClick={() => handleMethodSubmit(method.name, true)}
                          disabled={loading && selectedMethod === method.name}
                        >
                          Read Data
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        {selectedMethod === method.name && results && (
                          <div className="mt-4">
                            <div className="text-sm font-medium text-muted-foreground mb-2">
                              Result:
                            </div>
                            <JsonDisplay data={JSON.parse(results)} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>

            {/* Write Functions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <PenLine className="w-5 h-5 text-purple-500" />
                <h2 className="text-xl font-semibold">Write Functions</h2>
              </div>
              <div className="space-y-4">
                {contractMethods
                  ?.filter((method) => !method.readOnly)
                  .map((method) => (
                    <Card key={method.name} className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 transition-all hover:shadow-lg">
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg font-medium">{method.prettyName}</CardTitle>
                            <CardDescription className="mt-1 text-sm text-muted-foreground">
                              {contract.abi?.methods[method.name].description || "No description available"}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                            Write
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <KoinosForm
                          contract={contract}
                          protobufType={method.name}
                          onChange={(newArgs) => {
                            if (selectedMethod === method.name) {
                              setArgs(newArgs);
                            }
                          }}
                        />
                        {signer ? (
                          <div className="mt-2 text-sm text-muted-foreground">
                            Signing as: {signer.getAddress()}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-yellow-500">
                            Please connect your wallet to execute this function
                          </div>
                        )}
                        <Button 
                          className="mt-4 w-full"
                          variant={signer ? "default" : "outline"}
                          onClick={() => handleMethodSubmit(method.name, false)}
                          disabled={(!signer && !method.readOnly) || (loading && selectedMethod === method.name)}
                        >
                          {signer ? "Execute Transaction" : "Connect Wallet"}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        {selectedMethod === method.name && results && (
                          <div className="mt-4">
                            <div className="text-sm font-medium text-muted-foreground mb-2">
                              Receipt:
                            </div>
                            <JsonDisplay data={JSON.parse(results)} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="text-lg text-muted-foreground">Loading contract...</div>
          </div>
        )}
        <FooterComponent />
      </div>
    </main>
  );
}
