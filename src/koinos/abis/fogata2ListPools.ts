import { Abi } from "koilib";

export const abiFogata2ListPools: Abi = {
    "methods": {
      "get_config": {
        "argument": "",
        "return": "pools.config",
        "description": "Get the config",
        "entry_point": 3159346644,
        "read_only": true,
        "entry-point": "0xbc4fcdd4",
        "read-only": true
      },
      "set_config": {
        "argument": "pools.config",
        "return": "",
        "description": "Set the config",
        "entry_point": 1269140617,
        "read_only": false,
        "entry-point": "0x4ba58c89",
        "read-only": false
      },
      "is_valid_pool": {
        "argument": "common.address",
        "return": "common.boole",
        "description": "Check if a pool is valid",
        "entry_point": 1858193075,
        "read_only": true,
        "entry-point": "0x6ec1c6b3",
        "read-only": true
      },
      "submit_pool": {
        "argument": "common.address",
        "return": "",
        "description": "Submit a new pool to revision",
        "entry_point": 3400496205,
        "read_only": false,
        "entry-point": "0xcaaf744d",
        "read-only": false
      },
      "remove_pool": {
        "argument": "common.address",
        "return": "",
        "description": "Remove an approved pool",
        "entry_point": 2079712985,
        "read_only": false,
        "entry-point": "0x7bf5e6d9",
        "read-only": false
      },
      "get_pools": {
        "argument": "common.list_args",
        "return": "pools.pools",
        "description": "Get submitted pools",
        "entry_point": 972238462,
        "read_only": true,
        "entry-point": "0x39f32e7e",
        "read-only": true
      },
      "get_removed_pools": {
        "argument": "common.list_args",
        "return": "pools.pools",
        "description": "Get removed pools",
        "entry_point": 4252798693,
        "read_only": true,
        "entry-point": "0xfd7c8ee5",
        "read-only": true
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
      "get_owner": {
        "argument": "",
        "return": "common.address",
        "description": "Get owner",
        "entry_point": 3970686139,
        "read_only": true,
        "entry-point": "0xecabdcbb",
        "read-only": true
      }
    },
    "types": "CpwDCgtwb29scy5wcm90bxIFcG9vbHMaFGtvaW5vcy9vcHRpb25zLnByb3RvIqsBCgRwb29sEh4KB2FjY291bnQYASABKAxCBIC1GAZSB2FjY291bnQSLQoHdmVyc2lvbhgCIAEoCzITLnBvb2xzLnBvb2xfdmVyc2lvblIHdmVyc2lvbhIrCg9zdWJtaXNzaW9uX3RpbWUYAyABKARCAjABUg5zdWJtaXNzaW9uVGltZRInCg1hcHByb3ZhbF90aW1lGAQgASgEQgIwAVIMYXBwcm92YWxUaW1lIkIKDHBvb2xfdmVyc2lvbhIYCgRoYXNoGAEgASgMQgSAtRgCUgRoYXNoEhgKB3ZlcnNpb24YAiABKAlSB3ZlcnNpb24iSgoGY29uZmlnEkAKEWFjY2VwdGVkX3ZlcnNpb25zGAEgAygLMhMucG9vbHMucG9vbF92ZXJzaW9uUhBhY2NlcHRlZFZlcnNpb25zIioKBXBvb2xzEiEKBXZhbHVlGAEgAygLMgsucG9vbHMucG9vbFIFdmFsdWViBnByb3RvMwqEAwona29pbm9zYm94LXByb3RvL21hbmFzaGFyZXIvY29tbW9uLnByb3RvEgZjb21tb24aFGtvaW5vcy9vcHRpb25zLnByb3RvIhsKA3N0chIUCgV2YWx1ZRgBIAEoCVIFdmFsdWUiHgoGdWludDMyEhQKBXZhbHVlGAEgASgNUgV2YWx1ZSIiCgZ1aW50NjQSGAoFdmFsdWUYASABKARCAjABUgV2YWx1ZSIdCgVib29sZRIUCgV2YWx1ZRgBIAEoCFIFdmFsdWUiJQoHYWRkcmVzcxIaCgV2YWx1ZRgBIAEoDEIEgLUYBlIFdmFsdWUiXQoJbGlzdF9hcmdzEhoKBXN0YXJ0GAEgASgMQgSAtRgGUgVzdGFydBIUCgVsaW1pdBgCIAEoBVIFbGltaXQSHgoKZGVzY2VuZGluZxgDIAEoCFIKZGVzY2VuZGluZyItCglhZGRyZXNzZXMSIAoIYWNjb3VudHMYASADKAxCBIC1GAZSCGFjY291bnRzYgZwcm90bzMKzg0KDGZvZ2F0YS5wcm90bxIGZm9nYXRhGhRrb2lub3Mvb3B0aW9ucy5wcm90byJ0CgpzdGFrZV9hcmdzEh4KB2FjY291bnQYASABKAxCBIC1GAZSB2FjY291bnQSIwoLa29pbl9hbW91bnQYAiABKARCAjABUgprb2luQW1vdW50EiEKCnZocF9hbW91bnQYAyABKARCAjABUgl2aHBBbW91bnQijwEKC3N0YWtlX2V2ZW50Eh4KB2FjY291bnQYASABKAxCBIC1GAZSB2FjY291bnQSIwoLa29pbl9hbW91bnQYAiABKARCAjABUgprb2luQW1vdW50EiEKCnZocF9hbW91bnQYAyABKARCAjABUgl2aHBBbW91bnQSGAoFc3Rha2UYBCABKARCAjABUgVzdGFrZSKEAQoOc25hcHNob3Rfc3Rha2USGAoFc3Rha2UYASABKARCAjABUgVzdGFrZRItChBjdXJyZW50X3NuYXBzaG90GAIgASgEQgIwAVIPY3VycmVudFNuYXBzaG90EikKDmtvaW5fd2l0aGRyYXduGAMgASgEQgIwAVINa29pbldpdGhkcmF3biJRCgdiYWxhbmNlEiMKC2tvaW5fYW1vdW50GAEgASgEQgIwAVIKa29pbkFtb3VudBIhCgp2aHBfYW1vdW50GAIgASgEQgIwAVIJdmhwQW1vdW50IlMKDGtvaW5fYWNjb3VudBIeCgdhY2NvdW50GAEgASgMQgSAtRgGUgdhY2NvdW50EiMKC2tvaW5fYW1vdW50GAIgASgEQgIwAVIKa29pbkFtb3VudCLIAQoYY29sbGVjdF9rb2luX3ByZWZlcmVuY2VzEh4KB2FjY291bnQYASABKAxCBIC1GAZSB2FjY291bnQSKwoPcGVyY2VudGFnZV9rb2luGAIgASgEQgIwAVIOcGVyY2VudGFnZUtvaW4SLgoRYWxsX2FmdGVyX3ZpcnR1YWwYAyABKARCAjABUg9hbGxBZnRlclZpcnR1YWwSLwoUYWxsb3dfZGV4X3RvX3Vuc3Rha2UYBCABKAhSEWFsbG93RGV4VG9VbnN0YWtlImkKFnNldF9hbGxvd191bnN0YWtlX2FyZ3MSHgoHYWNjb3VudBgBIAEoDEIEgLUYBlIHYWNjb3VudBIvChRhbGxvd19kZXhfdG9fdW5zdGFrZRgCIAEoCFIRYWxsb3dEZXhUb1Vuc3Rha2UifAoJYWxsb3dhbmNlEioKBHR5cGUYASABKA4yFi5mb2dhdGEuYWxsb3dhbmNlX3R5cGVSBHR5cGUSIwoLa29pbl9hbW91bnQYAiABKARCAjABUgprb2luQW1vdW50Eh4KB2FjY291bnQYAyABKAxCBIC1GAZSB2FjY291bnQiTQoLYmVuZWZpY2lhcnkSHgoHYWRkcmVzcxgBIAEoDEIEgLUYBlIHYWRkcmVzcxIeCgpwZXJjZW50YWdlGAIgASgNUgpwZXJjZW50YWdlIr8BCgtwb29sX3BhcmFtcxISCgRuYW1lGAEgASgJUgRuYW1lEhQKBWltYWdlGAIgASgJUgVpbWFnZRIgCgtkZXNjcmlwdGlvbhgDIAEoCVILZGVzY3JpcHRpb24SOQoNYmVuZWZpY2lhcmllcxgEIAMoCzITLmZvZ2F0YS5iZW5lZmljaWFyeVINYmVuZWZpY2lhcmllcxIpCg5wYXltZW50X3BlcmlvZBgFIAEoBEICMAFSDXBheW1lbnRQZXJpb2Qi2AIKCnBvb2xfc3RhdGUSGAoFc3Rha2UYASABKARCAjABUgVzdGFrZRIcCgd2aXJ0dWFsGAIgASgEQgIwAVIHdmlydHVhbBIpCg5zbmFwc2hvdF9zdGFrZRgDIAEoBEICMAFSDXNuYXBzaG90U3Rha2USJwoNc25hcHNob3Rfa29pbhgEIAEoBEICMAFSDHNuYXBzaG90S29pbhItChBjdXJyZW50X3NuYXBzaG90GAUgASgEQgIwAVIPY3VycmVudFNuYXBzaG90EicKDW5leHRfc25hcHNob3QYBiABKARCAjABUgxuZXh0U25hcHNob3QSKQoOa29pbl93aXRoZHJhd24YByABKARCAjABUg1rb2luV2l0aGRyYXduEiEKCnVzZXJfY291bnQYCiABKARCAjABUgl1c2VyQ291bnQSGAoHdmVyc2lvbhgNIAEoCVIHdmVyc2lvbipBCg5hbGxvd2FuY2VfdHlwZRINCglVTkRFRklORUQQABIRCg1UUkFOU0ZFUl9LT0lOEAESDQoJQlVSTl9LT0lOEAJiBnByb3RvMw==",
    "koilib_types": {
      "nested": {
        "pools": {
          "nested": {
            "pool": {
              "fields": {
                "account": {
                  "type": "bytes",
                  "id": 1,
                  "options": {
                    "(koinos.btype)": "ADDRESS"
                  }
                },
                "version": {
                  "type": "pool_version",
                  "id": 2
                },
                "submission_time": {
                  "type": "uint64",
                  "id": 3,
                  "options": {
                    "jstype": "JS_STRING"
                  }
                },
                "approval_time": {
                  "type": "uint64",
                  "id": 4,
                  "options": {
                    "jstype": "JS_STRING"
                  }
                }
              }
            },
            "pool_version": {
              "fields": {
                "hash": {
                  "type": "bytes",
                  "id": 1,
                  "options": {
                    "(koinos.btype)": "HEX"
                  }
                },
                "version": {
                  "type": "string",
                  "id": 2
                }
              }
            },
            "config": {
              "fields": {
                "accepted_versions": {
                  "rule": "repeated",
                  "type": "pool_version",
                  "id": 1
                }
              }
            },
            "pools": {
              "fields": {
                "value": {
                  "rule": "repeated",
                  "type": "pool",
                  "id": 1
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
            }
          }
        },
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
      "pools.set_config": {
        "type": "",
        "argument": ""
      },
      "pools.submit_pool": {
        "type": "common.address",
        "argument": "common.address"
      },
      "pools.resubmit_pool": {
        "type": "common.address",
        "argument": "common.address"
      },
      "pools.remove_pool": {
        "type": "common.address",
        "argument": "common.address"
      },
      "set_owner": {
        "type": "common.address",
        "argument": "common.address"
      }
    }
  };