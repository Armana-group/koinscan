import { Abi } from "koilib";

export const abiGovernance: Abi = {
  methods: {
    submit_proposal: {
      argument: "koinos.contracts.governance.submit_proposal_arguments",
      return: "koinos.contracts.governance.submit_proposal_result",
      description: "Submits a proposal",
      entry_point: 0xe74b785c,
      read_only: false,
    },
    get_proposal_by_id: {
      argument: "koinos.contracts.governance.get_proposal_by_id_arguments",
      return: "koinos.contracts.governance.get_proposal_by_id_result",
      description: "Retrieves proposals by ID",
      entry_point: 0xc66013ad,
      read_only: true,
    },
    get_proposals_by_status: {
      argument: "koinos.contracts.governance.get_proposals_by_status_arguments",
      return: "koinos.contracts.governance.get_proposals_by_status_result",
      description: "Retrieves proposals by status",
      entry_point: 0x66206f76,
      read_only: true,
    },
    get_proposals: {
      argument: "koinos.contracts.governance.get_proposals_arguments",
      return: "koinos.contracts.governance.get_proposals_result",
      description: "Retrieves proposals",
      entry_point: 0xd44caa11,
      read_only: true,
    },
    pre_block_callback: {
      argument: "koinos.chain.pre_block_callback_arguments",
      return: "koinos.chain.pre_block_callback_result",
      description: "An implement of pre_block, not to be called directly",
      entry_point: 0x531d5d4e,
      read_only: false,
    },
  },
  koilib_types: {
    options: {
      syntax: "proto3",
    },
    nested: {
      google: {
        nested: {
          protobuf: {
            nested: {
              FileDescriptorSet: {
                fields: {
                  file: {
                    rule: "repeated",
                    type: ".google.protobuf.FileDescriptorProto",
                    id: 1,
                  },
                },
              },
              FileDescriptorProto: {
                fields: {
                  name: {
                    type: "string",
                    id: 1,
                  },
                  package: {
                    type: "string",
                    id: 2,
                  },
                  dependency: {
                    rule: "repeated",
                    type: "string",
                    id: 3,
                  },
                  public_dependency: {
                    rule: "repeated",
                    type: "int32",
                    id: 10,
                  },
                  weak_dependency: {
                    rule: "repeated",
                    type: "int32",
                    id: 11,
                  },
                  message_type: {
                    rule: "repeated",
                    type: ".google.protobuf.DescriptorProto",
                    id: 4,
                  },
                  enum_type: {
                    rule: "repeated",
                    type: ".google.protobuf.EnumDescriptorProto",
                    id: 5,
                  },
                  service: {
                    rule: "repeated",
                    type: ".google.protobuf.ServiceDescriptorProto",
                    id: 6,
                  },
                  extension: {
                    rule: "repeated",
                    type: ".google.protobuf.FieldDescriptorProto",
                    id: 7,
                  },
                  options: {
                    type: ".google.protobuf.FileOptions",
                    id: 8,
                  },
                  source_code_info: {
                    type: ".google.protobuf.SourceCodeInfo",
                    id: 9,
                  },
                  syntax: {
                    type: "string",
                    id: 12,
                  },
                },
              },
              DescriptorProto: {
                fields: {
                  name: {
                    type: "string",
                    id: 1,
                  },
                  field: {
                    rule: "repeated",
                    type: ".google.protobuf.FieldDescriptorProto",
                    id: 2,
                  },
                  extension: {
                    rule: "repeated",
                    type: ".google.protobuf.FieldDescriptorProto",
                    id: 6,
                  },
                  nested_type: {
                    rule: "repeated",
                    type: ".google.protobuf.DescriptorProto",
                    id: 3,
                  },
                  enum_type: {
                    rule: "repeated",
                    type: ".google.protobuf.EnumDescriptorProto",
                    id: 4,
                  },
                  extension_range: {
                    rule: "repeated",
                    type: ".google.protobuf.DescriptorProto.ExtensionRange",
                    id: 5,
                  },
                  oneof_decl: {
                    rule: "repeated",
                    type: ".google.protobuf.OneofDescriptorProto",
                    id: 8,
                  },
                  options: {
                    type: ".google.protobuf.MessageOptions",
                    id: 7,
                  },
                  reserved_range: {
                    rule: "repeated",
                    type: ".google.protobuf.DescriptorProto.ReservedRange",
                    id: 9,
                  },
                  reserved_name: {
                    rule: "repeated",
                    type: "string",
                    id: 10,
                  },
                },
                nested: {
                  ExtensionRange: {
                    fields: {
                      start: {
                        type: "int32",
                        id: 1,
                      },
                      end: {
                        type: "int32",
                        id: 2,
                      },
                      options: {
                        type: ".google.protobuf.ExtensionRangeOptions",
                        id: 3,
                      },
                    },
                  },
                  ReservedRange: {
                    fields: {
                      start: {
                        type: "int32",
                        id: 1,
                      },
                      end: {
                        type: "int32",
                        id: 2,
                      },
                    },
                  },
                },
              },
              ExtensionRangeOptions: {
                fields: {
                  uninterpreted_option: {
                    rule: "repeated",
                    type: ".google.protobuf.UninterpretedOption",
                    id: 999,
                  },
                },
              },
              FieldDescriptorProto: {
                fields: {
                  name: {
                    type: "string",
                    id: 1,
                  },
                  number: {
                    type: "int32",
                    id: 3,
                  },
                  label: {
                    type: ".google.protobuf.FieldDescriptorProto.Label",
                    id: 4,
                  },
                  type: {
                    type: ".google.protobuf.FieldDescriptorProto.Type",
                    id: 5,
                  },
                  type_name: {
                    type: "string",
                    id: 6,
                  },
                  extendee: {
                    type: "string",
                    id: 2,
                  },
                  default_value: {
                    type: "string",
                    id: 7,
                  },
                  oneof_index: {
                    type: "int32",
                    id: 9,
                  },
                  json_name: {
                    type: "string",
                    id: 10,
                  },
                  options: {
                    type: ".google.protobuf.FieldOptions",
                    id: 8,
                  },
                  proto3_optional: {
                    type: "bool",
                    id: 17,
                  },
                },
              },
              OneofDescriptorProto: {
                fields: {
                  name: {
                    type: "string",
                    id: 1,
                  },
                  options: {
                    type: ".google.protobuf.OneofOptions",
                    id: 2,
                  },
                },
              },
              EnumDescriptorProto: {
                fields: {
                  name: {
                    type: "string",
                    id: 1,
                  },
                  value: {
                    rule: "repeated",
                    type: ".google.protobuf.EnumValueDescriptorProto",
                    id: 2,
                  },
                  options: {
                    type: ".google.protobuf.EnumOptions",
                    id: 3,
                  },
                  reserved_range: {
                    rule: "repeated",
                    type: ".google.protobuf.EnumDescriptorProto.EnumReservedRange",
                    id: 4,
                  },
                  reserved_name: {
                    rule: "repeated",
                    type: "string",
                    id: 5,
                  },
                },
                nested: {
                  EnumReservedRange: {
                    fields: {
                      start: {
                        type: "int32",
                        id: 1,
                      },
                      end: {
                        type: "int32",
                        id: 2,
                      },
                    },
                  },
                },
              },
              EnumValueDescriptorProto: {
                fields: {
                  name: {
                    type: "string",
                    id: 1,
                  },
                  number: {
                    type: "int32",
                    id: 2,
                  },
                  options: {
                    type: ".google.protobuf.EnumValueOptions",
                    id: 3,
                  },
                },
              },
              ServiceDescriptorProto: {
                fields: {
                  name: {
                    type: "string",
                    id: 1,
                  },
                  method: {
                    rule: "repeated",
                    type: ".google.protobuf.MethodDescriptorProto",
                    id: 2,
                  },
                  options: {
                    type: ".google.protobuf.ServiceOptions",
                    id: 3,
                  },
                },
              },
              MethodDescriptorProto: {
                fields: {
                  name: {
                    type: "string",
                    id: 1,
                  },
                  input_type: {
                    type: "string",
                    id: 2,
                  },
                  output_type: {
                    type: "string",
                    id: 3,
                  },
                  options: {
                    type: ".google.protobuf.MethodOptions",
                    id: 4,
                  },
                  client_streaming: {
                    type: "bool",
                    id: 5,
                  },
                  server_streaming: {
                    type: "bool",
                    id: 6,
                  },
                },
              },
              FileOptions: {
                fields: {
                  java_package: {
                    type: "string",
                    id: 1,
                  },
                  java_outer_classname: {
                    type: "string",
                    id: 8,
                  },
                  java_multiple_files: {
                    type: "bool",
                    id: 10,
                  },
                  java_generate_equals_and_hash: {
                    type: "bool",
                    id: 20,
                  },
                  java_string_check_utf8: {
                    type: "bool",
                    id: 27,
                  },
                  optimize_for: {
                    type: ".google.protobuf.FileOptions.OptimizeMode",
                    id: 9,
                  },
                  go_package: {
                    type: "string",
                    id: 11,
                  },
                  cc_generic_services: {
                    type: "bool",
                    id: 16,
                  },
                  java_generic_services: {
                    type: "bool",
                    id: 17,
                  },
                  py_generic_services: {
                    type: "bool",
                    id: 18,
                  },
                  php_generic_services: {
                    type: "bool",
                    id: 42,
                  },
                  deprecated: {
                    type: "bool",
                    id: 23,
                  },
                  cc_enable_arenas: {
                    type: "bool",
                    id: 31,
                  },
                  objc_class_prefix: {
                    type: "string",
                    id: 36,
                  },
                  csharp_namespace: {
                    type: "string",
                    id: 37,
                  },
                  swift_prefix: {
                    type: "string",
                    id: 39,
                  },
                  php_class_prefix: {
                    type: "string",
                    id: 40,
                  },
                  php_namespace: {
                    type: "string",
                    id: 41,
                  },
                  php_metadata_namespace: {
                    type: "string",
                    id: 44,
                  },
                  ruby_package: {
                    type: "string",
                    id: 45,
                  },
                  uninterpreted_option: {
                    rule: "repeated",
                    type: ".google.protobuf.UninterpretedOption",
                    id: 999,
                  },
                },
              },
              MessageOptions: {
                fields: {
                  message_set_wire_format: {
                    type: "bool",
                    id: 1,
                  },
                  no_standard_descriptor_accessor: {
                    type: "bool",
                    id: 2,
                  },
                  deprecated: {
                    type: "bool",
                    id: 3,
                  },
                  map_entry: {
                    type: "bool",
                    id: 7,
                  },
                  uninterpreted_option: {
                    rule: "repeated",
                    type: ".google.protobuf.UninterpretedOption",
                    id: 999,
                  },
                },
              },
              FieldOptions: {
                fields: {
                  ctype: {
                    type: ".google.protobuf.FieldOptions.CType",
                    id: 1,
                  },
                  packed: {
                    type: "bool",
                    id: 2,
                  },
                  jstype: {
                    type: ".google.protobuf.FieldOptions.JSType",
                    id: 6,
                  },
                  lazy: {
                    type: "bool",
                    id: 5,
                  },
                  deprecated: {
                    type: "bool",
                    id: 3,
                  },
                  weak: {
                    type: "bool",
                    id: 10,
                  },
                  uninterpreted_option: {
                    rule: "repeated",
                    type: ".google.protobuf.UninterpretedOption",
                    id: 999,
                  },
                },
              },
              OneofOptions: {
                fields: {
                  uninterpreted_option: {
                    rule: "repeated",
                    type: ".google.protobuf.UninterpretedOption",
                    id: 999,
                  },
                },
              },
              EnumOptions: {
                fields: {
                  allow_alias: {
                    type: "bool",
                    id: 2,
                  },
                  deprecated: {
                    type: "bool",
                    id: 3,
                  },
                  uninterpreted_option: {
                    rule: "repeated",
                    type: ".google.protobuf.UninterpretedOption",
                    id: 999,
                  },
                },
              },
              EnumValueOptions: {
                fields: {
                  deprecated: {
                    type: "bool",
                    id: 1,
                  },
                  uninterpreted_option: {
                    rule: "repeated",
                    type: ".google.protobuf.UninterpretedOption",
                    id: 999,
                  },
                },
              },
              ServiceOptions: {
                fields: {
                  deprecated: {
                    type: "bool",
                    id: 33,
                  },
                  uninterpreted_option: {
                    rule: "repeated",
                    type: ".google.protobuf.UninterpretedOption",
                    id: 999,
                  },
                },
              },
              MethodOptions: {
                fields: {
                  deprecated: {
                    type: "bool",
                    id: 33,
                  },
                  idempotency_level: {
                    type: ".google.protobuf.MethodOptions.IdempotencyLevel",
                    id: 34,
                  },
                  uninterpreted_option: {
                    rule: "repeated",
                    type: ".google.protobuf.UninterpretedOption",
                    id: 999,
                  },
                },
              },
              UninterpretedOption: {
                fields: {
                  name: {
                    rule: "repeated",
                    type: ".google.protobuf.UninterpretedOption.NamePart",
                    id: 2,
                  },
                  identifier_value: {
                    type: "string",
                    id: 3,
                  },
                  positive_int_value: {
                    type: "uint64",
                    id: 4,
                  },
                  negative_int_value: {
                    type: "int64",
                    id: 5,
                  },
                  double_value: {
                    type: "double",
                    id: 6,
                  },
                  string_value: {
                    type: "bytes",
                    id: 7,
                  },
                  aggregate_value: {
                    type: "string",
                    id: 8,
                  },
                },
                nested: {
                  NamePart: {
                    fields: {
                      name_part: {
                        rule: "required",
                        type: "string",
                        id: 1,
                      },
                      is_extension: {
                        rule: "required",
                        type: "bool",
                        id: 2,
                      },
                    },
                  },
                },
              },
              SourceCodeInfo: {
                fields: {
                  location: {
                    rule: "repeated",
                    type: ".google.protobuf.SourceCodeInfo.Location",
                    id: 1,
                  },
                },
                nested: {
                  Location: {
                    fields: {
                      path: {
                        rule: "repeated",
                        type: "int32",
                        id: 1,
                      },
                      span: {
                        rule: "repeated",
                        type: "int32",
                        id: 2,
                      },
                      leading_comments: {
                        type: "string",
                        id: 3,
                      },
                      trailing_comments: {
                        type: "string",
                        id: 4,
                      },
                      leading_detached_comments: {
                        rule: "repeated",
                        type: "string",
                        id: 6,
                      },
                    },
                  },
                },
              },
              GeneratedCodeInfo: {
                fields: {
                  annotation: {
                    rule: "repeated",
                    type: ".google.protobuf.GeneratedCodeInfo.Annotation",
                    id: 1,
                  },
                },
                nested: {
                  Annotation: {
                    fields: {
                      path: {
                        rule: "repeated",
                        type: "int32",
                        id: 1,
                      },
                      source_file: {
                        type: "string",
                        id: 2,
                      },
                      begin: {
                        type: "int32",
                        id: 3,
                      },
                      end: {
                        type: "int32",
                        id: 4,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      koinos: {
        nested: {
          bytes_type: {
            values: {
              BASE64: 0,
              BASE58: 1,
              HEX: 2,
              BLOCK_ID: 3,
              TRANSACTION_ID: 4,
              CONTRACT_ID: 5,
              ADDRESS: 6,
            },
          },
          _btype: {
            oneof: ["btype"],
          },
          btype: {
            type: ".koinos.bytes_type",
            id: 50000,
            extend: ".google.protobuf.FieldOptions",
            options: {
              proto3_optional: true,
            },
          },
          protocol: {
            nested: {
              event_data: {
                fields: {
                  sequence: {
                    type: "uint32",
                    id: 1,
                  },
                  source: {
                    type: "bytes",
                    id: 2,
                    options: {
                      "(koinos.btype)": "CONTRACT_ID",
                    },
                  },
                  name: {
                    type: "string",
                    id: 3,
                  },
                  data: {
                    type: "bytes",
                    id: 4,
                  },
                  impacted: {
                    rule: "repeated",
                    type: "bytes",
                    id: 5,
                    options: {
                      "(koinos.btype)": "ADDRESS",
                    },
                  },
                },
              },
              contract_call_bundle: {
                fields: {
                  contract_id: {
                    type: "bytes",
                    id: 1,
                    options: {
                      "(koinos.btype)": "CONTRACT_ID",
                    },
                  },
                  entry_point: {
                    type: "uint32",
                    id: 2,
                  },
                },
              },
              system_call_target: {
                oneofs: {
                  target: {
                    oneof: ["thunk_id", "system_call_bundle"],
                  },
                },
                fields: {
                  thunk_id: {
                    type: "uint32",
                    id: 1,
                  },
                  system_call_bundle: {
                    type: ".koinos.protocol.contract_call_bundle",
                    id: 2,
                  },
                },
              },
              upload_contract_operation: {
                fields: {
                  contract_id: {
                    type: "bytes",
                    id: 1,
                    options: {
                      "(koinos.btype)": "CONTRACT_ID",
                    },
                  },
                  bytecode: {
                    type: "bytes",
                    id: 2,
                  },
                  abi: {
                    type: "string",
                    id: 3,
                  },
                  authorizes_call_contract: {
                    type: "bool",
                    id: 4,
                  },
                  authorizes_transaction_application: {
                    type: "bool",
                    id: 5,
                  },
                  authorizes_upload_contract: {
                    type: "bool",
                    id: 6,
                  },
                },
              },
              call_contract_operation: {
                fields: {
                  contract_id: {
                    type: "bytes",
                    id: 1,
                    options: {
                      "(koinos.btype)": "CONTRACT_ID",
                    },
                  },
                  entry_point: {
                    type: "uint32",
                    id: 2,
                  },
                  args: {
                    type: "bytes",
                    id: 3,
                  },
                },
              },
              set_system_call_operation: {
                fields: {
                  call_id: {
                    type: "uint32",
                    id: 1,
                  },
                  target: {
                    type: ".koinos.protocol.system_call_target",
                    id: 2,
                  },
                },
              },
              set_system_contract_operation: {
                fields: {
                  contract_id: {
                    type: "bytes",
                    id: 1,
                    options: {
                      "(koinos.btype)": "CONTRACT_ID",
                    },
                  },
                  system_contract: {
                    type: "bool",
                    id: 2,
                  },
                },
              },
              operation: {
                oneofs: {
                  op: {
                    oneof: [
                      "upload_contract",
                      "call_contract",
                      "set_system_call",
                      "set_system_contract",
                    ],
                  },
                },
                fields: {
                  upload_contract: {
                    type: ".koinos.protocol.upload_contract_operation",
                    id: 1,
                  },
                  call_contract: {
                    type: ".koinos.protocol.call_contract_operation",
                    id: 2,
                  },
                  set_system_call: {
                    type: ".koinos.protocol.set_system_call_operation",
                    id: 3,
                  },
                  set_system_contract: {
                    type: ".koinos.protocol.set_system_contract_operation",
                    id: 4,
                  },
                },
              },
              transaction_header: {
                fields: {
                  chain_id: {
                    type: "bytes",
                    id: 1,
                  },
                  rc_limit: {
                    type: "uint64",
                    id: 2,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  nonce: {
                    type: "bytes",
                    id: 3,
                  },
                  operation_merkle_root: {
                    type: "bytes",
                    id: 4,
                  },
                  payer: {
                    type: "bytes",
                    id: 5,
                    options: {
                      "(koinos.btype)": "ADDRESS",
                    },
                  },
                  payee: {
                    type: "bytes",
                    id: 6,
                    options: {
                      "(koinos.btype)": "ADDRESS",
                    },
                  },
                },
              },
              transaction: {
                fields: {
                  id: {
                    type: "bytes",
                    id: 1,
                    options: {
                      "(koinos.btype)": "TRANSACTION_ID",
                    },
                  },
                  header: {
                    type: ".koinos.protocol.transaction_header",
                    id: 2,
                  },
                  operations: {
                    rule: "repeated",
                    type: ".koinos.protocol.operation",
                    id: 3,
                  },
                  signatures: {
                    rule: "repeated",
                    type: "bytes",
                    id: 4,
                  },
                },
              },
              transaction_receipt: {
                fields: {
                  id: {
                    type: "bytes",
                    id: 1,
                    options: {
                      "(koinos.btype)": "TRANSACTION_ID",
                    },
                  },
                  payer: {
                    type: "bytes",
                    id: 2,
                    options: {
                      "(koinos.btype)": "ADDRESS",
                    },
                  },
                  max_payer_rc: {
                    type: "uint64",
                    id: 3,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  rc_limit: {
                    type: "uint64",
                    id: 4,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  rc_used: {
                    type: "uint64",
                    id: 5,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  disk_storage_used: {
                    type: "uint64",
                    id: 6,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  network_bandwidth_used: {
                    type: "uint64",
                    id: 7,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  compute_bandwidth_used: {
                    type: "uint64",
                    id: 8,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  reverted: {
                    type: "bool",
                    id: 9,
                  },
                  events: {
                    rule: "repeated",
                    type: ".koinos.protocol.event_data",
                    id: 10,
                  },
                  logs: {
                    rule: "repeated",
                    type: "string",
                    id: 11,
                  },
                },
              },
              block_header: {
                fields: {
                  previous: {
                    type: "bytes",
                    id: 1,
                    options: {
                      "(koinos.btype)": "BLOCK_ID",
                    },
                  },
                  height: {
                    type: "uint64",
                    id: 2,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  timestamp: {
                    type: "uint64",
                    id: 3,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  previous_state_merkle_root: {
                    type: "bytes",
                    id: 4,
                  },
                  transaction_merkle_root: {
                    type: "bytes",
                    id: 5,
                  },
                  signer: {
                    type: "bytes",
                    id: 6,
                    options: {
                      "(koinos.btype)": "ADDRESS",
                    },
                  },
                  approved_proposals: {
                    rule: "repeated",
                    type: "bytes",
                    id: 7,
                    options: {
                      "(koinos.btype)": "TRANSACTION_ID",
                    },
                  },
                },
              },
              block: {
                fields: {
                  id: {
                    type: "bytes",
                    id: 1,
                    options: {
                      "(koinos.btype)": "BLOCK_ID",
                    },
                  },
                  header: {
                    type: ".koinos.protocol.block_header",
                    id: 2,
                  },
                  transactions: {
                    rule: "repeated",
                    type: ".koinos.protocol.transaction",
                    id: 3,
                  },
                  signature: {
                    type: "bytes",
                    id: 4,
                  },
                },
              },
              block_receipt: {
                fields: {
                  id: {
                    type: "bytes",
                    id: 1,
                    options: {
                      "(koinos.btype)": "BLOCK_ID",
                    },
                  },
                  height: {
                    type: "uint64",
                    id: 2,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  disk_storage_used: {
                    type: "uint64",
                    id: 3,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  network_bandwidth_used: {
                    type: "uint64",
                    id: 4,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  compute_bandwidth_used: {
                    type: "uint64",
                    id: 5,
                    options: {
                      jstype: "JS_STRING",
                    },
                  },
                  state_merkle_root: {
                    type: "bytes",
                    id: 6,
                  },
                  events: {
                    rule: "repeated",
                    type: ".koinos.protocol.event_data",
                    id: 7,
                  },
                  transaction_receipts: {
                    rule: "repeated",
                    type: ".koinos.protocol.transaction_receipt",
                    id: 8,
                  },
                  logs: {
                    rule: "repeated",
                    type: "string",
                    id: 9,
                  },
                },
              },
            },
          },
          contracts: {
            nested: {
              governance: {
                nested: {
                  proposal_status: {
                    values: {
                      pending: 0,
                      active: 1,
                      approved: 2,
                      expired: 3,
                      applied: 4,
                      failed: 5,
                      reverted: 6,
                    },
                  },
                  proposal_record: {
                    fields: {
                      operations: {
                        rule: "repeated",
                        type: ".koinos.protocol.operation",
                        id: 1,
                      },
                      operation_merkle_root: {
                        type: "bytes",
                        id: 2,
                      },
                      vote_start_height: {
                        type: "uint64",
                        id: 3,
                      },
                      vote_tally: {
                        type: "uint64",
                        id: 4,
                      },
                      vote_threshold: {
                        type: "uint64",
                        id: 5,
                      },
                      shall_authorize: {
                        type: "bool",
                        id: 6,
                      },
                      updates_governance: {
                        type: "bool",
                        id: 7,
                      },
                      status: {
                        type: ".koinos.contracts.governance.proposal_status",
                        id: 8,
                      },
                      fee: {
                        type: "uint64",
                        id: 9,
                      },
                    },
                  },
                  submit_proposal_arguments: {
                    fields: {
                      operations: {
                        rule: "repeated",
                        type: ".koinos.protocol.operation",
                        id: 1,
                      },
                      operation_merkle_root: {
                        type: "bytes",
                        id: 2,
                      },
                      fee: {
                        type: "uint64",
                        id: 3,
                      },
                    },
                  },
                  submit_proposal_result: {
                    fields: {},
                  },
                  get_proposal_by_id_arguments: {
                    fields: {
                      proposal_id: {
                        type: "bytes",
                        id: 1,
                        options: {
                          "(koinos.btype)": "TRANSACTION_ID",
                        },
                      },
                    },
                  },
                  get_proposal_by_id_result: {
                    fields: {
                      value: {
                        type: ".koinos.contracts.governance.proposal_record",
                        id: 1,
                      },
                    },
                  },
                  get_proposals_by_status_arguments: {
                    fields: {
                      start_proposal: {
                        type: "bytes",
                        id: 1,
                        options: {
                          "(koinos.btype)": "TRANSACTION_ID",
                        },
                      },
                      limit: {
                        type: "uint64",
                        id: 2,
                      },
                      status: {
                        type: ".koinos.contracts.governance.proposal_status",
                        id: 3,
                      },
                    },
                  },
                  get_proposals_by_status_result: {
                    fields: {
                      value: {
                        rule: "repeated",
                        type: ".koinos.contracts.governance.proposal_record",
                        id: 1,
                      },
                    },
                  },
                  get_proposals_arguments: {
                    fields: {
                      start_proposal: {
                        type: "bytes",
                        id: 1,
                        options: {
                          "(koinos.btype)": "TRANSACTION_ID",
                        },
                      },
                      limit: {
                        type: "uint64",
                        id: 2,
                      },
                    },
                  },
                  get_proposals_result: {
                    fields: {
                      value: {
                        rule: "repeated",
                        type: ".koinos.contracts.governance.proposal_record",
                        id: 1,
                      },
                    },
                  },
                  proposal_submission_event: {
                    fields: {
                      proposal: {
                        type: ".koinos.contracts.governance.proposal_record",
                        id: 1,
                      },
                    },
                  },
                  proposal_status_event: {
                    fields: {
                      id: {
                        type: "bytes",
                        id: 1,
                        options: {
                          "(koinos.btype)": "TRANSACTION_ID",
                        },
                      },
                      status: {
                        type: ".koinos.contracts.governance.proposal_status",
                        id: 2,
                      },
                    },
                  },
                  proposal_vote_event: {
                    fields: {
                      id: {
                        type: "bytes",
                        id: 1,
                        options: {
                          "(koinos.btype)": "TRANSACTION_ID",
                        },
                      },
                      vote_tally: {
                        type: "uint64",
                        id: 2,
                      },
                      vote_threshold: {
                        type: "uint64",
                        id: 3,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export default abiGovernance;
