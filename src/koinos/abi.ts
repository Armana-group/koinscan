const tokenAbi = {
  methods: {
    name: {
      entry_point: 0x82a3537f,
      argument: "name_arguments",
      return: "name_result",
      read_only: true,
    },
    symbol: {
      entry_point: 0xb76a7ca1,
      argument: "symbol_arguments",
      return: "symbol_result",
      read_only: true,
    },
    decimals: {
      entry_point: 0xee80fd2f,
      argument: "decimals_arguments",
      return: "decimals_result",
      read_only: true,
    },
    totalSupply: {
      entry_point: 0xb0da3934,
      argument: "total_supply_arguments",
      return: "total_supply_result",
      read_only: true,
    },
    balanceOf: {
      entry_point: 0x5c721497,
      argument: "balance_of_arguments",
      return: "balance_of_result",
      read_only: true,
      default_output: { value: "0" },
    },
    transfer: {
      entry_point: 0x27f576ca,
      argument: "transfer_arguments",
      return: "transfer_result",
    },
    mint: {
      entry_point: 0xdc6f17bb,
      argument: "mint_arguments",
      return: "mint_result",
    },
    burn: {
      entry_point: 0x859facc5,
      argument: "burn_arguments",
      return: "burn_result",
    },
  },
  koilib_types: {
    nested: {
      koinos: {
        nested: {
          contracts: {
            nested: {
              token: {
                options: {
                  go_package:
                    "github.com/koinos/koinos-proto-golang/v2/koinos/contracts/token",
                },
                nested: {
                  name_arguments: {
                    fields: {},
                  },
                  name_result: {
                    fields: {
                      value: {
                        type: "string",
                        id: 1,
                      },
                    },
                  },
                  symbol_arguments: {
                    fields: {},
                  },
                  symbol_result: {
                    fields: {
                      value: {
                        type: "string",
                        id: 1,
                      },
                    },
                  },
                  decimals_arguments: {
                    fields: {},
                  },
                  decimals_result: {
                    fields: {
                      value: {
                        type: "uint32",
                        id: 1,
                      },
                    },
                  },
                  total_supply_arguments: {
                    fields: {},
                  },
                  total_supply_result: {
                    fields: {
                      value: {
                        type: "uint64",
                        id: 1,
                        options: {
                          jstype: "JS_STRING",
                        },
                      },
                    },
                  },
                  balance_of_arguments: {
                    fields: {
                      owner: {
                        type: "bytes",
                        id: 1,
                        options: {
                          "(btype)": "ADDRESS",
                        },
                      },
                    },
                  },
                  balance_of_result: {
                    fields: {
                      value: {
                        type: "uint64",
                        id: 1,
                        options: {
                          jstype: "JS_STRING",
                        },
                      },
                    },
                  },
                  transfer_arguments: {
                    fields: {
                      from: {
                        type: "bytes",
                        id: 1,
                        options: {
                          "(btype)": "ADDRESS",
                        },
                      },
                      to: {
                        type: "bytes",
                        id: 2,
                        options: {
                          "(btype)": "ADDRESS",
                        },
                      },
                      value: {
                        type: "uint64",
                        id: 3,
                        options: {
                          jstype: "JS_STRING",
                        },
                      },
                      memo: {
                        type: "string",
                        id: 4,
                      },
                    },
                  },
                  transfer_result: {
                    fields: {},
                  },
                  mint_arguments: {
                    fields: {
                      to: {
                        type: "bytes",
                        id: 1,
                        options: {
                          "(btype)": "ADDRESS",
                        },
                      },
                      value: {
                        type: "uint64",
                        id: 2,
                        options: {
                          jstype: "JS_STRING",
                        },
                      },
                    },
                  },
                  mint_result: {
                    fields: {},
                  },
                  burn_arguments: {
                    fields: {
                      from: {
                        type: "bytes",
                        id: 1,
                        options: {
                          "(btype)": "ADDRESS",
                        },
                      },
                      value: {
                        type: "uint64",
                        id: 2,
                        options: {
                          jstype: "JS_STRING",
                        },
                      },
                    },
                  },
                  burn_result: {
                    fields: {},
                  },
                  balance_object: {
                    fields: {
                      value: {
                        type: "uint64",
                        id: 1,
                        options: {
                          jstype: "JS_STRING",
                        },
                      },
                    },
                  },
                  burn_event: {
                    fields: {
                      from: {
                        type: "bytes",
                        id: 1,
                        options: {
                          "(btype)": "ADDRESS",
                        },
                      },
                      value: {
                        type: "uint64",
                        id: 2,
                        options: {
                          jstype: "JS_STRING",
                        },
                      },
                    },
                  },
                  mint_event: {
                    fields: {
                      to: {
                        type: "bytes",
                        id: 1,
                        options: {
                          "(btype)": "ADDRESS",
                        },
                      },
                      value: {
                        type: "uint64",
                        id: 2,
                        options: {
                          jstype: "JS_STRING",
                        },
                      },
                    },
                  },
                  transfer_event: {
                    fields: {
                      from: {
                        type: "bytes",
                        id: 1,
                        options: {
                          "(btype)": "ADDRESS",
                        },
                      },
                      to: {
                        type: "bytes",
                        id: 2,
                        options: {
                          "(btype)": "ADDRESS",
                        },
                      },
                      value: {
                        type: "uint64",
                        id: 3,
                        options: {
                          jstype: "JS_STRING",
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
  },
};

export default tokenAbi;
