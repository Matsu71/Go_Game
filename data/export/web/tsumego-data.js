(function attachTsumegoData(globalScope) {
  globalScope.GO_APP_TSUMEGO_DATA = {
  "schemaVersion": 1,
  "dataset": {
    "id": "go-mini-app-tsumego",
    "name": "Go Mini App Tsumego",
    "canonicalSource": "data/canonical/tsumego-canonical.json",
    "coordinateSystem": {
      "pointFormat": "[row, col]",
      "origin": "top-left",
      "indexBase": 0
    }
  },
  "boardSize": 6,
  "boardSizes": [
    6
  ],
  "defaultPrompt": "黒番です。1手で白を取ってください。",
  "defaultNote": "第1問から第11問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
  "problems": [
    {
      "id": "problem-1",
      "title": "第1問",
      "subtitle": "6路盤の1手詰めです。",
      "boardSize": 6,
      "rows": [
        "......",
        "..B...",
        ".BW...",
        "..B...",
        "......",
        "......"
      ],
      "turn": "black",
      "goalType": "capture",
      "target": {
        "type": "groups",
        "color": "white",
        "groups": [
          {
            "id": "main",
            "stones": [
              [
                2,
                2
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          2,
          2
        ]
      ],
      "constraints": {
        "koRule": "simple-ko",
        "allowSuicide": false,
        "allowPass": false,
        "maxDepth": 1
      },
      "solutions": {
        "winningFirstMoves": [
          {
            "move": [
              2,
              3
            ],
            "label": "main",
            "isPrimary": true
          }
        ],
        "principalVariation": [
          {
            "player": "black",
            "move": [
              2,
              3
            ]
          }
        ],
        "alternativeLines": [],
        "isUniqueFirstMove": true
      },
      "solution": [
        2,
        3
      ],
      "verification": {
        "status": "not-strictly-verified",
        "shortestWinLength": 1,
        "nodeCount": null,
        "bestDefenseLine": [],
        "verifiedAt": "2026-03-21",
        "solverVersion": "legacy-browser-app-compat"
      },
      "metadata": {
        "difficulty": "easy",
        "tags": [
          "6x6",
          "capture",
          "one-move",
          "center"
        ],
        "source": "legacy-browser-app",
        "author": null,
        "createdAt": null,
        "updatedAt": "2026-03-21"
      },
      "ui": {
        "prompt": "黒番です。1手で白を取ってください。",
        "subtitle": "6路盤の1手詰めです。",
        "note": "第1問から第11問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。1手で白を取ってください。",
      "note": "第1問から第11問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
      "hint": null,
      "explanation": null
    },
    {
      "id": "problem-2",
      "title": "第2問",
      "subtitle": "端の2子を1手で取る問題です。",
      "boardSize": 6,
      "rows": [
        "......",
        "B.....",
        "WB....",
        "W.....",
        "B.....",
        "......"
      ],
      "turn": "black",
      "goalType": "capture",
      "target": {
        "type": "groups",
        "color": "white",
        "groups": [
          {
            "id": "main",
            "stones": [
              [
                2,
                0
              ],
              [
                3,
                0
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          2,
          0
        ],
        [
          3,
          0
        ]
      ],
      "constraints": {
        "koRule": "simple-ko",
        "allowSuicide": false,
        "allowPass": false,
        "maxDepth": 1
      },
      "solutions": {
        "winningFirstMoves": [
          {
            "move": [
              3,
              1
            ],
            "label": "main",
            "isPrimary": true
          }
        ],
        "principalVariation": [
          {
            "player": "black",
            "move": [
              3,
              1
            ]
          }
        ],
        "alternativeLines": [],
        "isUniqueFirstMove": true,
        "wrongFirstMoveDefense": {
          "move": [
            2,
            2
          ]
        }
      },
      "solution": [
        3,
        1
      ],
      "verification": {
        "status": "not-strictly-verified",
        "shortestWinLength": 1,
        "nodeCount": null,
        "bestDefenseLine": [],
        "verifiedAt": "2026-03-21",
        "solverVersion": "legacy-browser-app-compat"
      },
      "metadata": {
        "difficulty": "easy",
        "tags": [
          "6x6",
          "capture",
          "one-move",
          "edge"
        ],
        "source": "legacy-browser-app",
        "author": null,
        "createdAt": null,
        "updatedAt": "2026-03-21"
      },
      "ui": {
        "prompt": "黒番です。1手で白を取ってください。",
        "subtitle": "端の2子を1手で取る問題です。",
        "note": "第1問から第11問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。1手で白を取ってください。",
      "note": "第1問から第11問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
      "hint": null,
      "explanation": null
    },
    {
      "id": "problem-3",
      "title": "第3問",
      "subtitle": "曲がった白の連を仕留める問題です。",
      "boardSize": 6,
      "rows": [
        "......",
        "..BB..",
        ".BWWB.",
        ".BW...",
        "..B...",
        "......"
      ],
      "turn": "black",
      "goalType": "capture",
      "target": {
        "type": "groups",
        "color": "white",
        "groups": [
          {
            "id": "main",
            "stones": [
              [
                2,
                2
              ],
              [
                2,
                3
              ],
              [
                3,
                2
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          2,
          2
        ],
        [
          2,
          3
        ],
        [
          3,
          2
        ]
      ],
      "constraints": {
        "koRule": "simple-ko",
        "allowSuicide": false,
        "allowPass": false,
        "maxDepth": 1
      },
      "solutions": {
        "winningFirstMoves": [
          {
            "move": [
              3,
              3
            ],
            "label": "main",
            "isPrimary": true
          }
        ],
        "principalVariation": [
          {
            "player": "black",
            "move": [
              3,
              3
            ]
          }
        ],
        "alternativeLines": [],
        "isUniqueFirstMove": true
      },
      "solution": [
        3,
        3
      ],
      "verification": {
        "status": "not-strictly-verified",
        "shortestWinLength": 1,
        "nodeCount": null,
        "bestDefenseLine": [],
        "verifiedAt": "2026-03-21",
        "solverVersion": "legacy-browser-app-compat"
      },
      "metadata": {
        "difficulty": "easy",
        "tags": [
          "6x6",
          "capture",
          "one-move",
          "curve"
        ],
        "source": "legacy-browser-app",
        "author": null,
        "createdAt": null,
        "updatedAt": "2026-03-21"
      },
      "ui": {
        "prompt": "黒番です。1手で白を取ってください。",
        "subtitle": "曲がった白の連を仕留める問題です。",
        "note": "第1問から第11問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。1手で白を取ってください。",
      "note": "第1問から第11問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
      "hint": null,
      "explanation": null
    },
    {
      "id": "problem-4",
      "title": "第4問",
      "subtitle": "隅の白を1手で取る問題です。",
      "boardSize": 6,
      "rows": [
        "WB....",
        "......",
        "......",
        "......",
        "......",
        "......"
      ],
      "turn": "black",
      "goalType": "capture",
      "target": {
        "type": "groups",
        "color": "white",
        "groups": [
          {
            "id": "main",
            "stones": [
              [
                0,
                0
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          0,
          0
        ]
      ],
      "constraints": {
        "koRule": "simple-ko",
        "allowSuicide": false,
        "allowPass": false,
        "maxDepth": 1
      },
      "solutions": {
        "winningFirstMoves": [
          {
            "move": [
              1,
              0
            ],
            "label": "main",
            "isPrimary": true
          }
        ],
        "principalVariation": [
          {
            "player": "black",
            "move": [
              1,
              0
            ]
          }
        ],
        "alternativeLines": [],
        "isUniqueFirstMove": true
      },
      "solution": [
        1,
        0
      ],
      "verification": {
        "status": "not-strictly-verified",
        "shortestWinLength": 1,
        "nodeCount": null,
        "bestDefenseLine": [],
        "verifiedAt": "2026-03-21",
        "solverVersion": "legacy-browser-app-compat"
      },
      "metadata": {
        "difficulty": "easy",
        "tags": [
          "6x6",
          "capture",
          "one-move",
          "corner"
        ],
        "source": "legacy-browser-app",
        "author": null,
        "createdAt": null,
        "updatedAt": "2026-03-21"
      },
      "ui": {
        "prompt": "黒番です。1手で白を取ってください。",
        "subtitle": "隅の白を1手で取る問題です。",
        "note": "第1問から第11問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。1手で白を取ってください。",
      "note": "第1問から第11問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
      "hint": null,
      "explanation": null
    },
    {
      "id": "problem-5",
      "title": "第5問",
      "subtitle": "中に打って4子を取る問題です。",
      "boardSize": 6,
      "rows": [
        "..B...",
        ".BWB..",
        "BW.WB.",
        ".BWB..",
        "..B...",
        "......"
      ],
      "turn": "black",
      "goalType": "capture",
      "target": {
        "type": "groups",
        "color": "white",
        "groups": [
          {
            "id": "main",
            "stones": [
              [
                1,
                2
              ],
              [
                2,
                1
              ],
              [
                2,
                3
              ],
              [
                3,
                2
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          1,
          2
        ],
        [
          2,
          1
        ],
        [
          2,
          3
        ],
        [
          3,
          2
        ]
      ],
      "constraints": {
        "koRule": "simple-ko",
        "allowSuicide": false,
        "allowPass": false,
        "maxDepth": 1
      },
      "solutions": {
        "winningFirstMoves": [
          {
            "move": [
              2,
              2
            ],
            "label": "main",
            "isPrimary": true
          }
        ],
        "principalVariation": [
          {
            "player": "black",
            "move": [
              2,
              2
            ]
          }
        ],
        "alternativeLines": [],
        "isUniqueFirstMove": true
      },
      "solution": [
        2,
        2
      ],
      "verification": {
        "status": "not-strictly-verified",
        "shortestWinLength": 1,
        "nodeCount": null,
        "bestDefenseLine": [],
        "verifiedAt": "2026-03-21",
        "solverVersion": "legacy-browser-app-compat"
      },
      "metadata": {
        "difficulty": "medium",
        "tags": [
          "6x6",
          "capture",
          "one-move",
          "inside-move"
        ],
        "source": "legacy-browser-app",
        "author": null,
        "createdAt": null,
        "updatedAt": "2026-03-21"
      },
      "ui": {
        "prompt": "黒番です。1手で白を取ってください。",
        "subtitle": "中に打って4子を取る問題です。",
        "note": "第1問から第11問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。1手で白を取ってください。",
      "note": "第1問から第11問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
      "hint": null,
      "explanation": null
    },
    {
      "id": "problem-6",
      "title": "第6問",
      "subtitle": "上辺の大きな白一眼を1手でつぶす問題です。",
      "boardSize": 6,
      "rows": [
        "WWWWWW",
        "WWW.WW",
        "WWWWWW",
        "BBBBBB",
        "......",
        "......"
      ],
      "turn": "black",
      "goalType": "kill",
      "target": {
        "type": "groups",
        "color": "white",
        "groups": [
          {
            "id": "main",
            "stones": [
              [
                0,
                0
              ],
              [
                0,
                1
              ],
              [
                0,
                2
              ],
              [
                0,
                3
              ],
              [
                0,
                4
              ],
              [
                0,
                5
              ],
              [
                1,
                0
              ],
              [
                1,
                1
              ],
              [
                1,
                2
              ],
              [
                1,
                4
              ],
              [
                1,
                5
              ],
              [
                2,
                0
              ],
              [
                2,
                1
              ],
              [
                2,
                2
              ],
              [
                2,
                3
              ],
              [
                2,
                4
              ],
              [
                2,
                5
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          0,
          0
        ],
        [
          0,
          1
        ],
        [
          0,
          2
        ],
        [
          0,
          3
        ],
        [
          0,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          0
        ],
        [
          1,
          1
        ],
        [
          1,
          2
        ],
        [
          1,
          4
        ],
        [
          1,
          5
        ],
        [
          2,
          0
        ],
        [
          2,
          1
        ],
        [
          2,
          2
        ],
        [
          2,
          3
        ],
        [
          2,
          4
        ],
        [
          2,
          5
        ]
      ],
      "constraints": {
        "koRule": "simple-ko",
        "allowSuicide": false,
        "allowPass": false,
        "maxDepth": 1
      },
      "solutions": {
        "winningFirstMoves": [
          {
            "move": [
              1,
              3
            ],
            "label": "main",
            "isPrimary": true
          }
        ],
        "principalVariation": [
          {
            "player": "black",
            "move": [
              1,
              3
            ]
          }
        ],
        "alternativeLines": [],
        "isUniqueFirstMove": true
      },
      "solution": [
        1,
        3
      ],
      "verification": {
        "status": "not-strictly-verified",
        "shortestWinLength": 1,
        "nodeCount": null,
        "bestDefenseLine": [],
        "verifiedAt": "2026-03-22",
        "solverVersion": "legacy-browser-app-compat"
      },
      "metadata": {
        "difficulty": "easy",
        "tags": [
          "6x6",
          "kill",
          "one-move",
          "top-edge",
          "fill-the-eye"
        ],
        "source": "user-specified-start-position",
        "author": "Codex",
        "createdAt": "2026-03-22",
        "updatedAt": "2026-03-22"
      },
      "ui": {
        "prompt": "黒番です。1手で白を殺してください。",
        "subtitle": "上辺の大きな白一眼を1手でつぶす問題です。",
        "note": "第6問は黒先白死の1手詰めです。\n白全体の唯一の呼吸点を埋めてください。",
        "hint": "白の大きな1眼の中にそのまま打ちます。",
        "explanation": "上辺の白はすべて1つの連です。中央の1点だけが最後の呼吸点なので、黒がそこを埋めれば白全体が取れます。"
      },
      "prompt": "黒番です。1手で白を殺してください。",
      "note": "第6問は黒先白死の1手詰めです。\n白全体の唯一の呼吸点を埋めてください。",
      "hint": "白の大きな1眼の中にそのまま打ちます。",
      "explanation": "上辺の白はすべて1つの連です。中央の1点だけが最後の呼吸点なので、黒がそこを埋めれば白全体が取れます。"
    },
    {
      "id": "problem-7",
      "title": "第7問",
      "subtitle": "2つに分かれた白の弱点を共通の急所でしめる問題です。",
      "boardSize": 6,
      "rows": [
        ".WWB..",
        "W.WB..",
        "W.BB..",
        "BBB...",
        "B.....",
        "B....."
      ],
      "turn": "black",
      "goalType": "kill",
      "target": {
        "type": "groups",
        "color": "white",
        "groups": [
          {
            "id": "upper",
            "stones": [
              [
                0,
                1
              ],
              [
                0,
                2
              ],
              [
                1,
                2
              ]
            ]
          },
          {
            "id": "left",
            "stones": [
              [
                1,
                0
              ],
              [
                2,
                0
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          0,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ]
      ],
      "constraints": {
        "koRule": "simple-ko",
        "allowSuicide": false,
        "allowPass": false,
        "maxDepth": 1
      },
      "solutions": {
        "winningFirstMoves": [
          {
            "move": [
              2,
              1
            ],
            "label": "main",
            "isPrimary": true
          }
        ],
        "successCondition": "prevent-white-two-eyes",
        "isUniqueFirstMove": true,
        "wrongFirstMoveDefense": {
          "move": [
            2,
            1
          ]
        }
      },
      "solution": [
        2,
        1
      ],
      "verification": {
        "status": "not-strictly-verified",
        "shortestWinLength": 1,
        "nodeCount": null,
        "bestDefenseLine": [],
        "verifiedAt": "2026-04-11",
        "solverVersion": "legacy-browser-app-prevent-white-two-eyes"
      },
      "metadata": {
        "difficulty": "hard",
        "tags": [
          "6x6",
          "kill",
          "one-move",
          "shared-vital-point",
          "left-edge"
        ],
        "source": "user-specified-start-position",
        "author": "Codex",
        "createdAt": "2026-03-22",
        "updatedAt": "2026-04-11"
      },
      "ui": {
        "prompt": "黒番です。1手で白の2眼をつぶしてください。",
        "subtitle": "2つに分かれた白の弱点を共通の急所でしめる問題です。",
        "note": "第7問は黒先白死の1手詰めです。\n正解は2-3です。\nこの1手で白は2眼を作れなくなります。",
        "hint": "2つの白グループが共有している急所を見ます。",
        "explanation": "2-3は両方の白グループに効く共通の急所です。黒が先に打つと白は2眼を作れません。白の死が確定するので、この時点で正解です。"
      },
      "prompt": "黒番です。1手で白の2眼をつぶしてください。",
      "note": "第7問は黒先白死の1手詰めです。\n正解は2-3です。\nこの1手で白は2眼を作れなくなります。",
      "hint": "2つの白グループが共有している急所を見ます。",
      "explanation": "2-3は両方の白グループに効く共通の急所です。黒が先に打つと白は2眼を作れません。白の死が確定するので、この時点で正解です。"
    },
    {
      "id": "problem-8",
      "title": "第8問",
      "subtitle": "上辺の大きな白一眼を中央からつぶす問題です。",
      "boardSize": 6,
      "rows": [
        "WWWWWW",
        "WW...W",
        "WWWWWW",
        "BBBBBB",
        "......",
        "......"
      ],
      "turn": "black",
      "goalType": "kill",
      "target": {
        "type": "groups",
        "color": "white",
        "groups": [
          {
            "id": "main",
            "stones": [
              [
                0,
                0
              ],
              [
                0,
                1
              ],
              [
                0,
                2
              ],
              [
                0,
                3
              ],
              [
                0,
                4
              ],
              [
                0,
                5
              ],
              [
                1,
                0
              ],
              [
                1,
                1
              ],
              [
                1,
                5
              ],
              [
                2,
                0
              ],
              [
                2,
                1
              ],
              [
                2,
                2
              ],
              [
                2,
                3
              ],
              [
                2,
                4
              ],
              [
                2,
                5
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          0,
          0
        ],
        [
          0,
          1
        ],
        [
          0,
          2
        ],
        [
          0,
          3
        ],
        [
          0,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          0
        ],
        [
          1,
          1
        ],
        [
          1,
          5
        ],
        [
          2,
          0
        ],
        [
          2,
          1
        ],
        [
          2,
          2
        ],
        [
          2,
          3
        ],
        [
          2,
          4
        ],
        [
          2,
          5
        ]
      ],
      "constraints": {
        "koRule": "simple-ko",
        "allowSuicide": false,
        "allowPass": false,
        "maxDepth": 1
      },
      "solutions": {
        "winningFirstMoves": [
          {
            "move": [
              1,
              3
            ],
            "label": "main",
            "isPrimary": true
          }
        ],
        "successCondition": "prevent-white-two-eyes",
        "isUniqueFirstMove": true,
        "wrongFirstMoveDefense": {
          "move": [
            1,
            3
          ],
          "outcome": "white-live",
          "shape": "two-eyes"
        }
      },
      "solution": [
        1,
        3
      ],
      "verification": {
        "status": "not-strictly-verified",
        "shortestWinLength": 1,
        "nodeCount": null,
        "bestDefenseLine": [],
        "verifiedAt": "2026-04-11",
        "solverVersion": "legacy-browser-app-prevent-white-two-eyes"
      },
      "metadata": {
        "difficulty": "hard",
        "tags": [
          "6x6",
          "kill",
          "one-move",
          "top-edge",
          "straight-three-eye"
        ],
        "source": "user-specified-start-position",
        "author": "Codex",
        "createdAt": "2026-03-22",
        "updatedAt": "2026-04-11"
      },
      "ui": {
        "prompt": "黒番です。1手で白の2眼をつぶしてください。",
        "subtitle": "上辺の大きな白一眼を中央からつぶす問題です。",
        "note": "第8問は黒先白死の1手詰めです。\n4-2が正解です。\nこの1手で白は2眼を作れなくなります。",
        "hint": "3つ並んだ空点の真ん中、4-2が急所です。",
        "explanation": "4-2に打つと白の2眼の形が崩れます。白は左右の空点を同時に眼にできないので、白の死が確定し、この時点で正解です。"
      },
      "prompt": "黒番です。1手で白の2眼をつぶしてください。",
      "note": "第8問は黒先白死の1手詰めです。\n4-2が正解です。\nこの1手で白は2眼を作れなくなります。",
      "hint": "3つ並んだ空点の真ん中、4-2が急所です。",
      "explanation": "4-2に打つと白の2眼の形が崩れます。白は左右の空点を同時に眼にできないので、白の死が確定し、この時点で正解です。"
    },
    {
      "id": "problem-9",
      "title": "第9問",
      "subtitle": "左上の端で最小6石の2眼を作る問題です。",
      "boardSize": 6,
      "rows": [
        "..W...",
        "BBW...",
        ".BW...",
        "BBW...",
        "WWW...",
        "......"
      ],
      "turn": "black",
      "goalType": "live",
      "target": {
        "type": "groups",
        "color": "black",
        "groups": [
          {
            "id": "main",
            "stones": [
              [
                1,
                0
              ],
              [
                1,
                1
              ],
              [
                2,
                1
              ],
              [
                3,
                0
              ],
              [
                3,
                1
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          1,
          0
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          0
        ],
        [
          3,
          1
        ]
      ],
      "constraints": {
        "koRule": "simple-ko",
        "allowSuicide": false,
        "allowPass": false,
        "maxDepth": 1
      },
      "solutions": {
        "winningFirstMoves": [
          {
            "move": [
              0,
              1
            ],
            "label": "main",
            "isPrimary": true
          }
        ],
        "principalVariation": [
          {
            "player": "black",
            "move": [
              0,
              1
            ]
          }
        ],
        "alternativeLines": [],
        "isUniqueFirstMove": true
      },
      "solution": [
        0,
        1
      ],
      "verification": {
        "status": "not-strictly-verified",
        "shortestWinLength": 1,
        "nodeCount": null,
        "bestDefenseLine": [],
        "verifiedAt": "2026-03-21",
        "solverVersion": "legacy-browser-app-compat"
      },
      "metadata": {
        "difficulty": "hard",
        "tags": [
          "6x6",
          "live",
          "one-move",
          "two-eyes",
          "edge"
        ],
        "source": "legacy-browser-app",
        "author": null,
        "createdAt": null,
        "updatedAt": "2026-03-21"
      },
      "ui": {
        "prompt": "黒番です。白に包まれた黒で最小6石の2眼を作ってください。",
        "subtitle": "左上の端で最小6石の2眼を作る問題です。",
        "note": "第9問は左上の端で最小6石の2眼を作る黒生き問題です。\n白石は必要最小限だけ置いています。\n外すと0.5秒後に白が1手ずつ自動で応手します。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。白に包まれた黒で最小6石の2眼を作ってください。",
      "note": "第9問は左上の端で最小6石の2眼を作る黒生き問題です。\n白石は必要最小限だけ置いています。\n外すと0.5秒後に白が1手ずつ自動で応手します。",
      "hint": null,
      "explanation": null
    },
    {
      "id": "problem-10",
      "title": "第10問",
      "subtitle": "中央の急所に打ち、白の応手後に2眼を完成させる問題です。",
      "boardSize": 6,
      "rows": [
        ".B.W..",
        "BB.W..",
        "B..W..",
        "BB.W..",
        "WWWW..",
        "......"
      ],
      "turn": "black",
      "goalType": "live",
      "target": {
        "type": "groups",
        "color": "black",
        "groups": [
          {
            "id": "main",
            "stones": [
              [
                0,
                1
              ],
              [
                1,
                0
              ],
              [
                1,
                1
              ],
              [
                2,
                0
              ],
              [
                3,
                0
              ],
              [
                3,
                1
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          0,
          1
        ],
        [
          1,
          0
        ],
        [
          1,
          1
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          3,
          1
        ]
      ],
      "constraints": {
        "koRule": "simple-ko",
        "allowSuicide": false,
        "allowPass": false,
        "maxDepth": 1
      },
      "solutions": {
        "winningFirstMoves": [
          {
            "move": [
              2,
              2
            ],
            "label": "main",
            "isPrimary": true
          }
        ],
        "principalVariation": [
          {
            "player": "black",
            "move": [
              2,
              2
            ]
          },
          {
            "player": "white",
            "move": [
              1,
              2
            ]
          },
          {
            "player": "black",
            "move": [
              3,
              2
            ]
          }
        ],
        "alternativeLines": [],
        "isUniqueFirstMove": true,
        "wrongGuidedMoveDefenses": [
          {
            "lineProgress": 2,
            "move": [
              3,
              2
            ],
            "label": "attack-first-black-stone"
          }
        ],
        "wrongFirstMoveDefense": {
          "move": [
            2,
            2
          ]
        }
      },
      "solution": [
        2,
        2
      ],
      "verification": {
        "status": "not-strictly-verified",
        "shortestWinLength": 3,
        "nodeCount": null,
        "bestDefenseLine": [
          {
            "player": "white",
            "move": [
              1,
              2
            ]
          }
        ],
        "verifiedAt": "2026-04-11",
        "solverVersion": "legacy-browser-app-guided-line-wrong-defense"
      },
      "metadata": {
        "difficulty": "hard",
        "tags": [
          "6x6",
          "live",
          "three-move",
          "two-eyes",
          "corner"
        ],
        "source": "codex-generated",
        "author": "Codex",
        "createdAt": "2026-03-21",
        "updatedAt": "2026-04-11"
      },
      "ui": {
        "prompt": "黒番です。3手で黒を2眼で生かしてください。",
        "subtitle": "中央の急所に打ち、白の応手後に2眼を完成させる問題です。",
        "note": "第10問は黒先黒生きの3手詰めです。\n正しい初手のあと、0.5秒後に白の応手が自動で進みます。\n最後の黒番で2眼を完成させてください。",
        "hint": "まず中央の急所に打って、白に上か下のどちらかを埋めさせます。",
        "explanation": "中央を押さえると白は上か下の眼形を1つしか埋められません。残った方を黒が打てば2眼です。"
      },
      "prompt": "黒番です。3手で黒を2眼で生かしてください。",
      "note": "第10問は黒先黒生きの3手詰めです。\n正しい初手のあと、0.5秒後に白の応手が自動で進みます。\n最後の黒番で2眼を完成させてください。",
      "hint": "まず中央の急所に打って、白に上か下のどちらかを埋めさせます。",
      "explanation": "中央を押さえると白は上か下の眼形を1つしか埋められません。残った方を黒が打てば2眼です。"
    },
    {
      "id": "problem-11",
      "title": "第11問",
      "subtitle": "角の急所を打つ5手詰め",
      "boardSize": 6,
      "rows": [
        "..WWBB",
        "...WBB",
        "WWWWBB",
        "BBBBBB",
        "......",
        "......"
      ],
      "turn": "black",
      "goalType": "kill",
      "target": {
        "type": "groups",
        "color": "white",
        "groups": [
          {
            "id": "main",
            "stones": [
              [
                0,
                2
              ],
              [
                0,
                3
              ],
              [
                1,
                3
              ],
              [
                2,
                0
              ],
              [
                2,
                1
              ],
              [
                2,
                2
              ],
              [
                2,
                3
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          0,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          0
        ],
        [
          2,
          1
        ],
        [
          2,
          2
        ],
        [
          2,
          3
        ]
      ],
      "constraints": {
        "koRule": "simple-ko",
        "allowSuicide": false,
        "allowPass": false,
        "maxDepth": 5
      },
      "solutions": {
        "winningFirstMoves": [
          {
            "move": [
              1,
              1
            ],
            "label": "main",
            "isPrimary": true
          }
        ],
        "principalVariation": [
          {
            "player": "black",
            "move": [
              1,
              1
            ]
          },
          {
            "player": "white",
            "move": [
              0,
              0
            ]
          },
          {
            "player": "black",
            "move": [
              0,
              1
            ]
          },
          {
            "player": "white",
            "move": [
              1,
              0
            ]
          },
          {
            "player": "black",
            "move": [
              1,
              2
            ]
          }
        ],
        "alternativeLines": [],
        "isUniqueFirstMove": true
      },
      "solution": [
        1,
        1
      ],
      "verification": {
        "status": "not-strictly-verified",
        "shortestWinLength": 5,
        "nodeCount": null,
        "bestDefenseLine": [
          {
            "player": "white",
            "move": [
              0,
              0
            ]
          },
          {
            "player": "white",
            "move": [
              1,
              0
            ]
          }
        ],
        "expectedFinalRows": [
          ".B..BB",
          ".BB.BB",
          "....BB",
          "BBBBBB",
          "......",
          "......"
        ],
        "verifiedAt": "2026-04-17",
        "solverVersion": "legacy-browser-app-guided-line"
      },
      "metadata": {
        "difficulty": "hard",
        "tags": [
          "6x6",
          "kill",
          "five-move",
          "corner-vital-point",
          "liberty-squeeze"
        ],
        "source": "public-pattern-inspired-6x6-reduction",
        "author": "Codex",
        "createdAt": "2026-04-17",
        "updatedAt": "2026-04-17"
      },
      "ui": {
        "prompt": "黒番です。白を殺してください。",
        "subtitle": "角の急所を打つ5手詰め",
        "note": "左上の白1群が対象です。局所で読めます。",
        "hint": "最初は白の息の中心点に注目してください。",
        "explanation": "2行2列が急所です。ここに打つと白の息が中央から圧縮され、白がどこに粘っても黒が呼吸点を順に消して取り切れます。"
      },
      "prompt": "黒番です。白を殺してください。",
      "note": "左上の白1群が対象です。局所で読めます。",
      "hint": "最初は白の息の中心点に注目してください。",
      "explanation": "2行2列が急所です。ここに打つと白の息が中央から圧縮され、白がどこに粘っても黒が呼吸点を順に消して取り切れます。"
    },
    {
      "id": "problem-12",
      "title": "第12問",
      "subtitle": "隅の板六を6×6に縮約した局所死活です。",
      "boardSize": 6,
      "rows": [
        "...WB.",
        "...WB.",
        "WWWWBB",
        "BBBBB.",
        "B.....",
        "......"
      ],
      "turn": "black",
      "goalType": "kill",
      "target": {
        "type": "groups",
        "color": "white",
        "groups": [
          {
            "id": "main",
            "stones": [
              [
                0,
                3
              ],
              [
                1,
                3
              ],
              [
                2,
                0
              ],
              [
                2,
                1
              ],
              [
                2,
                2
              ],
              [
                2,
                3
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          0
        ],
        [
          2,
          1
        ],
        [
          2,
          2
        ],
        [
          2,
          3
        ]
      ],
      "constraints": {
        "koRule": "simple-ko",
        "allowSuicide": false,
        "allowPass": false,
        "maxDepth": 3
      },
      "solutions": {
        "winningFirstMoves": [
          {
            "move": [
              1,
              1
            ],
            "label": "main",
            "isPrimary": true
          }
        ],
        "successCondition": "prevent-target-two-eyes",
        "principalVariation": [
          {
            "player": "black",
            "move": [
              1,
              1
            ]
          },
          {
            "player": "white",
            "move": [
              0,
              1
            ]
          },
          {
            "player": "black",
            "move": [
              1,
              0
            ]
          }
        ],
        "alternativeLines": [],
        "isUniqueFirstMove": true
      },
      "solution": [
        1,
        1
      ],
      "verification": {
        "status": "pattern-and-browser-verified",
        "shortestWinLength": 3,
        "nodeCount": null,
        "bestDefenseLine": [
          {
            "player": "white",
            "move": [
              0,
              1
            ]
          }
        ],
        "finalPosition": {
          "format": "rows",
          "rows": [
            ".W.WB.",
            "BB.WB.",
            "WWWWBB",
            "BBBBB.",
            "B.....",
            "......"
          ]
        },
        "verifiedAt": "2026-04-28",
        "solverVersion": "rectangular-six-corner-color-swapped-guided-line-v1"
      },
      "metadata": {
        "difficulty": "hard",
        "tags": [
          "6x6",
          "kill",
          "black-to-kill",
          "black-to-play",
          "three-move",
          "corner",
          "rectangular-six",
          "no-outside-liberties"
        ],
        "source": "public-rectangular-six-corner-pattern",
        "sourceNote": "公開されている隅の板六の典型形を参考に 6×6 に縮約した問題。White to kill の参考図を色反転し、黒番で白を殺す問題として収録。",
        "author": "Codex",
        "createdAt": "2026-04-17",
        "updatedAt": "2026-04-28"
      },
      "ui": {
        "prompt": "黒番です。白を殺してください。",
        "subtitle": "隅の板六を6×6に縮約した局所死活です。",
        "note": "公開されている典型形を参考にした6×6縮約問題です。",
        "hint": "左上の眼形の急所に注目してください。",
        "explanation": "隅の板六は、外ダメ条件により生死が変わる代表的な形です。この問題では黒が急所に先着し、白の最強応手にも続けて打つことで白を死形に追い込めます。"
      },
      "prompt": "黒番です。白を殺してください。",
      "note": "公開されている典型形を参考にした6×6縮約問題です。",
      "hint": "左上の眼形の急所に注目してください。",
      "explanation": "隅の板六は、外ダメ条件により生死が変わる代表的な形です。この問題では黒が急所に先着し、白の最強応手にも続けて打つことで白を死形に追い込めます。"
    }
  ]
};
})(typeof globalThis !== "undefined" ? globalThis : this);
