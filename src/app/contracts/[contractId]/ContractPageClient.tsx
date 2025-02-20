"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, Provider, Serializer, SignerInterface, utils } from "koilib";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ContractPageClient({
  params,
}: {
  params: { contractId: string };
}) {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [submitText, setSubmitText] = useState<string>("");
  const [args, setArgs] = useState<unknown>({});
  const [signer, setSigner] = useState<SignerInterface | undefined>(undefined);
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<string>("");
  const [contract, setContract] = useState<Contract | null>(null);
  const [info, setInfo] = useState({
    nickname: "",
    address: "",
    image: "",
    description: "",
  });

  useEffect(() => {
    (async () => {
      try {
        console.log('Initializing with params:', params);
        const provider = new Provider([RPC_NODE]);
        console.log('RPC_NODE:', RPC_NODE);
        
        // Initialize nicknames contract
        console.log('Initializing nicknames contract with ID:', NICKNAMES_CONTRACT_ID);
        const nicknames = new Contract({
          id: NICKNAMES_CONTRACT_ID,
          provider,
          abi: utils.nicknamesAbi,
        });

        let contractId = "";
        let nickname = "";
        
        if (!params.contractId) {
          throw new Error('Contract ID is required');
        }

        console.log('Processing contract/nickname:', params.contractId);
        
        if (params.contractId.startsWith("1")) {
          // If it starts with 1, assume it's a contract address
          contractId = params.contractId;
          try {
            console.log('Using direct contract ID:', contractId);
          } catch (error) {
            console.error('Error processing contract ID:', error);
          }
        } else {
          // For now, just use a hardcoded mapping for known contracts
          const knownContracts: Record<string, string> = {
            'koin': '15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL',
            // Add more known contracts here
          };
          
          nickname = params.contractId;
          contractId = knownContracts[nickname.toLowerCase()];
          
          if (!contractId) {
            console.warn('Unknown contract nickname:', nickname);
            contractId = params.contractId; // Fallback to using the nickname as the contract ID
          }
        }

        if (!contractId) {
          throw new Error('Could not resolve contract ID');
        }

        console.log('Final resolved contractId:', contractId);

        let image = "https://upload.wikimedia.org/wikipedia/commons/b/bc/Unknown_person.jpg";
        let description = "";
        
        if (nickname) {
          try {
            // Use hardcoded metadata for known contracts
            const knownMetadata: Record<string, { image: string, description: string }> = {
              'koin': {
                image: 'https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/koin.png',
                description: 'KOIN is the native currency of the Koinos blockchain'
              }
            };
            
            const metadata = knownMetadata[nickname.toLowerCase()];
            if (metadata) {
              image = metadata.image;
              description = metadata.description;
            }
          } catch (error) {
            console.error('Error setting metadata:', error);
          }
        }

        console.log('Creating contract instance for:', contractId);
        const c = new Contract({
          id: contractId,
          provider: new Provider([RPC_NODE]),
        });

        try {
          console.log('Fetching ABI...');
          const abi = await c.fetchAbi({
            updateFunctions: false,
            updateSerializer: false,
          });
          console.log('Fetched ABI:', abi);
          
          if (!abi || !abi.methods) {
            throw new Error(`no abi found for ${contractId}`);
          }

          console.log('Processing ABI methods...');
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
          console.log('Updating functions from ABI...');
          c.updateFunctionsFromAbi();

          console.log('Setting up serializer...');
          try {
            if (c.abi.koilib_types) {
              console.log('Using koilib_types for serializer');
              c.serializer = new Serializer(c.abi.koilib_types);
            } else if (c.abi.types) {
              console.log('Using types for serializer');
              // Create a namespace object for the serializer
              const namespace = {
                nested: {
                  koinos: {
                    nested: {
                      contracts: {
                        nested: {
                          token: {
                            options: {
                              go_package: "github.com/koinos/koinos-proto-golang/koinos/contracts/token"
                            },
                            nested: {
                              name_arguments: {
                                fields: {}
                              },
                              name_result: { 
                                fields: { 
                                  value: { type: "string", id: 1 } 
                                } 
                              },
                              symbol_arguments: {
                                fields: {}
                              },
                              symbol_result: { 
                                fields: { 
                                  value: { type: "string", id: 1 } 
                                } 
                              },
                              decimals_arguments: {
                                fields: {}
                              },
                              decimals_result: { 
                                fields: { 
                                  value: { type: "uint32", id: 1 } 
                                } 
                              },
                              total_supply_arguments: {
                                fields: {}
                              },
                              total_supply_result: { 
                                fields: { 
                                  value: { type: "uint64", id: 1, options: { jstype: "JS_STRING" } } 
                                } 
                              },
                              balance_of_arguments: { 
                                fields: { 
                                  owner: { type: "bytes", id: 1, options: { "(koinos.btype)": "ADDRESS" } } 
                                } 
                              },
                              balance_of_result: { 
                                fields: { 
                                  value: { type: "uint64", id: 1, options: { jstype: "JS_STRING" } } 
                                } 
                              },
                              transfer_arguments: {
                                fields: {
                                  from: { type: "bytes", id: 1, options: { "(koinos.btype)": "ADDRESS" } },
                                  to: { type: "bytes", id: 2, options: { "(koinos.btype)": "ADDRESS" } },
                                  value: { type: "uint64", id: 3, options: { jstype: "JS_STRING" } }
                                }
                              },
                              transfer_result: {
                                fields: {}
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              };
              
              c.serializer = new Serializer(namespace);
              console.log('Serializer initialized successfully');
            }
          } catch (serializerError) {
            console.error('Error setting up serializer:', serializerError);
            // Continue without serializer if initialization fails
            console.warn('Continuing without serializer due to initialization error');
          }

          console.log('Setting contract and info...');
          setContract(c);
          setInfo({
            nickname,
            address: contractId,
            description,
            image,
          });
          console.log('Contract initialization complete');
        } catch (error) {
          console.error('Error initializing contract:', error);
          if (error instanceof Error) {
            console.error('Error stack:', error.stack);
          }
          toast({
            variant: "destructive",
            title: "Error",
            description: `Failed to initialize contract: ${(error as Error).message}`,
          });
        }
      } catch (error) {
        console.error('Error in contract initialization:', error);
        if (error instanceof Error) {
          console.error('Error stack:', error.stack);
        }
        toast({
          variant: "destructive",
          title: "Error",
          description: `Contract initialization failed: ${(error as Error).message}`,
        });
      }
    })();
  }, [params.contractId, toast]);

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

  const submit = useCallback(async () => {
    if (!contract) return;
    try {
      setLoading(true);
      setResults("");
      const { read_only: readOnly } = contract.abi!.methods[selectedMethod];

      if (readOnly) {
        const { result } = await contract.functions[selectedMethod](args);
        setResults(`result:\n\n${JSON.stringify(result, null, 2)}`);
      } else {
        if (!signer) throw new Error("Connect wallet");

        contract.signer = signer;
        const { transaction, receipt } = await contract.functions[
          selectedMethod
        ](args, {
          rcLimit: 10_00000000,
        });

        toast({
          title: "Transaction submitted",
          description: "The transaction is in the mempool waiting to be mined",
        });
        setResults(`receipt:\n\n${JSON.stringify(receipt, null, 2)}`);

        await transaction!.wait();

        toast({
          title: "Transaction mined",
          description: (
            <span>
              See confirmation in{" "}
              <a
                target="_blank"
                href={`${BLOCK_EXPLORER}/tx/${transaction!.id!}`}
                className="underline"
              >
                koinosblocks
              </a>
            </span>
          ),
        });
      }
      setLoading(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message,
      });
      setLoading(false);
    }
  }, [args, signer, contract, selectedMethod, toast]);

  return (
    <main className={styles.main}>
      <HeaderComponent onChange={(s) => setSigner(s)}></HeaderComponent>
      <ContractInfo {...info}></ContractInfo>
      <div className={styles.w100}>
        {contractMethods
          ? contractMethods.map((contractMethod) => (
              <Button
                key={contractMethod.name}
                variant="outline"
                onClick={() => {
                  setSelectedMethod(contractMethod.name);
                  setResults("");
                  setCode("");
                  if (contractMethod.readOnly) {
                    setSubmitText("Read");
                  } else {
                    setSubmitText("Send");
                  }
                }}
                className={styles.buttonFunction}
              >
                {contractMethod.prettyName}
              </Button>
            ))
          : "loading..."}
      </div>
      {contract && selectedMethod ? (
        <div className={styles.w100}>
          <h3>{prettyName(selectedMethod)}</h3>
          <p>{contract.abi!.methods[selectedMethod].description}</p>
          <KoinosForm
            contract={contract}
            typeName={contract.abi!.methods[selectedMethod].argument}
            onChange={(newArgs) => setArgs(newArgs)}
          ></KoinosForm>
          {signer && !contract.abi!.methods[selectedMethod].read_only ? (
            <div className={styles.signAs}>Sign as {signer.getAddress()}</div>
          ) : null}
          <Button 
            onClick={submit} 
            disabled={loading}
            className="mt-4"
          >
            {submitText}
          </Button>
          {code ? <div className={styles.code}>{code}</div> : null}
          {results ? <div className={styles.code}>{results}</div> : null}
        </div>
      ) : null}
      <FooterComponent></FooterComponent>
    </main>
  );
} 