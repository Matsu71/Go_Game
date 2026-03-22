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
  "defaultNote": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
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
        "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。1手で白を取ってください。",
      "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
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
        "isUniqueFirstMove": true
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
        "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。1手で白を取ってください。",
      "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
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
        "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。1手で白を取ってください。",
      "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
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
        "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。1手で白を取ってください。",
      "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
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
        "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。1手で白を取ってください。",
      "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
      "hint": null,
      "explanation": null
    },
    {
      "id": "problem-6",
      "title": "第6問",
      "subtitle": "中に打って曲がった白の連を取る問題です。",
      "boardSize": 6,
      "rows": [
        "..B...",
        ".BWB..",
        "BW.WB.",
        ".BWWB.",
        "..BB..",
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
              ],
              [
                3,
                3
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
        ],
        [
          3,
          3
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
        "subtitle": "中に打って曲がった白の連を取る問題です。",
        "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。1手で白を取ってください。",
      "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
      "hint": null,
      "explanation": null
    },
    {
      "id": "problem-7",
      "title": "第7問",
      "subtitle": "中に打って白の輪を一気に取る問題です。",
      "boardSize": 6,
      "rows": [
        ".BBB..",
        "BWWWB.",
        "BW.WB.",
        "BWWWB.",
        ".BBB..",
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
                1
              ],
              [
                1,
                2
              ],
              [
                1,
                3
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
                1
              ],
              [
                3,
                2
              ],
              [
                3,
                3
              ]
            ]
          }
        ]
      },
      "targetStones": [
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
          3
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
          1
        ],
        [
          3,
          2
        ],
        [
          3,
          3
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
          "ring"
        ],
        "source": "legacy-browser-app",
        "author": null,
        "createdAt": null,
        "updatedAt": "2026-03-21"
      },
      "ui": {
        "prompt": "黒番です。1手で白を取ってください。",
        "subtitle": "中に打って白の輪を一気に取る問題です。",
        "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。1手で白を取ってください。",
      "note": "第1問から第10問まで入れています。\n詰碁はすべて6路盤で作る予定です。\n最初の1手で正解・不正解を判定し、その後も続きを確認できます。",
      "hint": null,
      "explanation": null
    },
    {
      "id": "problem-8",
      "title": "第8問",
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
        "note": "第8問は左上の端で最小6石の2眼を作る黒生き問題です。\n白石は必要最小限だけ置いています。\n外すと0.5秒後に白が1手ずつ自動で応手します。",
        "hint": null,
        "explanation": null
      },
      "prompt": "黒番です。白に包まれた黒で最小6石の2眼を作ってください。",
      "note": "第8問は左上の端で最小6石の2眼を作る黒生き問題です。\n白石は必要最小限だけ置いています。\n外すと0.5秒後に白が1手ずつ自動で応手します。",
      "hint": null,
      "explanation": null
    },
    {
      "id": "problem-9",
      "title": "第9問",
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
        "isUniqueFirstMove": true
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
        "verifiedAt": "2026-03-21",
        "solverVersion": "legacy-browser-app-guided-line"
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
        "updatedAt": "2026-03-21"
      },
      "ui": {
        "prompt": "黒番です。3手で黒を2眼で生かしてください。",
        "subtitle": "中央の急所に打ち、白の応手後に2眼を完成させる問題です。",
        "note": "第9問は黒先黒生きの3手詰めです。\n正しい初手のあと、0.5秒後に白の応手が自動で進みます。\n最後の黒番で2眼を完成させてください。",
        "hint": "まず中央の急所に打って、白に上か下のどちらかを埋めさせます。",
        "explanation": "中央を押さえると白は上か下の眼形を1つしか埋められません。残った方を黒が打てば2眼です。"
      },
      "prompt": "黒番です。3手で黒を2眼で生かしてください。",
      "note": "第9問は黒先黒生きの3手詰めです。\n正しい初手のあと、0.5秒後に白の応手が自動で進みます。\n最後の黒番で2眼を完成させてください。",
      "hint": "まず中央の急所に打って、白に上か下のどちらかを埋めさせます。",
      "explanation": "中央を押さえると白は上か下の眼形を1つしか埋められません。残った方を黒が打てば2眼です。"
    },
    {
      "id": "problem-10",
      "title": "第10問",
      "subtitle": "上辺の白1子を3手で仕留める問題です。",
      "boardSize": 6,
      "rows": [
        "......",
        ".WB...",
        "BB....",
        "......",
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
                1,
                1
              ]
            ]
          }
        ]
      },
      "targetStones": [
        [
          1,
          1
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
              0,
              0
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
        "shortestWinLength": 3,
        "nodeCount": null,
        "bestDefenseLine": [
          {
            "player": "white",
            "move": [
              1,
              0
            ]
          }
        ],
        "verifiedAt": "2026-03-21",
        "solverVersion": "legacy-browser-app-guided-line"
      },
      "metadata": {
        "difficulty": "medium",
        "tags": [
          "6x6",
          "kill",
          "three-move",
          "edge"
        ],
        "source": "codex-generated",
        "author": null,
        "createdAt": "2026-03-21",
        "updatedAt": "2026-03-21"
      },
      "ui": {
        "prompt": "黒番です。3手で白を殺してください。",
        "subtitle": "上辺の白1子を3手で仕留める問題です。",
        "note": "第10問は黒先白死の3手詰めです。\n正しい1手のあと、0.5秒後に白が最強に応じます。\nそのあと黒のトドメを打ってください。",
        "hint": "先に上からアタリにして、白の逃げ道を1つだけ残します。",
        "explanation": "上から迫ると白は左に伸びるしかなく、最後に左上をふさいで仕留められます。"
      },
      "prompt": "黒番です。3手で白を殺してください。",
      "note": "第10問は黒先白死の3手詰めです。\n正しい1手のあと、0.5秒後に白が最強に応じます。\nそのあと黒のトドメを打ってください。",
      "hint": "先に上からアタリにして、白の逃げ道を1つだけ残します。",
      "explanation": "上から迫ると白は左に伸びるしかなく、最後に左上をふさいで仕留められます。"
    }
  ]
};
})(typeof globalThis !== "undefined" ? globalThis : this);
