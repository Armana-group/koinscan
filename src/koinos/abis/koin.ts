import { utils } from "koilib";

const abi = JSON.parse(JSON.stringify(utils.tokenAbi));

abi.methods["get_account_rc"] = {
  argument: "token.balance_of_args",
  return: "token.uint64",
  description: "Get mana (resource credits) of an account",
  read_only: true,
  entry_point: 0x2d464aab,
  default_output: { value: "0" },
}

export const abiKoin = abi;