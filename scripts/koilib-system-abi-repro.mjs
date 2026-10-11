// Reproduces koilib failing to build a serializer for the Governance system
// contract from its on-chain ABI, using koilib alone. Resources, Name Service
// and Claim are controls that build.
//
//   node scripts/koilib-system-abi-repro.mjs [rpc-url]
//
// Standalone: in an empty folder, `npm i koilib` and run it with node 18+.
// Exits 1 when any contract fails to build, 0 when all of them work.
import { createRequire } from "node:module";
import { Contract, Provider } from "koilib";

const RPC = process.argv[2] ?? "https://api.koinos.io";
const CONTRACTS = [
  ["Governance", "19qj51eTbSFJYU7ZagudkpxPgNSzPMfdPX"],
  // Controls: system contracts whose ABIs build fine.
  ["Resources", "1HGN9h47CzoFwU2bQZwe6BYoX4TM6pXc4b"],
  ["Name Service", "19WxDJ9Kcvx4VqQFkpwVmwVEy1hMuwXtQE"],
  ["Claim", "18zw3ZokdfHtudzaWAUnU4tUvKzKiJeN76"],
];

const { version } = createRequire(import.meta.url)("koilib/package.json");
console.log(`koilib ${version}, node ${process.version}, ${RPC}\n`);

const provider = new Provider([RPC]);
let failed = 0;
for (const [name, id] of CONTRACTS) {
  const contract = new Contract({ id, provider });
  let abi;
  try {
    // The defaults: fetch the ABI, then build functions and the serializer from it.
    abi = await contract.fetchAbi();
  } catch (error) {
    failed += 1;
    // fetchAbi has already stored the ABI when the serializer step throws.
    const shape = contract.abi ? describe(contract.abi) : "no ABI";
    console.log(`FAIL ${name} (${id})\n     ABI: ${shape}\n     ${error.message}\n`);
    continue;
  }
  if (!abi) {
    console.log(`SKIP ${name} (${id}): no ABI on chain\n`);
    continue;
  }
  // Build succeeded. Some system ABIs name argument types they never define
  // (Resources points at koinos.chain types); that is the ABI's gap, not koilib's.
  const defined = (type) => {
    try {
      contract.serializer.root.lookupType(type);
      return true;
    } catch {
      return false;
    }
  };
  const methods = Object.entries(abi.methods);
  const missing = methods.filter(([, spec]) => !defined(spec.argument)).map(([, spec]) => spec.argument);
  const [method, spec] = methods.find(([, s]) => defined(s.argument)) ?? [];
  const note = missing.length ? `\n     note: the ABI itself does not define ${missing.join(", ")}` : "";
  if (!spec) {
    console.log(`ok   ${name} (${id}) builds, but no method's arguments are defined${note}\n`);
    continue;
  }
  try {
    await contract.serializer.serialize({}, spec.argument);
    console.log(`ok   ${name} (${id})\n     ABI: ${describe(abi)}\n     ${method} arguments serialize${note}\n`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} (${id}) at serialize ${spec.argument}\n     ${error.message}\n`);
  }
}
process.exit(failed ? 1 : 0);

function describe(abi) {
  if (abi.koilib_types) return `koilib_types JSON (namespaces: ${Object.keys(abi.koilib_types.nested ?? {}).join(", ")})`;
  if (typeof abi.types === "string") return `binary descriptor set, ${abi.types.length} base64 chars`;
  return "no types";
}
