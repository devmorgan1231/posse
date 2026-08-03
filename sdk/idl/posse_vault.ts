export type PosseVault = {
  "address": "629C4PESAxcsvb82LEtYtVevevEY8HZEidMPf9KcjNNx",
  "metadata": {
    "name": "posseVault",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "POSSE conditional group-purchase vault: chip in, buy only on fixed terms, refund, hold, dispose, settle by share"
  },
  "instructions": [
    {
      "name": "bid",
      "discriminator": [
        199,
        56,
        85,
        38,
        146,
        243,
        37,
        158
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "posse",
          "relations": [
            "disposition"
          ]
        },
        {
          "name": "disposition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100,
                  45,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "prevBidder",
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buyListed",
      "discriminator": [
        75,
        236,
        50,
        95,
        167,
        79,
        50,
        201
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "posse",
          "writable": true,
          "relations": [
            "disposition"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "disposition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "buyerToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "royaltyRecipient",
          "writable": true
        },
        {
          "name": "feeWallet",
          "writable": true
        },
        {
          "name": "custodyRentPayer",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "cancelListing",
      "discriminator": [
        41,
        183,
        50,
        232,
        230,
        233,
        157,
        70
      ],
      "accounts": [
        {
          "name": "seller",
          "writable": true,
          "signer": true,
          "relations": [
            "listing"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "listing"
          ]
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "listing"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "sellerToken",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "claimProceeds",
      "discriminator": [
        44,
        76,
        121,
        111,
        124,
        251,
        237,
        5
      ],
      "accounts": [
        {
          "name": "contributor",
          "writable": true,
          "signer": true,
          "relations": [
            "contribution"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "posse",
          "writable": true,
          "relations": [
            "disposition",
            "contribution"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "disposition",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "contribution",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  105,
                  98,
                  117,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              },
              {
                "kind": "account",
                "path": "contributor"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "claimRefund",
      "discriminator": [
        15,
        16,
        30,
        161,
        255,
        228,
        97,
        60
      ],
      "accounts": [
        {
          "name": "contributor",
          "writable": true,
          "signer": true,
          "relations": [
            "contribution"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "posse",
          "writable": true,
          "relations": [
            "contribution"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "contribution",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  105,
                  98,
                  117,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              },
              {
                "kind": "account",
                "path": "contributor"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "claimReturned",
      "discriminator": [
        52,
        150,
        202,
        158,
        160,
        23,
        39,
        59
      ],
      "accounts": [
        {
          "name": "contributor",
          "writable": true,
          "signer": true,
          "relations": [
            "contribution"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "posse",
          "relations": [
            "contribution"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "contribution",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  105,
                  98,
                  117,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              },
              {
                "kind": "account",
                "path": "contributor"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "closePosse",
      "discriminator": [
        53,
        103,
        234,
        71,
        104,
        165,
        91,
        34
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "posse",
          "writable": true,
          "relations": [
            "disposition"
          ]
        },
        {
          "name": "organizer",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "feeWallet",
          "writable": true
        },
        {
          "name": "disposition",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "dispositionRentPayer",
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "contribute",
      "discriminator": [
        82,
        33,
        68,
        131,
        32,
        0,
        205,
        95
      ],
      "accounts": [
        {
          "name": "contributor",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "posse",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "contribution",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  105,
                  98,
                  117,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              },
              {
                "kind": "account",
                "path": "contributor"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createPosse",
      "discriminator": [
        246,
        12,
        197,
        94,
        228,
        255,
        154,
        75
      ],
      "accounts": [
        {
          "name": "organizer",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "posse",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "organizer"
              },
              {
                "kind": "arg",
                "path": "args.nonce"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "createPosseArgs"
            }
          }
        }
      ]
    },
    {
      "name": "executePurchase",
      "discriminator": [
        193,
        193,
        250,
        92,
        23,
        221,
        96,
        102
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "posse",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "listing.seller",
                "account": "listing"
              },
              {
                "kind": "account",
                "path": "listing.mint",
                "account": "listing"
              }
            ]
          }
        },
        {
          "name": "seller",
          "writable": true
        },
        {
          "name": "feeWallet",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "listing"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "expire",
      "discriminator": [
        243,
        83,
        205,
        58,
        57,
        201,
        247,
        146
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "posse",
          "writable": true
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "initializeConfig",
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "programData",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  74,
                  149,
                  70,
                  210,
                  147,
                  199,
                  22,
                  44,
                  204,
                  17,
                  200,
                  106,
                  176,
                  204,
                  144,
                  163,
                  238,
                  98,
                  7,
                  143,
                  191,
                  27,
                  194,
                  178,
                  226,
                  83,
                  188,
                  216,
                  199,
                  40,
                  56,
                  237
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                2,
                168,
                246,
                145,
                78,
                136,
                161,
                176,
                226,
                16,
                21,
                62,
                247,
                99,
                174,
                43,
                0,
                194,
                185,
                61,
                22,
                193,
                36,
                210,
                192,
                83,
                122,
                16,
                4,
                128,
                0,
                0
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "feeWallet",
          "type": "pubkey"
        },
        {
          "name": "executionFeeBps",
          "type": "u16"
        },
        {
          "name": "settlementFeeBps",
          "type": "u16"
        },
        {
          "name": "maxFeeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "issueShares",
      "discriminator": [
        110,
        72,
        179,
        47,
        131,
        109,
        115,
        103
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "posse",
          "writable": true
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "listAsset",
      "discriminator": [
        11,
        25,
        254,
        205,
        61,
        252,
        23,
        15
      ],
      "accounts": [
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint"
        },
        {
          "name": "sellerToken",
          "writable": true
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "listing"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "askLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleAuction",
      "discriminator": [
        246,
        196,
        183,
        98,
        222,
        139,
        46,
        133
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "posse",
          "writable": true,
          "relations": [
            "disposition"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "disposition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100,
                  45,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "dispositionRentPayer",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "winner",
          "writable": true,
          "optional": true
        },
        {
          "name": "winnerToken",
          "writable": true,
          "optional": true
        },
        {
          "name": "royaltyRecipient",
          "writable": true
        },
        {
          "name": "feeWallet",
          "writable": true
        },
        {
          "name": "custodyRentPayer",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "startDisposition",
      "discriminator": [
        51,
        135,
        221,
        243,
        204,
        177,
        154,
        108
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "posse",
          "writable": true
        },
        {
          "name": "disposition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "updateConfig",
      "discriminator": [
        29,
        158,
        252,
        191,
        10,
        83,
        219,
        99
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "updateConfigArgs"
            }
          }
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "contributor",
          "writable": true,
          "signer": true,
          "relations": [
            "contribution"
          ]
        },
        {
          "name": "posse",
          "writable": true,
          "relations": [
            "contribution"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              }
            ]
          }
        },
        {
          "name": "contribution",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  105,
                  98,
                  117,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "posse"
              },
              {
                "kind": "account",
                "path": "contributor"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "contribution",
      "discriminator": [
        182,
        187,
        14,
        111,
        72,
        167,
        242,
        212
      ]
    },
    {
      "name": "disposition",
      "discriminator": [
        227,
        225,
        115,
        128,
        99,
        134,
        68,
        3
      ]
    },
    {
      "name": "listing",
      "discriminator": [
        218,
        32,
        50,
        73,
        43,
        134,
        26,
        58
      ]
    },
    {
      "name": "posse",
      "discriminator": [
        60,
        72,
        136,
        191,
        193,
        131,
        173,
        67
      ]
    }
  ],
  "events": [
    {
      "name": "assetListed",
      "discriminator": [
        39,
        64,
        97,
        162,
        189,
        150,
        150,
        2
      ]
    },
    {
      "name": "bidPlaced",
      "discriminator": [
        135,
        53,
        176,
        83,
        193,
        69,
        108,
        61
      ]
    },
    {
      "name": "chippedIn",
      "discriminator": [
        85,
        90,
        236,
        213,
        175,
        42,
        178,
        23
      ]
    },
    {
      "name": "configUpdated",
      "discriminator": [
        40,
        241,
        230,
        122,
        11,
        19,
        198,
        194
      ]
    },
    {
      "name": "dispositionFailed",
      "discriminator": [
        190,
        58,
        162,
        105,
        36,
        26,
        19,
        160
      ]
    },
    {
      "name": "dispositionStarted",
      "discriminator": [
        68,
        32,
        190,
        207,
        243,
        73,
        102,
        29
      ]
    },
    {
      "name": "expired",
      "discriminator": [
        197,
        227,
        104,
        103,
        133,
        50,
        207,
        161
      ]
    },
    {
      "name": "funded",
      "discriminator": [
        67,
        84,
        56,
        88,
        192,
        12,
        201,
        177
      ]
    },
    {
      "name": "listingCancelled",
      "discriminator": [
        11,
        46,
        163,
        10,
        103,
        80,
        139,
        194
      ]
    },
    {
      "name": "posseClosed",
      "discriminator": [
        29,
        243,
        21,
        119,
        109,
        112,
        12,
        54
      ]
    },
    {
      "name": "posseCreated",
      "discriminator": [
        237,
        164,
        111,
        110,
        222,
        18,
        73,
        198
      ]
    },
    {
      "name": "proceedsClaimed",
      "discriminator": [
        153,
        159,
        250,
        104,
        73,
        211,
        73,
        9
      ]
    },
    {
      "name": "purchased",
      "discriminator": [
        20,
        112,
        33,
        232,
        177,
        248,
        215,
        233
      ]
    },
    {
      "name": "refundClaimed",
      "discriminator": [
        136,
        64,
        242,
        99,
        4,
        244,
        208,
        130
      ]
    },
    {
      "name": "returnedClaimed",
      "discriminator": [
        158,
        166,
        218,
        215,
        84,
        78,
        226,
        117
      ]
    },
    {
      "name": "settled",
      "discriminator": [
        232,
        210,
        40,
        17,
        142,
        124,
        145,
        238
      ]
    },
    {
      "name": "sharesIssued",
      "discriminator": [
        0,
        70,
        31,
        135,
        18,
        242,
        247,
        173
      ]
    },
    {
      "name": "withdrew",
      "discriminator": [
        15,
        125,
        249,
        65,
        130,
        86,
        20,
        166
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notUpgradeAuthority",
      "msg": "signer is not the program upgrade authority"
    },
    {
      "code": 6001,
      "name": "notAdmin",
      "msg": "signer is not the config admin"
    },
    {
      "code": 6002,
      "name": "feeAboveCap",
      "msg": "fee bps above the cap"
    },
    {
      "code": 6003,
      "name": "paused",
      "msg": "new posses and chips are paused"
    },
    {
      "code": 6004,
      "name": "notNftDecimals",
      "msg": "asset mint must have 0 decimals"
    },
    {
      "code": 6005,
      "name": "notNftSupply",
      "msg": "asset mint can still mint more (supply != 1 and mint authority set)"
    },
    {
      "code": 6006,
      "name": "invalidAmount",
      "msg": "invalid amount"
    },
    {
      "code": 6007,
      "name": "deadlineInPast",
      "msg": "deadline must be in the future"
    },
    {
      "code": 6008,
      "name": "invalidExit",
      "msg": "invalid exit terms"
    },
    {
      "code": 6009,
      "name": "invalidRoyalty",
      "msg": "royalty bps above 10000"
    },
    {
      "code": 6010,
      "name": "badStatus",
      "msg": "posse status does not allow this"
    },
    {
      "code": 6011,
      "name": "deadlinePassed",
      "msg": "deadline passed"
    },
    {
      "code": 6012,
      "name": "deadlineNotReached",
      "msg": "deadline not reached"
    },
    {
      "code": 6013,
      "name": "noHeadroom",
      "msg": "posse is full"
    },
    {
      "code": 6014,
      "name": "listingNotOpen",
      "msg": "listing is not open"
    },
    {
      "code": 6015,
      "name": "mintMismatch",
      "msg": "listing mint does not match the posse mint"
    },
    {
      "code": 6016,
      "name": "sellerMismatch",
      "msg": "listing seller does not match the posse seller"
    },
    {
      "code": 6017,
      "name": "priceAboveMax",
      "msg": "ask is above the posse max price"
    },
    {
      "code": 6018,
      "name": "unaffordable",
      "msg": "raised does not cover price + fee"
    },
    {
      "code": 6019,
      "name": "escrowEmpty",
      "msg": "escrow does not hold exactly one asset"
    },
    {
      "code": 6020,
      "name": "recipientMismatch",
      "msg": "account does not match the recorded recipient"
    },
    {
      "code": 6021,
      "name": "feeWalletMismatch",
      "msg": "fee wallet does not match config"
    },
    {
      "code": 6022,
      "name": "holdNotOver",
      "msg": "exit hold period not over"
    },
    {
      "code": 6023,
      "name": "wrongKind",
      "msg": "wrong disposition kind"
    },
    {
      "code": 6024,
      "name": "auctionNotLive",
      "msg": "auction not live"
    },
    {
      "code": 6025,
      "name": "bidBelowReserve",
      "msg": "bid below reserve"
    },
    {
      "code": 6026,
      "name": "bidIncrementTooSmall",
      "msg": "bid below the minimum increment"
    },
    {
      "code": 6027,
      "name": "prevBidderMismatch",
      "msg": "previous bidder account missing or wrong"
    },
    {
      "code": 6028,
      "name": "auctionNotEnded",
      "msg": "auction has not ended"
    },
    {
      "code": 6029,
      "name": "alreadySettled",
      "msg": "already settled"
    },
    {
      "code": 6030,
      "name": "alreadyClaimed",
      "msg": "already claimed"
    },
    {
      "code": 6031,
      "name": "nothingToClaim",
      "msg": "nothing to claim"
    },
    {
      "code": 6032,
      "name": "claimsOutstanding",
      "msg": "contributions still unclaimed"
    },
    {
      "code": 6033,
      "name": "dispositionMismatch",
      "msg": "disposition account missing or wrong"
    },
    {
      "code": 6034,
      "name": "vaultRentBreach",
      "msg": "vault would drop below its rent reserve"
    },
    {
      "code": 6035,
      "name": "sellerHasNoAsset",
      "msg": "seller does not hold the asset"
    },
    {
      "code": 6036,
      "name": "mathOverflow",
      "msg": "arithmetic overflow"
    },
    {
      "code": 6037,
      "name": "winnerAccountMismatch",
      "msg": "winner token account missing or wrong"
    },
    {
      "code": 6038,
      "name": "mutantOrganizerOnly",
      "msg": "only the organizer may crank (mutation control build)"
    }
  ],
  "types": [
    {
      "name": "assetListed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "listing",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "ask",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "bidPlaced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "prevBidder",
            "type": "pubkey"
          },
          {
            "name": "prevRefund",
            "type": "u64"
          },
          {
            "name": "at",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "chippedIn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "contributor",
            "type": "pubkey"
          },
          {
            "name": "accepted",
            "type": "u64"
          },
          {
            "name": "newRaised",
            "type": "u64"
          },
          {
            "name": "contributorCount",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "feeWallet",
            "type": "pubkey"
          },
          {
            "name": "executionFeeBps",
            "type": "u16"
          },
          {
            "name": "settlementFeeBps",
            "type": "u16"
          },
          {
            "name": "maxFeeBps",
            "type": "u16"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "configUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "feeWallet",
            "type": "pubkey"
          },
          {
            "name": "executionFeeBps",
            "type": "u16"
          },
          {
            "name": "settlementFeeBps",
            "type": "u16"
          },
          {
            "name": "paused",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "contribution",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "contributor",
            "type": "pubkey"
          },
          {
            "name": "amountLamports",
            "type": "u64"
          },
          {
            "name": "firstAt",
            "type": "i64"
          },
          {
            "name": "returnedClaimed",
            "type": "bool"
          },
          {
            "name": "finalClaimed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "createPosseArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "royaltyRecipient",
            "type": "pubkey"
          },
          {
            "name": "royaltyBps",
            "type": "u16"
          },
          {
            "name": "targetLamports",
            "type": "u64"
          },
          {
            "name": "maxPriceLamports",
            "type": "u64"
          },
          {
            "name": "closesAt",
            "type": "i64"
          },
          {
            "name": "exitKind",
            "type": "u8"
          },
          {
            "name": "exitDay",
            "type": "u16"
          },
          {
            "name": "exitPriceLamports",
            "type": "u64"
          },
          {
            "name": "exitHours",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "disposition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "kind",
            "type": "u8"
          },
          {
            "name": "startsAt",
            "type": "i64"
          },
          {
            "name": "endsAt",
            "type": "i64"
          },
          {
            "name": "reserveLamports",
            "type": "u64"
          },
          {
            "name": "highBidLamports",
            "type": "u64"
          },
          {
            "name": "highBidder",
            "type": "pubkey"
          },
          {
            "name": "bidCount",
            "type": "u32"
          },
          {
            "name": "bidEscrowBump",
            "type": "u8"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "saleLamports",
            "type": "u64"
          },
          {
            "name": "royaltyLamports",
            "type": "u64"
          },
          {
            "name": "settleFeeLamports",
            "type": "u64"
          },
          {
            "name": "netLamports",
            "type": "u64"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "settledAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "rentPayer",
            "type": "pubkey"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "dispositionFailed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "at",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "dispositionStarted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "kind",
            "type": "u8"
          },
          {
            "name": "startsAt",
            "type": "i64"
          },
          {
            "name": "endsAt",
            "type": "i64"
          },
          {
            "name": "reserve",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "expired",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "at",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "funded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "raised",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "listing",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "askLamports",
            "type": "u64"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "escrowBump",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "listingCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "listing",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "posse",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organizer",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "royaltyRecipient",
            "type": "pubkey"
          },
          {
            "name": "royaltyBps",
            "type": "u16"
          },
          {
            "name": "targetLamports",
            "type": "u64"
          },
          {
            "name": "maxPriceLamports",
            "type": "u64"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "closesAt",
            "type": "i64"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "raisedLamports",
            "type": "u64"
          },
          {
            "name": "contributorCount",
            "type": "u32"
          },
          {
            "name": "exitKind",
            "type": "u8"
          },
          {
            "name": "exitDay",
            "type": "u16"
          },
          {
            "name": "exitPriceLamports",
            "type": "u64"
          },
          {
            "name": "exitHours",
            "type": "u16"
          },
          {
            "name": "priceLamports",
            "type": "u64"
          },
          {
            "name": "execFeeLamports",
            "type": "u64"
          },
          {
            "name": "returnedLamports",
            "type": "u64"
          },
          {
            "name": "boughtAt",
            "type": "i64"
          },
          {
            "name": "sharesIssuedAt",
            "type": "i64"
          },
          {
            "name": "custodyRentPayer",
            "type": "pubkey"
          },
          {
            "name": "settleFeeBps",
            "type": "u16"
          },
          {
            "name": "fundedAt",
            "type": "i64"
          },
          {
            "name": "finalClaims",
            "type": "u32"
          },
          {
            "name": "vaultRent",
            "type": "u64"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "posseClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "dustToFeeWallet",
            "type": "u64"
          },
          {
            "name": "rentToOrganizer",
            "type": "u64"
          },
          {
            "name": "at",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "posseCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "organizer",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "target",
            "type": "u64"
          },
          {
            "name": "maxPrice",
            "type": "u64"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "closesAt",
            "type": "i64"
          },
          {
            "name": "exitKind",
            "type": "u8"
          },
          {
            "name": "exitDay",
            "type": "u16"
          },
          {
            "name": "exitPrice",
            "type": "u64"
          },
          {
            "name": "exitHours",
            "type": "u16"
          },
          {
            "name": "royaltyBps",
            "type": "u16"
          },
          {
            "name": "royaltyRecipient",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "proceedsClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "contributor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "purchased",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "fee",
            "type": "u64"
          },
          {
            "name": "returned",
            "type": "u64"
          },
          {
            "name": "at",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "refundClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "contributor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "returnedClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "contributor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "settled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "sale",
            "type": "u64"
          },
          {
            "name": "royalty",
            "type": "u64"
          },
          {
            "name": "fee",
            "type": "u64"
          },
          {
            "name": "net",
            "type": "u64"
          },
          {
            "name": "at",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "sharesIssued",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "at",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "updateConfigArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feeWallet",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "executionFeeBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "settlementFeeBps",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "admin",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "paused",
            "type": {
              "option": "bool"
            }
          }
        ]
      }
    },
    {
      "name": "withdrew",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "posse",
            "type": "pubkey"
          },
          {
            "name": "contributor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "newRaised",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
