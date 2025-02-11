"use client";

import { Button, notification, ConfigProvider } from "antd";
import { useCallback, useState } from "react";
import { SignerInterface, TransactionReceipt } from "koilib";
import theme from "./theme";
import styles from "./page.module.css";
import { KoinosForm, prettyName } from "../components/KoinosForm";
import { ProjectDescription } from "@/components/ProjectDescription";
import { HeaderComponent } from "@/components/HeaderComponent";
import { FooterComponent } from "@/components/FooterComponent";
import { contract, readContract, writeContract } from "@/koinos/contract";
import { BLOCK_EXPLORER } from "@/koinos/constants";

export default function Home() {
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [submitText, setSubmitText] = useState<string>("");
  const [args, setArgs] = useState<unknown>({});
  const [signer, setSigner] = useState<SignerInterface | undefined>(undefined);
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<string>("");

  const submit = useCallback(async () => {
    try {
      setLoading(true);
      setResults("");
      let textArgs = JSON.stringify(args, null, 2);
      const { read_only: readOnly } = contract.abi!.methods[selectedMethod];

      if (readOnly) {
        if (textArgs === "{}") textArgs = "";
        setCode(
          `const { result } = await contract.functions.${selectedMethod}(${textArgs});`,
        );
        const res = await readContract(selectedMethod, args);
        setResults(`result:\n\n${JSON.stringify(res, null, 2)}`);
      } else {
        if (!signer) throw new Error("Connect wallet");
        setCode(`const { transaction, receipt } = await contract.functions.${selectedMethod}(${textArgs},{
  rcLimit: 10_00000000, // 10 mana
});`);

        const onTxSubmit = (receipt?: TransactionReceipt) => {
          notification.success({
            message: "Transaction submitted",
            description:
              "the transaction is in the mempool waiting to be mined",
            placement: "bottomLeft",
            duration: 15,
          });
          setResults(`receipt:\n\n${JSON.stringify(receipt, null, 2)}`);
        };
        const { transaction } = await writeContract(
          selectedMethod,
          args,
          signer,
          onTxSubmit,
        );

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

  const contractMethods = Object.keys(contract.abi!.methods).map((name) => {
    return {
      name,
      prettyName: prettyName(name),
      readOnly: contract.abi!.methods[name].read_only,
    };
  });

  return (
    <ConfigProvider theme={theme}>
      <main className={styles.main}>
        <HeaderComponent onChange={(s) => setSigner(s)}></HeaderComponent>
        <ProjectDescription></ProjectDescription>
        <div className={styles.w100}>
          <h3>Select Function</h3>
          {contractMethods.map((contractMethod) => (
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
          ))}
        </div>
        {selectedMethod ? (
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
