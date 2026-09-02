import { Abi } from "koilib";

export const abiDexKoinVhp: Abi = {
  "methods": {
    "authorize": {
      "argument": "",
      "return": "authority.authorize_result",
      "description": "Authorize function",
      "entry_point": 1244511632,
      "read_only": false,
    },
    "set_order": {
      "argument": "dex.order",
      "return": "",
      "description": "Set buy or sell order",
      "entry_point": 1632324033,
      "read_only": false,
    },
    "cancel_order": {
      "argument": "dex.id",
      "return": "",
      "description": "Cancel order",
      "entry_point": 2218931612,
      "read_only": false,
    },
    "refresh_order": {
      "argument": "dex.id",
      "return": "",
      "description": "Refresh order whose VHP is in a pool",
      "entry_point": 1126349384,
      "read_only": false,
    },
    "fill_order": {
      "argument": "dex.fill_order_args",
      "return": "",
      "description": "Fill order",
      "entry_point": 3361851722,
      "read_only": false,
    },
    "get_orders": {
      "argument": "dex.get_orders_args",
      "return": "dex.orders",
      "description": "Get orders",
      "entry_point": 4149723748,
      "read_only": true,
    },
    "get_orders_by_owner": {
      "argument": "dex.get_orders_by_owner_args",
      "return": "dex.orders",
      "description": "Get orders",
      "entry_point": 1847169230,
      "read_only": true,
    }
  },
  "types": "Co8EChxrb2lub3MvY2hhaW4vYXV0aG9yaXR5LnByb3RvEgxrb2lub3MuY2hhaW4aFGtvaW5vcy9vcHRpb25zLnByb3RvIn8KCWNhbGxfZGF0YRIlCgtjb250cmFjdF9pZBgBIAEoDEIEgLUYBlIKY29udHJhY3RJZBIfCgtlbnRyeV9wb2ludBgCIAEoDVIKZW50cnlQb2ludBIWCgZjYWxsZXIYAyABKAxSBmNhbGxlchISCgRkYXRhGAQgASgMUgRkYXRhIoYBChNhdXRob3JpemVfYXJndW1lbnRzEjQKBHR5cGUYASABKA4yIC5rb2lub3MuY2hhaW4uYXV0aG9yaXphdGlvbl90eXBlUgR0eXBlEjAKBGNhbGwYAiABKAsyFy5rb2lub3MuY2hhaW4uY2FsbF9kYXRhSABSBGNhbGyIAQFCBwoFX2NhbGwiKAoQYXV0aG9yaXplX3Jlc3VsdBIUCgV2YWx1ZRgBIAEoCFIFdmFsdWUqWQoSYXV0aG9yaXphdGlvbl90eXBlEhEKDWNvbnRyYWN0X2NhbGwQABIbChd0cmFuc2FjdGlvbl9hcHBsaWNhdGlvbhABEhMKD2NvbnRyYWN0X3VwbG9hZBACQjRaMmdpdGh1Yi5jb20va29pbm9zL2tvaW5vcy1wcm90by1nb2xhbmcva29pbm9zL2NoYWluYgZwcm90bzMKpwUKCWRleC5wcm90bxIDZGV4GhRrb2lub3Mvb3B0aW9ucy5wcm90byKnAQoFb3JkZXISDgoCaWQYASABKAlSAmlkEhAKA2J1eRgCIAEoCFIDYnV5EhoKBW93bmVyGAMgASgMQgSAtRgGUgVvd25lchIYCgRwb29sGAQgASgMQgSAtRgGUgRwb29sEiMKC2tvaW5fYW1vdW50GAUgASgEQgIwAVIKa29pbkFtb3VudBIhCgp2aHBfYW1vdW50GAYgASgEQgIwAVIJdmhwQW1vdW50IiwKBm9yZGVycxIiCgZvcmRlcnMYASADKAsyCi5kZXgub3JkZXJSBm9yZGVycyIUCgJpZBIOCgJpZBgBIAEoCVICaWQiXQoPZmlsbF9vcmRlcl9hcmdzEg4KAmlkGAEgASgJUgJpZBIeCgdhY2NvdW50GAIgASgMQgSAtRgGUgdhY2NvdW50EhoKBmFtb3VudBgDIAEoBEICMAFSBmFtb3VudCKDAQoPZ2V0X29yZGVyc19hcmdzEhQKBXN0YXJ0GAEgASgJUgVzdGFydBIUCgVsaW1pdBgCIAEoBVIFbGltaXQSHgoKZGVzY2VuZGluZxgDIAEoCFIKZGVzY2VuZGluZxIQCgNidXkYBCABKAhSA2J1eRISCgR0aWVyGAUgASgFUgR0aWVyIoIBChhnZXRfb3JkZXJzX2J5X293bmVyX2FyZ3MSGgoFb3duZXIYASABKAxCBIC1GAZSBW93bmVyEhQKBXN0YXJ0GAIgASgJUgVzdGFydBIUCgVsaW1pdBgDIAEoBVIFbGltaXQSHgoKZGVzY2VuZGluZxgEIAEoCFIKZGVzY2VuZGluZyofCgpvcmRlcl90eXBlEgcKA2J1eRAAEggKBHNlbGwQAWIGcHJvdG8zCusOCgxmb2dhdGEucHJvdG8SBmZvZ2F0YRoUa29pbm9zL29wdGlvbnMucHJvdG8idAoKc3Rha2VfYXJncxIeCgdhY2NvdW50GAEgASgMQgSAtRgGUgdhY2NvdW50EiMKC2tvaW5fYW1vdW50GAIgASgEQgIwAVIKa29pbkFtb3VudBIhCgp2aHBfYW1vdW50GAMgASgEQgIwAVIJdmhwQW1vdW50IpoBCgx1bnN0YWtlX2FyZ3MSHgoHYWNjb3VudBgBIAEoDEIEgLUYBlIHYWNjb3VudBIjCgtrb2luX2Ftb3VudBgCIAEoBEICMAFSCmtvaW5BbW91bnQSIQoKdmhwX2Ftb3VudBgDIAEoBEICMAFSCXZocEFtb3VudBIiCglyZWNpcGllbnQYBCABKAxCBIC1GAZSCXJlY2lwaWVudCKPAQoLc3Rha2VfZXZlbnQSHgoHYWNjb3VudBgBIAEoDEIEgLUYBlIHYWNjb3VudBIjCgtrb2luX2Ftb3VudBgCIAEoBEICMAFSCmtvaW5BbW91bnQSIQoKdmhwX2Ftb3VudBgDIAEoBEICMAFSCXZocEFtb3VudBIYCgVzdGFrZRgEIAEoBEICMAFSBXN0YWtlIoQBCg5zbmFwc2hvdF9zdGFrZRIYCgVzdGFrZRgBIAEoBEICMAFSBXN0YWtlEi0KEGN1cnJlbnRfc25hcHNob3QYAiABKARCAjABUg9jdXJyZW50U25hcHNob3QSKQoOa29pbl93aXRoZHJhd24YAyABKARCAjABUg1rb2luV2l0aGRyYXduIlEKB2JhbGFuY2USIwoLa29pbl9hbW91bnQYASABKARCAjABUgprb2luQW1vdW50EiEKCnZocF9hbW91bnQYAiABKARCAjABUgl2aHBBbW91bnQiUwoMa29pbl9hY2NvdW50Eh4KB2FjY291bnQYASABKAxCBIC1GAZSB2FjY291bnQSIwoLa29pbl9hbW91bnQYAiABKARCAjABUgprb2luQW1vdW50IsgBChhjb2xsZWN0X2tvaW5fcHJlZmVyZW5jZXMSHgoHYWNjb3VudBgBIAEoDEIEgLUYBlIHYWNjb3VudBIrCg9wZXJjZW50YWdlX2tvaW4YAiABKARCAjABUg5wZXJjZW50YWdlS29pbhIuChFhbGxfYWZ0ZXJfdmlydHVhbBgDIAEoBEICMAFSD2FsbEFmdGVyVmlydHVhbBIvChRhbGxvd19kZXhfdG9fdW5zdGFrZRgEIAEoCFIRYWxsb3dEZXhUb1Vuc3Rha2UiaQoWc2V0X2FsbG93X3Vuc3Rha2VfYXJncxIeCgdhY2NvdW50GAEgASgMQgSAtRgGUgdhY2NvdW50Ei8KFGFsbG93X2RleF90b191bnN0YWtlGAIgASgIUhFhbGxvd0RleFRvVW5zdGFrZSJ8CglhbGxvd2FuY2USKgoEdHlwZRgBIAEoDjIWLmZvZ2F0YS5hbGxvd2FuY2VfdHlwZVIEdHlwZRIjCgtrb2luX2Ftb3VudBgCIAEoBEICMAFSCmtvaW5BbW91bnQSHgoHYWNjb3VudBgDIAEoDEIEgLUYBlIHYWNjb3VudCJNCgtiZW5lZmljaWFyeRIeCgdhZGRyZXNzGAEgASgMQgSAtRgGUgdhZGRyZXNzEh4KCnBlcmNlbnRhZ2UYAiABKA1SCnBlcmNlbnRhZ2UivwEKC3Bvb2xfcGFyYW1zEhIKBG5hbWUYASABKAlSBG5hbWUSFAoFaW1hZ2UYAiABKAlSBWltYWdlEiAKC2Rlc2NyaXB0aW9uGAMgASgJUgtkZXNjcmlwdGlvbhI5Cg1iZW5lZmljaWFyaWVzGAQgAygLMhMuZm9nYXRhLmJlbmVmaWNpYXJ5Ug1iZW5lZmljaWFyaWVzEikKDnBheW1lbnRfcGVyaW9kGAUgASgEQgIwAVINcGF5bWVudFBlcmlvZCLYAgoKcG9vbF9zdGF0ZRIYCgVzdGFrZRgBIAEoBEICMAFSBXN0YWtlEhwKB3ZpcnR1YWwYAiABKARCAjABUgd2aXJ0dWFsEikKDnNuYXBzaG90X3N0YWtlGAMgASgEQgIwAVINc25hcHNob3RTdGFrZRInCg1zbmFwc2hvdF9rb2luGAQgASgEQgIwAVIMc25hcHNob3RLb2luEi0KEGN1cnJlbnRfc25hcHNob3QYBSABKARCAjABUg9jdXJyZW50U25hcHNob3QSJwoNbmV4dF9zbmFwc2hvdBgGIAEoBEICMAFSDG5leHRTbmFwc2hvdBIpCg5rb2luX3dpdGhkcmF3bhgHIAEoBEICMAFSDWtvaW5XaXRoZHJhd24SIQoKdXNlcl9jb3VudBgKIAEoBEICMAFSCXVzZXJDb3VudBIYCgd2ZXJzaW9uGA0gASgJUgd2ZXJzaW9uKkEKDmFsbG93YW5jZV90eXBlEg0KCVVOREVGSU5FRBAAEhEKDVRSQU5TRkVSX0tPSU4QARINCglCVVJOX0tPSU4QAmIGcHJvdG8z",
  "koilib_types": {
    "nested": {
      "koinos": {
        "options": {
          "go_package": "github.com/koinos/koinos-proto-golang/koinos"
        },
        "nested": {
          "chain": {
            "options": {
              "go_package": "github.com/koinos/koinos-proto-golang/koinos/chain"
            },
            "nested": {
              "authorization_type": {
                "values": {
                  "contract_call": 0,
                  "transaction_application": 1,
                  "contract_upload": 2
                }
              },
              "call_data": {
                "fields": {
                  "contract_id": {
                    "type": "bytes",
                    "id": 1,
                    "options": {
                      "(btype)": "ADDRESS"
                    }
                  },
                  "entry_point": {
                    "type": "uint32",
                    "id": 2
                  },
                  "caller": {
                    "type": "bytes",
                    "id": 3
                  },
                  "data": {
                    "type": "bytes",
                    "id": 4
                  }
                }
              },
              "authorize_arguments": {
                "oneofs": {
                  "_call": {
                    "oneof": [
                      "call"
                    ]
                  }
                },
                "fields": {
                  "type": {
                    "type": "authorization_type",
                    "id": 1
                  },
                  "call": {
                    "type": "call_data",
                    "id": 2,
                    "options": {
                      "proto3_optional": true
                    }
                  }
                }
              },
              "authorize_result": {
                "fields": {
                  "value": {
                    "type": "bool",
                    "id": 1
                  }
                }
              }
            }
          },
          "bytes_type": {
            "values": {
              "BASE64": 0,
              "BASE58": 1,
              "HEX": 2,
              "BLOCK_ID": 3,
              "TRANSACTION_ID": 4,
              "CONTRACT_ID": 5,
              "ADDRESS": 6
            }
          },
          "_btype": {
            "oneof": [
              "btype"
            ]
          },
          "btype": {
            "type": "bytes_type",
            "id": 50000,
            "extend": "google.protobuf.FieldOptions",
            "options": {
              "proto3_optional": true
            }
          }
        }
      },
      "dex": {
        "nested": {
          "order_type": {
            "values": {
              "buy": 0,
              "sell": 1
            }
          },
          "order": {
            "fields": {
              "id": {
                "type": "string",
                "id": 1
              },
              "buy": {
                "type": "bool",
                "id": 2
              },
              "owner": {
                "type": "bytes",
                "id": 3,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "pool": {
                "type": "bytes",
                "id": 4,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "koin_amount": {
                "type": "uint64",
                "id": 5,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "vhp_amount": {
                "type": "uint64",
                "id": 6,
                "options": {
                  "jstype": "JS_STRING"
                }
              }
            }
          },
          "orders": {
            "fields": {
              "orders": {
                "rule": "repeated",
                "type": "order",
                "id": 1
              }
            }
          },
          "id": {
            "fields": {
              "id": {
                "type": "string",
                "id": 1
              }
            }
          },
          "fill_order_args": {
            "fields": {
              "id": {
                "type": "string",
                "id": 1
              },
              "account": {
                "type": "bytes",
                "id": 2,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "amount": {
                "type": "uint64",
                "id": 3,
                "options": {
                  "jstype": "JS_STRING"
                }
              }
            }
          },
          "get_orders_args": {
            "fields": {
              "start": {
                "type": "string",
                "id": 1
              },
              "limit": {
                "type": "int32",
                "id": 2
              },
              "descending": {
                "type": "bool",
                "id": 3
              },
              "buy": {
                "type": "bool",
                "id": 4
              },
              "tier": {
                "type": "int32",
                "id": 5
              }
            }
          },
          "get_orders_by_owner_args": {
            "fields": {
              "owner": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "start": {
                "type": "string",
                "id": 2
              },
              "limit": {
                "type": "int32",
                "id": 3
              },
              "descending": {
                "type": "bool",
                "id": 4
              }
            }
          }
        }
      },
      "fogata": {
        "nested": {
          "stake_args": {
            "fields": {
              "account": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "koin_amount": {
                "type": "uint64",
                "id": 2,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "vhp_amount": {
                "type": "uint64",
                "id": 3,
                "options": {
                  "jstype": "JS_STRING"
                }
              }
            }
          },
          "unstake_args": {
            "fields": {
              "account": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "koin_amount": {
                "type": "uint64",
                "id": 2,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "vhp_amount": {
                "type": "uint64",
                "id": 3,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "recipient": {
                "type": "bytes",
                "id": 4,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              }
            }
          },
          "stake_event": {
            "fields": {
              "account": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "koin_amount": {
                "type": "uint64",
                "id": 2,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "vhp_amount": {
                "type": "uint64",
                "id": 3,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "stake": {
                "type": "uint64",
                "id": 4,
                "options": {
                  "jstype": "JS_STRING"
                }
              }
            }
          },
          "snapshot_stake": {
            "fields": {
              "stake": {
                "type": "uint64",
                "id": 1,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "current_snapshot": {
                "type": "uint64",
                "id": 2,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "koin_withdrawn": {
                "type": "uint64",
                "id": 3,
                "options": {
                  "jstype": "JS_STRING"
                }
              }
            }
          },
          "balance": {
            "fields": {
              "koin_amount": {
                "type": "uint64",
                "id": 1,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "vhp_amount": {
                "type": "uint64",
                "id": 2,
                "options": {
                  "jstype": "JS_STRING"
                }
              }
            }
          },
          "koin_account": {
            "fields": {
              "account": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "koin_amount": {
                "type": "uint64",
                "id": 2,
                "options": {
                  "jstype": "JS_STRING"
                }
              }
            }
          },
          "collect_koin_preferences": {
            "fields": {
              "account": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "percentage_koin": {
                "type": "uint64",
                "id": 2,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "all_after_virtual": {
                "type": "uint64",
                "id": 3,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "allow_dex_to_unstake": {
                "type": "bool",
                "id": 4
              }
            }
          },
          "set_allow_unstake_args": {
            "fields": {
              "account": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "allow_dex_to_unstake": {
                "type": "bool",
                "id": 2
              }
            }
          },
          "allowance_type": {
            "values": {
              "UNDEFINED": 0,
              "TRANSFER_KOIN": 1,
              "BURN_KOIN": 2
            }
          },
          "allowance": {
            "fields": {
              "type": {
                "type": "allowance_type",
                "id": 1
              },
              "koin_amount": {
                "type": "uint64",
                "id": 2,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "account": {
                "type": "bytes",
                "id": 3,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              }
            }
          },
          "beneficiary": {
            "fields": {
              "address": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "percentage": {
                "type": "uint32",
                "id": 2
              }
            }
          },
          "pool_params": {
            "fields": {
              "name": {
                "type": "string",
                "id": 1
              },
              "image": {
                "type": "string",
                "id": 2
              },
              "description": {
                "type": "string",
                "id": 3
              },
              "beneficiaries": {
                "rule": "repeated",
                "type": "beneficiary",
                "id": 4
              },
              "payment_period": {
                "type": "uint64",
                "id": 5,
                "options": {
                  "jstype": "JS_STRING"
                }
              }
            }
          },
          "pool_state": {
            "fields": {
              "stake": {
                "type": "uint64",
                "id": 1,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "virtual": {
                "type": "uint64",
                "id": 2,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "snapshot_stake": {
                "type": "uint64",
                "id": 3,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "snapshot_koin": {
                "type": "uint64",
                "id": 4,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "current_snapshot": {
                "type": "uint64",
                "id": 5,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "next_snapshot": {
                "type": "uint64",
                "id": 6,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "koin_withdrawn": {
                "type": "uint64",
                "id": 7,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "user_count": {
                "type": "uint64",
                "id": 10,
                "options": {
                  "jstype": "JS_STRING"
                }
              },
              "version": {
                "type": "string",
                "id": 13
              }
            }
          }
        }
      }
    }
  },
  "events": {
    "set_order": {
      "type": "dex.order",
      "argument": "dex.order"
    },
    "order_removed": {
      "type": "dex.id",
      "argument": "dex.id"
    },
    "order_updated": {
      "type": "dex.order",
      "argument": "dex.order"
    }
  }
};
