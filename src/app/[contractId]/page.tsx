"use client";

import { Button, notification, ConfigProvider } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, Provider, Serializer, SignerInterface, utils } from "koilib";
import theme from "../theme";
import styles from "../page.module.css";
import { KoinosForm, prettyName } from "../../components/KoinosForm";
import { HeaderComponent } from "@/components/HeaderComponent";
import { FooterComponent } from "@/components/FooterComponent";
import {
  BLOCK_EXPLORER,
  NICKNAMES_CONTRACT_ID,
  RPC_NODE,
} from "@/koinos/constants";
import { ContractInfo } from "@/components/ContractInfo";

export default function ContractPage({
  params,
}: {
  params: { contractId: string };
}) {
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
      const provider = new Provider([RPC_NODE]);
      const nicknames = new Contract({
        id: NICKNAMES_CONTRACT_ID,
        provider,
        abi: utils.nicknamesAbi,
      });

      let contractId = "";
      let nickname = "";
      if (params.contractId.startsWith("1")) {
        contractId = params.contractId;
        const { result } = await nicknames.functions.get_main_token({
          value: contractId,
        });
        if (result) {
          nickname = new TextDecoder().decode(
            utils.toUint8Array(result.token_id.slice(2)),
          );
        }
      } else {
        nickname = params.contractId;
        // resolve nickname
        const { result } = await nicknames.functions.get_address({
          value: params.contractId.replace("@", ""),
        });
        if (result) contractId = result.value;
      }

      let image =
        "https://upload.wikimedia.org/wikipedia/commons/b/bc/Unknown_person.jpg";
      let description = "";
      if (nickname) {
        const { result } = await nicknames.functions.metadata_of({
          token_id: `0x${utils.toHexString(new TextEncoder().encode(nickname))}`,
        });
        if (result && result.value) {
          const metadata = JSON.parse(result.value);
          image = metadata.image;
          description = metadata.bio;
        }
      }

      const c = new Contract({
        id: contractId,
        provider: new Provider([RPC_NODE]),
      });
      const abi = await c.fetchAbi({
        updateFunctions: false,
        updateSerializer: false,
      });
      if (!abi || !abi.methods)
        throw new Error(`no abi found for ${contractId}`);
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
    })();
  }, []);

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

        notification.success({
          message: "Transaction submitted",
          description: "the transaction is in the mempool waiting to be mined",
          placement: "bottomLeft",
          duration: 15,
        });
        setResults(`receipt:\n\n${JSON.stringify(receipt, null, 2)}`);

        await transaction!.wait();

        notification.success({
          message: "Transaction mined",
          description: (
            <span>
              see confirmation in{" "}
              <a
                target="_blank"
                href={`${BLOCK_EXPLORER}/tx/${transaction!.id!}`}
              >
                {" "}
                koinosblocks{" "}
              </a>{" "}
            </span>
          ),
          placement: "bottomLeft",
          duration: 15,
        });
      }
      setLoading(false);
    } catch (error) {
      notification.error({
        message: (error as Error).message,
        placement: "bottomLeft",
        duration: 15,
      });
      setLoading(false);
    }
  }, [args, signer, contract, selectedMethod]);

  return (
    <ConfigProvider theme={theme}>
      <main className={styles.main}>
        <HeaderComponent onChange={(s) => setSigner(s)}></HeaderComponent>
        <ContractInfo {...info}></ContractInfo>
        <div className={styles.w100}>
          {contractMethods
            ? contractMethods.map((contractMethod) => (
                <Button
                  key={contractMethod.name}
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
            <Button type="primary" onClick={submit} loading={loading}>
              {submitText}
            </Button>
            {code ? <div className={styles.code}>{code}</div> : null}
            {results ? <div className={styles.code}>{results}</div> : null}
          </div>
        ) : null}
        <FooterComponent></FooterComponent>
      </main>
    </ConfigProvider>
  );
}
