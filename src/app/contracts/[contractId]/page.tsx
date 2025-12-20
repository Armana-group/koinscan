"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Abi, Contract, Provider, Serializer, SignerInterface, utils } from "koilib";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, BookOpen, Copy, PenLine, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import * as toast from "@/lib/toast";
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
import { useRouter, useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/contexts/WalletContext";
import { cn } from "@/lib/utils";
import { abiGovernance } from "@/koinos/abis";
import { getTokenImageUrl } from "@/koinos/utils";

export default function ContractPage() {
  const params = useParams();
  const contractIdParam = params.contractId as string;
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
  const [functionSearchQuery, setFunctionSearchQuery] = useState<string>("");
  const { signer, provider } = useWallet();
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
        const nicknames = new Contract({
          id: NICKNAMES_CONTRACT_ID,
          provider,
          abi: utils.nicknamesAbi,
        });

        let contractId = "";
        let nickname = "";
        
        // Handle contract ID resolution
        if (contractIdParam.startsWith("1")) {
          contractId = contractIdParam;
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
          nickname = contractIdParam;
          try {
            // resolve nickname
            const { result } = await nicknames.functions.get_address({
              value: contractIdParam.replace("@", ""),
            });
            if (!result || !result.value) {
              throw new Error(`Contract not found for nickname: @${contractIdParam}`);
            }
            contractId = result.value;
          } catch (error) {
            throw new Error(`Failed to resolve address for @${contractIdParam}`);
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
              // Use our token image utility, falling back to metadata.image if provided
              image = getTokenImageUrl(contractId, nickname);
              if (metadata.image) {
                // If metadata has an image and it's a full URL, use it as a secondary option
                if (metadata.image.startsWith('http')) {
                  // We'll try this URL only if our main image fails to load
                  console.log(`Using metadata image as backup: ${metadata.image}`);
                }
              }
              description = metadata.bio || '';
            }
          } catch (error) {
            console.warn("Failed to fetch metadata:", error);
          }
        }

        // Initialize contract
        const c = new Contract({
          id: contractId,
          provider,
        });

        // Fetch and process ABI
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

        // Try to create a serializer, but continue without one if it fails
        // Some contracts have ABIs with protobuf extensions that can't be resolved
        console.log("[Contract] Attempting to create serializer for", contractId);
        console.log("[Contract] Has koilib_types:", !!c.abi.koilib_types);
        console.log("[Contract] Has types:", !!c.abi.types);
        try {
          if (c.abi.koilib_types) {
            console.log("[Contract] Creating serializer from koilib_types");
            const serializer = new Serializer(c.abi.koilib_types);
            serializer.root.resolveAll();
            c.serializer = serializer;
            console.log("[Contract] Serializer created successfully from koilib_types");
          } else if (c.abi.types) {
            console.log("[Contract] Creating serializer from types (binary)");
            const serializer = new Serializer(c.abi.types);
            console.log("[Contract] Serializer created, now resolving...");
            serializer.root.resolveAll();
            c.serializer = serializer;
            console.log("[Contract] Serializer created successfully from types");
          }
        } catch (serializerError) {
          console.error("[Contract] Error initializing serializer:", serializerError);
          console.log("[Contract] Continuing without serializer");
          // Continue without a serializer - the KoinosForm will show a warning
        }
        console.log("[Contract] Setting contract, serializer is:", c.serializer ? "present" : "absent");

        setContract(c);
        setInfo({
          nickname,
          address: contractId,
          description,
          image,
        });
      } catch (error) {
        setError((error as Error).message);
        setContract(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [contractIdParam, provider]);

  const contractMethods = useMemo(() => {
    if (!contract) return [];
    return Object.keys(contract.abi!.methods).map((name) => ({
      name,
      prettyName: prettyName(name),
      readOnly: contract.abi!.methods[name].read_only,
    }));
  }, [contract]);

  // Group and sort methods: read functions first, then write functions, each sorted alphabetically
  const organizedMethods = useMemo(() => {
    if (!contractMethods.length) return [];
    
    // Separate read and write methods
    const readMethods = contractMethods.filter(method => method.readOnly);
    const writeMethods = contractMethods.filter(method => !method.readOnly);
    
    // Sort each group alphabetically by prettyName
    const sortByName = (a: typeof contractMethods[0], b: typeof contractMethods[0]) => 
      a.prettyName.localeCompare(b.prettyName);
    
    readMethods.sort(sortByName);
    writeMethods.sort(sortByName);
    
    // Combine with read methods first, then write methods
    return [...readMethods, ...writeMethods];
  }, [contractMethods]);

  // Filter methods based on search query
  const filteredMethods = useMemo(() => {
    if (!organizedMethods.length) return [];
    if (!functionSearchQuery.trim()) return organizedMethods;
    
    const query = functionSearchQuery.toLowerCase();
    return organizedMethods.filter(method => 
      method.prettyName.toLowerCase().includes(query) || 
      method.name.toLowerCase().includes(query)
    );
  }, [organizedMethods, functionSearchQuery]);

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

      // Debug info about what's being called
      console.log(`Calling method: ${methodName}`, currentArgs);

      // Check if this is a balance method and validate address input
      if (/balance/i.test(methodName)) {
        // Get the owner address from the arguments object
        let addressArg = '';
        
        if (typeof currentArgs === 'object' && currentArgs !== null) {
          // Try common parameter names for address in balance methods
          addressArg = (currentArgs as Record<string, any>)['owner'] || 
                      (currentArgs as Record<string, any>)['address'] || 
                      (currentArgs as Record<string, any>)['account'] || '';
        }
        
        if (!addressArg || addressArg.trim() === '') {
          const errorMessage = "Please enter an address to check the balance";
          
          setMethodStates(prev => ({
            ...prev,
            [methodName]: {
              ...prev[methodName],
              loading: false,
              error: errorMessage
            }
          }));
          
          toast.error(errorMessage);
          return; // Exit early without making the contract call
        }
      }

      if (isRead) {
        const { result } = await contract.functions[methodName](currentArgs);
        
        // Debug the actual result
        console.log(`Result from ${methodName}:`, result);
        
        // Special handling for balance methods when result is empty or null
        let processedResult = result;
        
        // Check if this is a balance-related function and has an empty result
        const isBalanceMethod = /balance/i.test(methodName); // Case insensitive check for any 'balance' method
        
        if (isBalanceMethod && 
            (!result || 
             Object.keys(result).length === 0 || 
             (typeof result === 'object' && result.value === undefined))) {
          console.log(`Empty balance result for ${methodName}, defaulting to zero value`);
          processedResult = { value: "0" };
        }
        
        setMethodStates(prev => ({
          ...prev,
          [methodName]: {
            ...prev[methodName],
            loading: false,
            results: JSON.stringify(processedResult, null, 2)
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
          duration: 15000,
        });
        
        setMethodStates(prev => ({
          ...prev,
          [methodName]: {
            ...prev[methodName],
            loading: false,
            results: JSON.stringify(receipt, null, 2)
          }
        }));

        await transaction!.wait();

        toast.custom(
          <div className="flex flex-col gap-2">
            <div className="font-medium">Transaction mined</div>
            <div>
              see confirmation in{" "}
              <a
                href={`/tx/${transaction!.id!}`}
                className="text-primary hover:underline"
              >
                view transaction
              </a>
            </div>
          </div>,
          {
            duration: 15000,
            icon: '✅',
          }
        );
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error(`Error calling ${methodName}:`, errorMessage);
      
      // For balance-related read methods, return 0 instead of showing an error
      const isBalanceMethod = isRead && /balance/i.test(methodName);
      
      if (isBalanceMethod) {
        console.log(`Balance method ${methodName} failed, showing zero balance instead`);
        setMethodStates(prev => ({
          ...prev,
          [methodName]: {
            ...prev[methodName],
            loading: false,
            results: JSON.stringify({ value: "0" }, null, 2)
          }
        }));
        // Optional toast to indicate fallback behavior
        toast.custom("No balance found, showing zero", { duration: 3000 });
      } else {
        // Standard error handling for non-balance methods
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

  // Handler for function search input
  const handleFunctionSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFunctionSearchQuery(e.target.value);
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
                  
                  <form onSubmit={handleSearch} className="w-full space-y-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <Input
                        ref={searchInputRef}
                        className="pl-8 bg-background transition-shadow duration-200 focus-visible:shadow-sm"
                        placeholder="Try another contract address or @nickname"
                        defaultValue=""
                      />
                    </div>
                    <Button 
                      type="submit"
                      variant="outline" 
                      className="w-full h-7 text-xs font-medium rounded-md"
                    >
                      Search Contract
                      <ArrowRight className="w-3 h-3 ml-1" />
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
                        <Badge variant="outline" className="text-xs py-0 h-4 bg-blue-500/5 text-blue-400 border-0">
                          {contractMethods?.filter(m => m.readOnly).length || 0} Read
                        </Badge>
                        <Badge variant="outline" className="text-xs py-0 h-4 bg-purple-500/5 text-purple-400 border-0">
                          {contractMethods?.filter(m => !m.readOnly).length || 0} Write
                        </Badge>
                      </span>
                    </span>
                  </h2>
                </div>

                {/* Function search input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <Input
                    className="pl-8 bg-background transition-shadow duration-200 focus-visible:shadow-sm"
                    placeholder="Search functions..."
                    value={functionSearchQuery}
                    onChange={handleFunctionSearch}
                  />
                </div>

                <div className="space-y-3">
                  {filteredMethods.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No functions match your search
                    </div>
                  ) : (
                    filteredMethods.map((method) => (
                      <Card 
                        key={method.name} 
                        className="group bg-transparent border-0 shadow-none rounded-lg overflow-hidden transition-all"
                      >
                        <CardHeader 
                          className="p-4 cursor-pointer"
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
                                "rounded-full border-0 px-2.5 py-0 text-xs h-5",
                                method.readOnly 
                                  ? "bg-blue-500/5 text-blue-400" 
                                  : "bg-purple-500/5 text-purple-400"
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
                                "mt-3 transition-all duration-200 ease-in-out rounded-md text-xs font-medium",
                                "ml-auto",
                                "h-6 px-2",
                                "bg-transparent border border-border/60",
                                method.readOnly
                                  ? "text-blue-600 hover:border-blue-400 hover:text-blue-500"
                                  : signer
                                  ? "text-purple-600 hover:border-purple-400 hover:text-purple-500"
                                  : "text-muted-foreground hover:border-muted-foreground/60"
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                handleMethodSubmit(method.name, Boolean(method.readOnly));
                              }}
                              disabled={(!signer && !method.readOnly) || methodStates[method.name]?.loading}
                            >
                              {methodStates[method.name]?.loading ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                  <span>{method.readOnly ? "Reading..." : "Executing..."}</span>
                                </div>
                              ) : (
                                <>
                                  {method.readOnly
                                    ? "Read Data"
                                    : signer
                                    ? "Execute Transaction"
                                    : "Connect Wallet"}
                                  <ArrowRight className="w-3 h-3 ml-1" />
                                </>
                              )}
                            </Button>
                            {methodStates[method.name]?.results && (
                              <div className="mt-6 animate-in fade-in slide-in-from-top-4">
                                {/* <div className="text-sm font-medium text-foreground mb-2">
                                  {method.readOnly ? "Result" : "Receipt"}
                                </div> */}
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
                    ))
                  )}
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
