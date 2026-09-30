import { Abi } from "koilib";

export const abiKoinosFund: Abi = {
  "methods": {
    "set_global_vars": {
      "argument": "fund.set_global_vars_arguments",
      "return": "",
      "description": "Set global vars",
      "entry_point": 1050561264,
      "read_only": false
    },
    "get_global_vars": {
      "argument": "",
      "return": "fund.global_vars",
      "description": "Get global vars",
      "entry_point": 776169940,
      "read_only": true
    },
    "get_project": {
      "argument": "fund.get_project_arguments",
      "return": "fund.project",
      "description": "Get project by ID",
      "entry_point": 3495374342,
      "read_only": true
    },
    "get_projects": {
      "argument": "fund.get_projects_arguments",
      "return": "fund.get_projects_result",
      "description": "Get projects paginated",
      "entry_point": 1544343095,
      "read_only": true
    },
    "get_user_votes": {
      "argument": "fund.get_user_votes_arguments",
      "return": "fund.get_user_votes_result",
      "description": "Get user votes",
      "entry_point": 1727410647,
      "read_only": true
    },
    "submit_project": {
      "argument": "fund.submit_project_arguments",
      "return": "fund.submit_project_result",
      "description": "Submit a new project",
      "entry_point": 1001044925,
      "read_only": false
    },
    "update_vote": {
      "argument": "fund.update_vote_arguments",
      "return": "fund.update_vote_result",
      "description": "Vote, unvote, or update the vote for a project",
      "entry_point": 3406555806,
      "read_only": false
    },
    "update_votes": {
      "argument": "fund.update_votes_arguments",
      "return": "",
      "description": "Update votes after an update in the balance (system function)",
      "entry_point": 2329363138,
      "read_only": false
    },
    "pay_projects": {
      "argument": "",
      "return": "fund.pay_projects_result",
      "description": "Distribute payments (system function)",
      "entry_point": 4293806838,
      "read_only": false
    }
  },
  "types": "CsMQCgpmdW5kLnByb3RvEgRmdW5kIpsCCgtnbG9iYWxfdmFycxInCg9mZWVfZGVub21pbmF0b3IYASABKARSDmZlZURlbm9taW5hdG9yEiUKDnRvdGFsX3Byb2plY3RzGAIgASgNUg10b3RhbFByb2plY3RzEjYKF3RvdGFsX3VwY29taW5nX3Byb2plY3RzGAMgASgNUhV0b3RhbFVwY29taW5nUHJvamVjdHMSMgoVdG90YWxfYWN0aXZlX3Byb2plY3RzGAQgASgNUhN0b3RhbEFjdGl2ZVByb2plY3RzEiMKDXBheW1lbnRfdGltZXMYBSADKARSDHBheW1lbnRUaW1lcxIrChFyZW1haW5pbmdfYmFsYW5jZRgGIAEoBFIQcmVtYWluaW5nQmFsYW5jZSJEChlzZXRfZ2xvYmFsX3ZhcnNfYXJndW1lbnRzEicKD2ZlZV9kZW5vbWluYXRvchgBIAEoBFIOZmVlRGVub21pbmF0b3IigwIKGHN1Ym1pdF9wcm9qZWN0X2FyZ3VtZW50cxIYCgdjcmVhdG9yGAEgASgMUgdjcmVhdG9yEiAKC2JlbmVmaWNpYXJ5GAIgASgMUgtiZW5lZmljaWFyeRIUCgV0aXRsZRgDIAEoCVIFdGl0bGUSIAoLZGVzY3JpcHRpb24YBCABKAlSC2Rlc2NyaXB0aW9uEicKD21vbnRobHlfcGF5bWVudBgFIAEoBFIObW9udGhseVBheW1lbnQSHQoKc3RhcnRfZGF0ZRgGIAEoBFIJc3RhcnREYXRlEhkKCGVuZF9kYXRlGAcgASgEUgdlbmREYXRlEhAKA2ZlZRgIIAEoBFIDZmVlIhcKFXN1Ym1pdF9wcm9qZWN0X3Jlc3VsdCLVAgoHcHJvamVjdBIOCgJpZBgBIAEoDVICaWQSGAoHY3JlYXRvchgCIAEoDFIHY3JlYXRvchIgCgtiZW5lZmljaWFyeRgDIAEoDFILYmVuZWZpY2lhcnkSFAoFdGl0bGUYBCABKAlSBXRpdGxlEiAKC2Rlc2NyaXB0aW9uGAUgASgJUgtkZXNjcmlwdGlvbhInCg9tb250aGx5X3BheW1lbnQYBiABKARSDm1vbnRobHlQYXltZW50Eh0KCnN0YXJ0X2RhdGUYByABKARSCXN0YXJ0RGF0ZRIZCghlbmRfZGF0ZRgIIAEoBFIHZW5kRGF0ZRIsCgZzdGF0dXMYCSABKA4yFC5mdW5kLnByb2plY3Rfc3RhdHVzUgZzdGF0dXMSHwoLdG90YWxfdm90ZXMYCiABKARSCnRvdGFsVm90ZXMSFAoFdm90ZXMYCyADKARSBXZvdGVzIgsKCWV4aXN0ZW5jZSJiCgl2b3RlX2luZm8SHQoKcHJvamVjdF9pZBgBIAEoDVIJcHJvamVjdElkEhYKBndlaWdodBgCIAEoDVIGd2VpZ2h0Eh4KCmV4cGlyYXRpb24YAyABKARSCmV4cGlyYXRpb24iZwofc2V0X3ZvdGVzX2tvaW5vc19mdW5kX2FyZ3VtZW50cxIYCgdhY2NvdW50GAEgASgMUgdhY2NvdW50EioKEXZvdGVzX2tvaW5vc19mdW5kGAIgASgIUg92b3Rlc0tvaW5vc0Z1bmQiZAoVdXBkYXRlX3ZvdGVfYXJndW1lbnRzEhQKBXZvdGVyGAEgASgMUgV2b3RlchIdCgpwcm9qZWN0X2lkGAIgASgNUglwcm9qZWN0SWQSFgoGd2VpZ2h0GAMgASgNUgZ3ZWlnaHQiFAoSdXBkYXRlX3ZvdGVfcmVzdWx0IkEKE3BheV9wcm9qZWN0c19yZXN1bHQSKgoRbmV4dF9wYXltZW50X3RpbWUYASABKARSD25leHRQYXltZW50VGltZSJwChZ1cGRhdGVfdm90ZXNfYXJndW1lbnRzEhQKBXZvdGVyGAEgASgMUgV2b3RlchIfCgtuZXdfYmFsYW5jZRgCIAEoBFIKbmV3QmFsYW5jZRIfCgtvbGRfYmFsYW5jZRgDIAEoBFIKb2xkQmFsYW5jZSI2ChVnZXRfcHJvamVjdF9hcmd1bWVudHMSHQoKcHJvamVjdF9pZBgBIAEoDVIJcHJvamVjdElkIsYBChZnZXRfcHJvamVjdHNfYXJndW1lbnRzEiwKBnN0YXR1cxgBIAEoDjIULmZ1bmQucHJvamVjdF9zdGF0dXNSBnN0YXR1cxIyCghvcmRlcl9ieRgCIAEoDjIXLmZ1bmQub3JkZXJfcHJvamVjdHNfYnlSB29yZGVyQnkSFAoFc3RhcnQYAyABKAlSBXN0YXJ0EhQKBWxpbWl0GAQgASgFUgVsaW1pdBIeCgpkZXNjZW5kaW5nGAUgASgIUgpkZXNjZW5kaW5nImgKE2dldF9wcm9qZWN0c19yZXN1bHQSKQoIcHJvamVjdHMYASADKAsyDS5mdW5kLnByb2plY3RSCHByb2plY3RzEiYKD3N0YXJ0X25leHRfcGFnZRgCIAEoCVINc3RhcnROZXh0UGFnZSIwChhnZXRfdXNlcl92b3Rlc19hcmd1bWVudHMSFAoFdm90ZXIYASABKAxSBXZvdGVyIj4KFWdldF91c2VyX3ZvdGVzX3Jlc3VsdBIlCgV2b3RlcxgBIAMoCzIPLmZ1bmQudm90ZV9pbmZvUgV2b3Rlcyo0Cg5wcm9qZWN0X3N0YXR1cxIMCgh1cGNvbWluZxAAEgoKBmFjdGl2ZRABEggKBHBhc3QQAiouChFvcmRlcl9wcm9qZWN0c19ieRILCgdieV9kYXRlEAASDAoIYnlfdm90ZXMQAWIGcHJvdG8z",
  "koilib_types": {
    "nested": {
      "fund": {
        "nested": {
          "global_vars": {
            "fields": {
              "fee_denominator": {
                "type": "uint64",
                "id": 1
              },
              "total_projects": {
                "type": "uint32",
                "id": 2
              },
              "total_upcoming_projects": {
                "type": "uint32",
                "id": 3
              },
              "total_active_projects": {
                "type": "uint32",
                "id": 4
              },
              "payment_times": {
                "rule": "repeated",
                "type": "uint64",
                "id": 5
              },
              "remaining_balance": {
                "type": "uint64",
                "id": 6
              }
            }
          },
          "set_global_vars_arguments": {
            "fields": {
              "fee_denominator": {
                "type": "uint64",
                "id": 1
              }
            }
          },
          "submit_project_arguments": {
            "fields": {
              "creator": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "beneficiary": {
                "type": "bytes",
                "id": 2,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "title": {
                "type": "string",
                "id": 3
              },
              "description": {
                "type": "string",
                "id": 4
              },
              "monthly_payment": {
                "type": "uint64",
                "id": 5
              },
              "start_date": {
                "type": "uint64",
                "id": 6
              },
              "end_date": {
                "type": "uint64",
                "id": 7
              },
              "fee": {
                "type": "uint64",
                "id": 8
              }
            }
          },
          "submit_project_result": {
            "fields": {}
          },
          "project_status": {
            "values": {
              "upcoming": 0,
              "active": 1,
              "past": 2
            }
          },
          "project": {
            "fields": {
              "id": {
                "type": "uint32",
                "id": 1
              },
              "creator": {
                "type": "bytes",
                "id": 2,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "beneficiary": {
                "type": "bytes",
                "id": 3,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "title": {
                "type": "string",
                "id": 4
              },
              "description": {
                "type": "string",
                "id": 5
              },
              "monthly_payment": {
                "type": "uint64",
                "id": 6
              },
              "start_date": {
                "type": "uint64",
                "id": 7
              },
              "end_date": {
                "type": "uint64",
                "id": 8
              },
              "status": {
                "type": "project_status",
                "id": 9
              },
              "total_votes": {
                "type": "uint64",
                "id": 10
              },
              "votes": {
                "rule": "repeated",
                "type": "uint64",
                "id": 11
              }
            }
          },
          "existence": {
            "fields": {}
          },
          "vote_info": {
            "fields": {
              "project_id": {
                "type": "uint32",
                "id": 1
              },
              "weight": {
                "type": "uint32",
                "id": 2
              },
              "expiration": {
                "type": "uint64",
                "id": 3
              }
            }
          },
          "set_votes_koinos_fund_arguments": {
            "fields": {
              "account": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "votes_koinos_fund": {
                "type": "bool",
                "id": 2
              }
            }
          },
          "update_vote_arguments": {
            "fields": {
              "voter": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "project_id": {
                "type": "uint32",
                "id": 2
              },
              "weight": {
                "type": "uint32",
                "id": 3
              }
            }
          },
          "update_vote_result": {
            "fields": {}
          },
          "pay_projects_result": {
            "fields": {
              "next_payment_time": {
                "type": "uint64",
                "id": 1
              }
            }
          },
          "update_votes_arguments": {
            "fields": {
              "voter": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              },
              "new_balance": {
                "type": "uint64",
                "id": 2
              },
              "old_balance": {
                "type": "uint64",
                "id": 3
              }
            }
          },
          "get_project_arguments": {
            "fields": {
              "project_id": {
                "type": "uint32",
                "id": 1
              }
            }
          },
          "order_projects_by": {
            "values": {
              "by_date": 0,
              "by_votes": 1
            }
          },
          "get_projects_arguments": {
            "fields": {
              "status": {
                "type": "project_status",
                "id": 1
              },
              "order_by": {
                "type": "order_projects_by",
                "id": 2
              },
              "start": {
                "type": "string",
                "id": 3
              },
              "limit": {
                "type": "int32",
                "id": 4
              },
              "descending": {
                "type": "bool",
                "id": 5
              }
            }
          },
          "get_projects_result": {
            "fields": {
              "projects": {
                "rule": "repeated",
                "type": "project",
                "id": 1
              },
              "start_next_page": {
                "type": "string",
                "id": 2
              }
            }
          },
          "get_user_votes_arguments": {
            "fields": {
              "voter": {
                "type": "bytes",
                "id": 1,
                "options": {
                  "(koinos.btype)": "ADDRESS"
                }
              }
            }
          },
          "get_user_votes_result": {
            "fields": {
              "votes": {
                "rule": "repeated",
                "type": "vote_info",
                "id": 1
              }
            }
          }
        }
      }
    }
  },
  "events": {
    "fund.submit_project_event": {
      "type": "fund.submit_project_arguments",
      "argument": "fund.submit_project_arguments"
    },
    "fund.update_vote_event": {
      "type": "fund.update_vote_arguments",
      "argument": "fund.update_vote_arguments"
    }
  }
}