"use client";

import { Button, notification, ConfigProvider } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, Provider, SignerInterface } from "koilib";
import theme from "../theme";
import styles from "../page.module.css";
import { KoinosForm, prettyName } from "../../components/KoinosForm";
import { HeaderComponent } from "@/components/HeaderComponent";
import { FooterComponent } from "@/components/FooterComponent";
import { BLOCK_EXPLORER, RPC_NODE } from "@/koinos/constants";

export default function ContractPage({ params }: { params: { contractId: string } }) {
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [submitText, setSubmitText] = useState<string>("");
  const [args, setArgs] = useState<unknown>({});
  const [signer, setSigner] = useState<SignerInterface | undefined>(undefined);
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<string>("");
  const [contract, setContract] = useState<Contract | null>(null);

  useEffect(() => {
    const c = new Contract({
      id: params.contractId,
      provider: new Provider([RPC_NODE]),
    });
    c.fetchAbi().then(() => setContract(c));
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
        const { transaction, receipt } = await contract.functions[selectedMethod](args, {
          rcLimit: 10_00000000,
        });

        notification.success({
          message: "Transaction submitted",
          description:
            "the transaction is in the mempool waiting to be mined",
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
        <div className={styles.w100}>
          <h3>Select Function</h3>
          {contractMethods ? contractMethods.map((contractMethod) => (
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
          )) : "loading..."}
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