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
          contractId = params.contractId;
          try {
            console.log('Fetching main token for:', contractId);
            const { result } = await nicknames.functions.get_main_token({
              value: contractId,
            });
            console.log('Main token result:', result);
            if (result) {
              nickname = new TextDecoder().decode(
                utils.toUint8Array(result.token_id.slice(2)),
              );
              console.log('Decoded nickname:', nickname);
            }
          } catch (error) {
            console.error('Error getting main token:', error);
          }
        } else {
          nickname = params.contractId;
          try {
            console.log('Resolving nickname:', nickname);
            const { result } = await nicknames.functions.get_address({
              value: params.contractId.replace("@", ""),
            });
            console.log('Nickname resolution result:', result);
            if (result) contractId = result.value;
          } catch (error) {
            console.error('Error resolving nickname:', error);
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
            console.log('Fetching metadata for nickname:', nickname);
            const tokenId = `0x${utils.toHexString(new TextEncoder().encode(nickname))}`;
            console.log('Token ID:', tokenId);
            const { result } = await nicknames.functions.metadata_of({
              token_id: tokenId,
            });
            console.log('Metadata result:', result);
            if (result && result.value) {
              const metadata = JSON.parse(result.value);
              image = metadata.image || image;
              description = metadata.bio || description;
            }
          } catch (error) {
            console.error('Error fetching metadata:', error);
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
              // Don't try to parse the types, use them directly
              c.serializer = new Serializer(c.abi.types);
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