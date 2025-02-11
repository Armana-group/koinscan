import {
  Contract,
  Provider,
  SignerInterface,
  TransactionReceipt,
} from "koilib";
import { CONTRACT_ID, RPC_NODE } from "./constants";
import abi from "./abi";

export const contract = new Contract({
  id: CONTRACT_ID,
  provider: new Provider([RPC_NODE]),
  abi,
});

export async function readContract(methodName: string, args: unknown) {
  const { result } = await contract.functions[methodName](args);
  return result;
}

export async function writeContract(
  methodName: string,
  args: unknown,
  signer: SignerInterface,
  onTxSubmit?: (receipt?: TransactionReceipt) => void,
) {
  contract.signer = signer;
  const { transaction, receipt } = await contract.functions[methodName](args, {
    rcLimit: 10_00000000,
  });
  if (onTxSubmit) onTxSubmit(receipt);
  const { blockNumber } = await transaction!.wait();
  return { transaction, receipt, blockNumber };
}
