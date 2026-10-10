import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { abiGovernance } from "./abis";
import { buildSerializer } from "./serializer";

// Tests run from the repo root.
const governanceTypes = readFileSync("src/koinos/__fixtures__/governance-types.txt", "utf8").trim();

test("the embedded Governance ABI, whose JSON shadows Google's descriptor types, builds and reads addresses", async () => {
  const serializer = buildSerializer(abiGovernance);
  assert.ok(serializer, "serializer built");
  const type = serializer.root.lookupType("koinos.contracts.governance.submit_proposal_arguments");
  assert.ok(Object.keys(type.fields).length > 0);

  // An ADDRESS field round-trips as base58, which only works when the koinos.btype option survived.
  const event = { sequence: 1, source: "1A5BmMqV5jN5zBrdkhQumAfDZBzXLPBeN9", name: "x", data: "", impacted: ["1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk"] };
  const encoded = await serializer.serialize(event, "koinos.protocol.event_data");
  const decoded = await serializer.deserialize(encoded, "koinos.protocol.event_data");
  assert.equal(decoded.source, event.source);
  assert.deepEqual(decoded.impacted, event.impacted);
});

test("a binary descriptor set that carries descriptor.proto builds from the chain's own types", async () => {
  const serializer = buildSerializer({ types: governanceTypes });
  assert.ok(serializer, "serializer built");
  for (const name of ["submit_proposal_arguments", "get_proposal_by_id_arguments", "get_proposals_by_status_arguments", "get_proposals_arguments"]) {
    assert.ok(serializer.root.lookupType(`koinos.contracts.governance.${name}`), name);
  }
  const event = { sequence: 1, source: "1A5BmMqV5jN5zBrdkhQumAfDZBzXLPBeN9", name: "x", data: "", impacted: ["1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk"] };
  const decoded = await serializer.deserialize(await serializer.serialize(event, "koinos.protocol.event_data"), "koinos.protocol.event_data");
  assert.equal(decoded.source, event.source);
  assert.deepEqual(decoded.impacted, event.impacted);
});

test("ordinary JSON types still build, and an ABI without types gives null", () => {
  const serializer = buildSerializer({
    koilib_types: { nested: { demo: { nested: { args: { fields: { owner: { type: "bytes", id: 1, options: { "(koinos.btype)": "ADDRESS" } } } } } } } },
  });
  assert.ok(serializer);
  assert.ok(serializer.root.lookupType("demo.args"));
  assert.equal(buildSerializer({}), null);
  assert.equal(buildSerializer({ types: "" }), null);
});

test("unreadable types give null instead of throwing", () => {
  const warn = console.warn;
  console.warn = () => undefined;
  try {
    assert.equal(buildSerializer({ types: "bm90IGEgZGVzY3JpcHRvcg==" }), null);
  } finally {
    console.warn = warn;
  }
});
