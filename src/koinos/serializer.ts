// Builds the koilib serializer for a contract's ABI. Two kinds of ABI trip up
// koilib's own constructor, and both come from the C++ system contracts:
//
// - JSON types that embed an incomplete copy of Google's descriptor.proto,
//   which then shadows the complete copy koilib ships (the Governance ABI).
// - Binary descriptor sets that include descriptor.proto itself, a proto2
//   file the text converter renders without labels, which protobufjs rejects.
//
// In both cases the Google types are only there because koinos/options.proto
// extends them, and koilib already has them. So the embedded copy is dropped
// and koilib's used instead.
import { Serializer, utils, type Abi } from "koilib";
import { Root, parse, type INamespace } from "protobufjs";
import { convert } from "@roamin/koinos-pb-to-proto";

type Nested = NonNullable<INamespace["nested"]>;

let googleTypes: Nested | undefined;

/** koilib seeds every JSON serializer with Google's descriptor types; borrow them from an empty one. */
function googleDescriptorTypes(): Nested {
  if (!googleTypes) googleTypes = (new Serializer({ nested: {} }).root.toJSON().nested ?? {}) as Nested;
  return googleTypes;
}

export function buildSerializer(abi: Pick<Abi, "koilib_types" | "types">): Serializer | null {
  try {
    if (abi.koilib_types) {
      const nested = { ...(abi.koilib_types.nested as Nested | undefined) };
      delete nested.google;
      return new Serializer({ ...abi.koilib_types, nested });
    }
    if (typeof abi.types === "string" && abi.types) {
      // The converter is typed for Buffer but reads any byte array, as koilib itself relies on.
      const protos = convert(utils.decodeBase64(abi.types) as unknown as Buffer).filter((proto) => !proto.file.startsWith("google/protobuf/"));
      const root = Root.fromJSON({ nested: googleDescriptorTypes() });
      for (const proto of protos) parse(proto.definition, root, { keepCase: true });
      return new Serializer(root.toJSON());
    }
    return null;
  } catch (error) {
    console.warn("[serializer] The contract's types could not be read:", error);
    return null;
  }
}
