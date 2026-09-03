import { Abi } from "koilib";

export const abiFogata2Pool: Abi = {
  "methods": {
    "is_initialized": {
      "argument": "",
      "return": "common.boole",
      "description": "Check if the storage is initialized. It should not be initialized before submitting it in list of pools.",
      "entry_point": 3045243214,
      "read_only": true,
      "entry-point": "0xb582b94e",
      "read-only": true
    },
    "authorize": {
      "argument": "authority.authorize_arguments",
      "return": "common.boole",
      "description": "Authorize function",
      "entry_point": 1244511632,
      "read_only": false,
      "entry-point": "0x4a2dbd90",
      "read-only": false
    },
    "get_beneficiary_balance": {
      "argument": "common.address",
      "return": "common.uint64",
      "description": "Get koin balance of beneficiary",
      "entry_point": 2034510168,
      "read_only": true,
      "entry-point": "0x79442958",
      "read-only": true
    },
    "get_stake": {
      "argument": "common.address",
      "return": "common.uint64",
      "description": "Get stake of an account",
      "entry_point": 618513616,
      "read_only": true,
      "entry-point": "0x24ddc4d0",
      "read-only": true
    },
    "get_accounts": {
      "argument": "common.list_args",
      "return": "common.addresses",
      "description": "Get accounts",
      "entry_point": 1344170881,
      "read_only": true,
      "entry-point": "0x501e6b81",
      "read-only": true
    },
    "get_snapshot_stake": {
      "argument": "common.address",
      "return": "fogata.snapshot_stake",
      "description": "Get snapshot of an account taken in the previous period and tokens withdrawn",
      "entry_point": 913774395,
      "read_only": true,
      "entry-point": "0x3677173b",
      "read-only": true
    },
    "get_pool_state": {
      "argument": "",
      "return": "fogata.pool_state",
      "description": "Get the state of the pool updated",
      "entry_point": 2975900562,
      "read_only": true,
      "entry-point": "0xb160a392",
      "read-only": true
    },
    "get_pool_state_no_updated": {
      "argument": "",
      "return": "fogata.pool_state",
      "description": "Get the state of the pool not updated (use only for debug purposes)",
      "entry_point": 2661655221,
      "read_only": true,
      "entry-point": "0x9ea5a2b5",
      "read-only": true
    },
    "get_collect_koin_preferences": {
      "argument": "common.address",
      "return": "fogata.collect_koin_preferences",
      "description": "Get user preferences",
      "entry_point": 1816930530,
      "read_only": true,
      "entry-point": "0x6c4c28e2",
      "read-only": true
    },
    "set_collect_koin_preferences": {
      "argument": "fogata.collect_koin_preferences",
      "return": "common.boole",
      "description": "Set user preferences",
      "entry_point": 3893476635,
      "read_only": false,
      "entry-point": "0xe811bd1b",
      "read-only": false
    },
    "set_allow_dex_to_unstake": {
      "argument": "fogata.set_allow_unstake_args",
      "return": "",
      "description": "Set if the dex contract is authorized to unstake for an account",
      "entry_point": 1414851469,
      "read_only": false,
      "entry-point": "0x5454eb8d",
      "read-only": false
    },
    "get_allow_dex_to_unstake": {
      "argument": "common.address",
      "return": "common.boole",
      "description": "Get if the dex contract is authorized to unstake for an account",
      "entry_point": 2744394505,
      "read_only": true,
      "entry-point": "0xa3942309",
      "read-only": true
    },
    "pay_beneficiary": {
      "argument": "common.address",
      "return": "common.boole",
      "description": "Transfer earnings to a beneficiary. It can be called by anyone",
      "entry_point": 966761176,
      "read_only": false,
      "entry-point": "0x399f9ad8",
      "read-only": false
    },
    "pay_beneficiaries": {
      "argument": "",
      "return": "common.boole",
      "description": "Transfer earnings to all beneficiaries. It can be called by anyone",
      "entry_point": 3778726567,
      "read_only": false,
      "entry-point": "0xe13acaa7",
      "read-only": false
    },
    "reburn_and_snapshot": {
      "argument": "",
      "return": "common.boole",
      "description": "Function to be called periodically by anyone to reburn the KOINs that was not withdrawn in the previous snapshot and take a new snapshot.",
      "entry_point": 2129709095,
      "read_only": false,
      "entry-point": "0x7ef0c827",
      "read-only": false
    },
    "balance_of": {
      "argument": "common.address",
      "return": "fogata.balance",
      "description": "koin/vhp balance of an account",
      "entry_point": 1550980247,
      "read_only": true,
      "entry-point": "0x5c721497",
      "read-only": true
    },
    "stake": {
      "argument": "fogata.stake_args",
      "return": "common.boole",
      "description": "Deposit koin or vhp into the pool",
      "entry_point": 4106941695,
      "read_only": false,
      "entry-point": "0xf4caf4ff",
      "read-only": false
    },
    "unstake": {
      "argument": "fogata.unstake_args",
      "return": "common.boole",
      "description": "Withdraw koin or vhp from the pool",
      "entry_point": 1161580635,
      "read_only": false,
      "entry-point": "0x453c505b",
      "read-only": false
    },
    "collect": {
      "argument": "common.address",
      "return": "common.boole",
      "description": "Withdraw earnings of koin. Anyone can call this method",
      "entry_point": 2172800144,
      "read_only": false,
      "entry-point": "0x81824c90",
      "read-only": false
    },
    "set_pool_params": {
      "argument": "fogata.pool_params",
      "return": "common.boole",
      "description": "Set mining pool parameters",
      "entry_point": 1227684861,
      "read_only": false,
      "entry-point": "0x492cfbfd",
      "read-only": false
    },
    "get_pool_params": {
      "argument": "",
      "return": "fogata.pool_params",
      "description": "Get mining pool parameters",
      "entry_point": 2396056273,
      "read_only": true,
      "entry-point": "0x8ed0ead1",
      "read-only": true
    },
    "get_all_reserved_koin": {
      "argument": "",
      "return": "common.uint64",
      "description": "Get reserved koin (for beneficiaries and mana supporters)",
      "entry_point": 1184241330,
      "read_only": true,
      "entry-point": "0x469616b2",
      "read-only": true
    },
    "get_reserved_koin": {
      "argument": "common.address",
      "return": "common.uint64",
      "description": "Get koin balance of mana supporter",
      "entry_point": 3116625487,
      "read_only": true,
      "entry-point": "0xb9c3ee4f",
      "read-only": true
    },
    "add_reserved_koin": {
      "argument": "fogata.koin_account",
      "return": "common.boole",
      "description": "Transfer KOINs to the pool to support the mana consumption. This amount will not be burned",
      "entry_point": 3237584295,
      "read_only": false,
      "entry-point": "0xc0f99da7",
      "read-only": false
    },
    "remove_reserved_koin": {
      "argument": "fogata.koin_account",
      "return": "common.boole",
      "description": "Withdraw KOINs used in the mana consumption.",
      "entry_point": 2259544932,
      "read_only": false,
      "entry-point": "0x86adeb64",
      "read-only": false
    },
    "set_owner": {
      "argument": "common.address",
      "return": "common.boole",
      "description": "Set owner",
      "entry_point": 238845787,
      "read_only": false,
      "entry-point": "0x0e3c7f5b",
      "read-only": false
    },
    "set_owner_votes_kfs": {
      "argument": "common.address",
      "return": "common.boole",
      "description": "Set owner",
      "entry_point": 550550049,
      "read_only": false,
      "entry-point": "0x20d0ba21",
      "read-only": false
    },
    "get_owner": {
      "argument": "",
      "return": "common.address",
      "description": "Get owner",
      "entry_point": 3970686139,
      "read_only": true,
      "entry-point": "0xecabdcbb",
      "read-only": true
    },
    "get_owner_votes_kfs": {
      "argument": "",
      "return": "common.address",
      "description": "Get owner of the votes for the Koinos Fund System",
      "entry_point": 3943377885,
      "read_only": true,
      "entry-point": "0xeb0b2bdd",
      "read-only": true
    }
  },
  "types": "CoQDCidrb2lub3Nib3gtcHJvdG8vbWFuYXNoYXJlci9jb21tb24ucHJvdG8SBmNvbW1vbhoUa29pbm9zL29wdGlvbnMucHJvdG8iGwoDc3RyEhQKBXZhbHVlGAEgASgJUgV2YWx1ZSIeCgZ1aW50MzISFAoFdmFsdWUYASABKA1SBXZhbHVlIiIKBnVpbnQ2NBIYCgV2YWx1ZRgBIAEoBEICMAFSBXZhbHVlIh0KBWJvb2xlEhQKBXZhbHVlGAEgASgIUgV2YWx1ZSIlCgdhZGRyZXNzEhoKBXZhbHVlGAEgASgMQgSAtRgGUgV2YWx1ZSJdCglsaXN0X2FyZ3MSGgoFc3RhcnQYASABKAxCBIC1GAZSBXN0YXJ0EhQKBWxpbWl0GAIgASgFUgVsaW1pdBIeCgpkZXNjZW5kaW5nGAMgASgIUgpkZXNjZW5kaW5nIi0KCWFkZHJlc3NlcxIgCghhY2NvdW50cxgBIAMoDEIEgLUYBlIIYWNjb3VudHNiBnByb3RvMwqPBAoca29pbm9zL2NoYWluL2F1dGhvcml0eS5wcm90bxIMa29pbm9zLmNoYWluGhRrb2lub3Mvb3B0aW9ucy5wcm90byJ/CgljYWxsX2RhdGESJQoLY29udHJhY3RfaWQYASABKAxCBIC1GAZSCmNvbnRyYWN0SWQSHwoLZW50cnlfcG9pbnQYAiABKA1SCmVudHJ5UG9pbnQSFgoGY2FsbGVyGAMgASgMUgZjYWxsZXISEgoEZGF0YRgEIAEoDFIEZGF0YSKGAQoTYXV0aG9yaXplX2FyZ3VtZW50cxI0CgR0eXBlGAEgASgOMiAua29pbm9zLmNoYWluLmF1dGhvcml6YXRpb25fdHlwZVIEdHlwZRIwCgRjYWxsGAIgASgLMhcua29pbm9zLmNoYWluLmNhbGxfZGF0YUgAUgRjYWxsiAEBQgcKBV9jYWxsIigKEGF1dGhvcml6ZV9yZXN1bHQSFAoFdmFsdWUYASABKAhSBXZhbHVlKlkKEmF1dGhvcml6YXRpb25fdHlwZRIRCg1jb250cmFjdF9jYWxsEAASGwoXdHJhbnNhY3Rpb25fYXBwbGljYXRpb24QARITCg9jb250cmFjdF91cGxvYWQQAkI0WjJnaXRodWIuY29tL2tvaW5vcy9rb2lub3MtcHJvdG8tZ29sYW5nL2tvaW5vcy9jaGFpbmIGcHJvdG8zCusOCgxmb2dhdGEucHJvdG8SBmZvZ2F0YRoUa29pbm9zL29wdGlvbnMucHJvdG8idAoKc3Rha2VfYXJncxIeCgdhY2NvdW50GAEgASgMQgSAtRgGUgdhY2NvdW50EiMKC2tvaW5fYW1vdW50GAIgASgEQgIwAVIKa29pbkFtb3VudBIhCgp2aHBfYW1vdW50GAMgASgEQgIwAVIJdmhwQW1vdW50IpoBCgx1bnN0YWtlX2FyZ3MSHgoHYWNjb3VudBgBIAEoDEIEgLUYBlIHYWNjb3VudBIjCgtrb2luX2Ftb3VudBgCIAEoBEICMAFSCmtvaW5BbW91bnQSIQoKdmhwX2Ftb3VudBgDIAEoBEICMAFSCXZocEFtb3VudBIiCglyZWNpcGllbnQYBCABKAxCBIC1GAZSCXJlY2lwaWVudCKPAQoLc3Rha2VfZXZlbnQSHgoHYWNjb3VudBgBIAEoDEIEgLUYBlIHYWNjb3VudBIjCgtrb2luX2Ftb3VudBgCIAEoBEICMAFSCmtvaW5BbW91bnQSIQoKdmhwX2Ftb3VudBgDIAEoBEICMAFSCXZocEFtb3VudBIYCgVzdGFrZRgEIAEoBEICMAFSBXN0YWtlIoQBCg5zbmFwc2hvdF9zdGFrZRIYCgVzdGFrZRgBIAEoBEICMAFSBXN0YWtlEi0KEGN1cnJlbnRfc25hcHNob3QYAiABKARCAjABUg9jdXJyZW50U25hcHNob3QSKQoOa29pbl93aXRoZHJhd24YAyABKARCAjABUg1rb2luV2l0aGRyYXduIlEKB2JhbGFuY2USIwoLa29pbl9hbW91bnQYASABKARCAjABUgprb2luQW1vdW50EiEKCnZocF9hbW91bnQYAiABKARCAjABUgl2aHBBbW91bnQiUwoMa29pbl9hY2NvdW50Eh4KB2FjY291bnQYASABKAxCBIC1GAZSB2FjY291bnQSIwoLa29pbl9hbW91bnQYAiABKARCAjABUgprb2luQW1vdW50IsgBChhjb2xsZWN0X2tvaW5fcHJlZmVyZW5jZXMSHgoHYWNjb3VudBgBIAEoDEIEgLUYBlIHYWNjb3VudBIrCg9wZXJjZW50YWdlX2tvaW4YAiABKARCAjABUg5wZXJjZW50YWdlS29pbhIuChFhbGxfYWZ0ZXJfdmlydHVhbBgDIAEoBEICMAFSD2FsbEFmdGVyVmlydHVhbBIvChRhbGxvd19kZXhfdG9fdW5zdGFrZRgEIAEoCFIRYWxsb3dEZXhUb1Vuc3Rha2UiaQoWc2V0X2FsbG93X3Vuc3Rha2VfYXJncxIeCgdhY2NvdW50GAEgASgMQgSAtRgGUgdhY2NvdW50Ei8KFGFsbG93X2RleF90b191bnN0YWtlGAIgASgIUhFhbGxvd0RleFRvVW5zdGFrZSJ8CglhbGxvd2FuY2USKgoEdHlwZRgBIAEoDjIWLmZvZ2F0YS5hbGxvd2FuY2VfdHlwZVIEdHlwZRIjCgtrb2luX2Ftb3VudBgCIAEoBEICMAFSCmtvaW5BbW91bnQSHgoHYWNjb3VudBgDIAEoDEIEgLUYBlIHYWNjb3VudCJNCgtiZW5lZmljaWFyeRIeCgdhZGRyZXNzGAEgASgMQgSAtRgGUgdhZGRyZXNzEh4KCnBlcmNlbnRhZ2UYAiABKA1SCnBlcmNlbnRhZ2UivwEKC3Bvb2xfcGFyYW1zEhIKBG5hbWUYASABKAlSBG5hbWUSFAoFaW1hZ2UYAiABKAlSBWltYWdlEiAKC2Rlc2NyaXB0aW9uGAMgASgJUgtkZXNjcmlwdGlvbhI5Cg1iZW5lZmljaWFyaWVzGAQgAygLMhMuZm9nYXRhLmJlbmVmaWNpYXJ5Ug1iZW5lZmljaWFyaWVzEikKDnBheW1lbnRfcGVyaW9kGAUgASgEQgIwAVINcGF5bWVudFBlcmlvZCLYAgoKcG9vbF9zdGF0ZRIYCgVzdGFrZRgBIAEoBEICMAFSBXN0YWtlEhwKB3ZpcnR1YWwYAiABKARCAjABUgd2aXJ0dWFsEikKDnNuYXBzaG90X3N0YWtlGAMgASgEQgIwAVINc25hcHNob3RTdGFrZRInCg1zbmFwc2hvdF9rb2luGAQgASgEQgIwAVIMc25hcHNob3RLb2luEi0KEGN1cnJlbnRfc25hcHNob3QYBSABKARCAjABUg9jdXJyZW50U25hcHNob3QSJwoNbmV4dF9zbmFwc2hvdBgGIAEoBEICMAFSDG5leHRTbmFwc2hvdBIpCg5rb2luX3dpdGhkcmF3bhgHIAEoBEICMAFSDWtvaW5XaXRoZHJhd24SIQoKdXNlcl9jb3VudBgKIAEoBEICMAFSCXVzZXJDb3VudBIYCgd2ZXJzaW9uGA0gASgJUgd2ZXJzaW9uKkEKDmFsbG93YW5jZV90eXBlEg0KCVVOREVGSU5FRBAAEhEKDVRSQU5TRkVSX0tPSU4QARINCglCVVJOX0tPSU4QAmIGcHJvdG8z",
  "koilib_types": {
    "nested": {
      "common": {
        "nested": {
          "str": {
            "fields": {
              "value": {
                "type": "string",
                "id": 1
              }
            }
          },
          "uint32": {
            "fields": {
              "value": {
                "type": "uint32",
                "id": 1
              }
            }
          },
          "uint64": {
            "fields": {
              "value": {
                "type": "uint64",
                "id": 1,
                "options": {
                  "jstype": "JS_STRING"
                }
              }
            }
          },
          "boole": {
            "fields": {
              "value": {
                "type": "bool",
                "id": 1
              }
            }
          },
          "address": {
            "fields": {
              "value": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              }
            }
          },
          "list_args": {
            "fields": {
              "start": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "limit": {
                "type": "int32",
                "id": 2
              },
              "descending": {
                "type": "bool",
                "id": 3
              }
            }
          },
          "addresses": {
            "fields": {
              "accounts": {
                "rule": "repeated",
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              }
            }
          }
        }
      },
      "koinos": {
        "options": {
          "go_package": "github.com/koinos/koinos-proto-golang/koinos"
        },
        "nested": {
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
          },
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
    "fogata.reburn_and_snapshot": {
      "type": "",
      "argument": ""
    },
    "fogata.stake": {
      "type": "fogata.stake_event",
      "argument": "fogata.stake_event"
    },
    "fogata.unstake": {
      "type": "fogata.stake_event",
      "argument": "fogata.stake_event"
    },
    "fogata.set_pool_params": {
      "type": "fogata.pool_params",
      "argument": "fogata.pool_params"
    },
    "fogata.add_reserved_koin": {
      "type": "fogata.koin_account",
      "argument": "fogata.koin_account"
    },
    "fogata.remove_reserved_koin": {
      "type": "fogata.koin_account",
      "argument": "fogata.koin_account"
    },
    "set_owner": {
      "type": "common.address",
      "argument": "common.address"
    },
    "set_owner_votes_kfs": {
      "type": "common.address",
      "argument": "common.address"
    }
  }
}
